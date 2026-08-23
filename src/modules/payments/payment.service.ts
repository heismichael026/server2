import PaymentModel, { IPayment } from './payment.model';
import OrderModel, { IOrder } from '../orders/order.model';
import PaystackService, { PaystackVerifyResponse } from './paystack.service';
import { ApiError } from '../../utils/ApiError';
import mongoose from 'mongoose';
import crypto from 'crypto';

class PaymentService {
  /**
   * Initialize payment for an order.
   * The backend calculates the amount — never trusts the frontend.
   */
  async initializePayment(userId: string, orderId: string): Promise<{
    payment: IPayment;
    authorizationUrl: string;
    reference: string;
    accessCode: string;
  }> {
    if (!mongoose.isValidObjectId(orderId)) throw ApiError.notFound('Order not found');

    // Verify the order belongs to the authenticated user
    const order = await OrderModel.findOne({ _id: orderId, user: userId }).lean() as unknown as IOrder | null;
    if (!order) throw ApiError.notFound('Order not found');

    // If already paid, do not initialize again
    if (order.paymentStatus === 'paid') {
      throw ApiError.badRequest('Order is already paid');
    }

    // Generate a unique reference
    const reference = `ORD-${order.orderNumber}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Create a pending payment record
    const payment = await PaymentModel.create({
      order: new mongoose.Types.ObjectId(orderId),
      user: new mongoose.Types.ObjectId(userId),
      method: 'paystack',
      status: 'pending',
      amount: order.totalAmount, // backend-calculated amount
      reference,
    });

    // Get the user's email
    const UserModel = (await import('../users/user.model')).default;
    const user = await UserModel.findById(userId).lean() as unknown as { email: string } | null;
    if (!user) throw ApiError.notFound('User not found');

    // Initialize Paystack transaction with the backend-calculated amount
    const paystackResponse = await PaystackService.initializeTransaction({
      email: user.email,
      amount: order.totalAmount,
      reference,
      metadata: {
        order_id: String(order._id),
        order_number: order.orderNumber,
        custom_fields: [
          { display_name: 'Order Number', variable_name: 'order_number', value: order.orderNumber },
        ],
      },
    });

    // Save the authorization URL and access code
    const updatedPayment = await PaymentModel.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          authorizationUrl: paystackResponse.data.authorization_url,
          accessCode: paystackResponse.data.access_code,
        },
      },
      { new: true }
    ).lean() as unknown as IPayment | null;

    return {
      payment: updatedPayment!,
      authorizationUrl: paystackResponse.data.authorization_url,
      reference: paystackResponse.data.reference,
      accessCode: paystackResponse.data.access_code,
    };
  }

  /**
   * Verify a payment by reference.
   * Only verified Paystack information can mark a payment as paid.
   */
  async verifyPayment(reference: string): Promise<{ payment: IPayment | null; verified: boolean }> {
    const payment = await PaymentModel.findOne({ reference }).lean() as unknown as IPayment | null;
    if (!payment) throw ApiError.notFound('Payment record not found');

    // If already processed, return current state (idempotent)
    if (payment.status === 'paid') {
      return { payment, verified: true };
    }

    const verification = await PaystackService.verifyTransaction(reference);
    return this.processVerification(payment, verification);
  }

  /**
   * Process a Paystack webhook event.
   * Must be idempotent — duplicate events must not cause duplicate processing.
   */
  async processWebhookEvent(payload: {
    event: string;
    data: {
      reference: string;
      status: string;
      amount: number; // in kobo
      paid_at: string | null;
      id: number;
    };
  }): Promise<{ processed: boolean; payment: IPayment | null }> {
    const reference = payload.data?.reference;
    if (!reference) {
      return { processed: false, payment: null };
    }

    const payment = await PaymentModel.findOne({ reference }).lean() as unknown as IPayment | null;
    if (!payment) {
      return { processed: false, payment: null };
    }

    // Idempotency check — if already paid, don't reprocess
    if (payment.status === 'paid') {
      return { processed: false, payment };
    }

    const order = await OrderModel.findById(payment.order).lean() as unknown as IOrder | null;
    if (!order) {
      return { processed: false, payment };
    }

    // Only process successful charges
    if (payload.event === 'charge.success' && payload.data.status === 'success') {
      return await this.markAsPaid(payment, order, payload.data.amount, payload.data.paid_at);
    }

    if (payload.event === 'charge.failed' && payload.data.status === 'failed') {
      const updated = await PaymentModel.findByIdAndUpdate(
        payment._id,
        {
          $set: { status: 'failed' },
          $push: { processedEventIds: String(payload.data.id) },
        },
        { new: true }
      ).lean() as unknown as IPayment | null;

      await OrderModel.findByIdAndUpdate(order._id, {
        $set: { paymentStatus: 'failed' },
        $push: { timeline: { status: 'payment_failed', timestamp: new Date() } },
      }).lean();

      return { processed: true, payment: updated };
    }

    return { processed: false, payment };
  }

  /**
   * Internal: process a Paystack verification response.
   */
  private async processVerification(
    payment: IPayment,
    verification: PaystackVerifyResponse
  ): Promise<{ payment: IPayment; verified: boolean }> {
    const tx = verification.data;

    // Confirm transaction succeeded
    if (tx.status !== 'success') {
      const updated = await PaymentModel.findByIdAndUpdate(
        payment._id,
        { $set: { status: 'failed' } },
        { new: true }
      ).lean() as unknown as IPayment | null;
      await OrderModel.findByIdAndUpdate(payment.order, {
        $set: { paymentStatus: 'failed' },
        $push: { timeline: { status: 'payment_failed', timestamp: new Date() } },
      }).lean();
      return { payment: updated!, verified: false };
    }

    const order = await OrderModel.findById(payment.order).lean() as unknown as IOrder | null;
    if (!order) throw ApiError.notFound('Order not found');

    // Confirm amount matches our expected order amount (in kobo)
    const expectedAmountKobo = Math.round(order.totalAmount * 100);
    if (tx.amount !== expectedAmountKobo) {
      await PaymentModel.findByIdAndUpdate(payment._id, { $set: { status: 'failed' } }).lean();
      await OrderModel.findByIdAndUpdate(order._id, {
        $set: { paymentStatus: 'failed' },
        $push: { timeline: { status: 'amount_mismatch', timestamp: new Date() } },
      }).lean();
      throw ApiError.badRequest('Payment amount does not match order amount');
    }

    const result = await this.markAsPaid(payment, order, tx.amount, tx.paid_at);
    return { payment: result.payment!, verified: true };
  }

  /**
   * Mark a payment as paid. Used by both verification and webhook flows.
   * Atomically updates only if the payment is not already paid (idempotent).
   */
  private async markAsPaid(
    payment: IPayment,
    order: IOrder,
    expectedAmountKobo: number,
    paidAt: string | null
  ): Promise<{ processed: boolean; payment: IPayment | null }> {
    // Double-check amount matches
    const expectedKobo = Math.round(order.totalAmount * 100);
    if (expectedAmountKobo !== expectedKobo) {
      return { processed: false, payment };
    }

    // Atomically update only if not already paid
    const updatedPayment = await PaymentModel.findOneAndUpdate(
      { _id: payment._id, status: { $ne: 'paid' } },
      {
        $set: {
          status: 'paid',
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        },
      },
      { new: true }
    ).lean() as unknown as IPayment | null;

    if (!updatedPayment) {
      // Already paid by a concurrent process
      return { processed: false, payment };
    }

    // Update order payment status
    await OrderModel.findByIdAndUpdate(order._id, {
      $set: { paymentStatus: 'paid', paymentReference: payment.reference },
      $push: { timeline: { status: 'paid', timestamp: new Date() } },
    }).lean();

    return { processed: true, payment: updatedPayment };
  }
}

export default new PaymentService();
