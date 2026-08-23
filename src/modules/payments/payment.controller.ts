import { Request, Response } from 'express';
import PaymentService from './payment.service';
import PaystackService from './paystack.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { initializePaymentSchema, verifyPaymentParamsSchema } from './payment.validation';
import { ApiError } from '../../utils/ApiError';

class PaymentController {
  initialize = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const parsed = initializePaymentSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);

    const result = await PaymentService.initializePayment(req.dbUser._id, parsed.data.orderId);

    sendSuccess(res, {
      authorizationUrl: result.authorizationUrl,
      reference: result.reference,
      accessCode: result.accessCode,
    });
  });

  verify = asyncHandler(async (req: Request, res: Response) => {
    const parsed = verifyPaymentParamsSchema.safeParse(req.params);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);

    const result = await PaymentService.verifyPayment(parsed.data.reference);

    sendSuccess(res, {
      verified: result.verified,
      status: result.payment?.status ?? 'unknown',
      reference: result.payment?.reference,
    });
  });

  /**
   * POST /api/v1/payments/webhook
   * Paystack webhook handler. Must verify signature and be idempotent.
   * This route uses raw body — the raw body must be captured by express.raw
   * before JSON parsing. See app.ts for the middleware ordering.
   */
  webhook = async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-paystack-signature'] as string | undefined;

      // The raw body should be available via req.rawBody (captured by express.json verify)
      const rawBody = req.body instanceof Buffer
        ? req.body.toString()
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body);

      // Verify webhook signature
      if (signature && PaystackService.verifyWebhookSignature(rawBody, signature) === false) {
        res.status(401).json({ success: false, message: 'Invalid signature' });
        return;
      }

      const payload = typeof req.body === 'object' && !(req.body instanceof Buffer)
        ? req.body
        : JSON.parse(rawBody);

      const event = payload.event;
      const data = payload.data;

      if (!event || !data) {
        res.status(400).json({ success: false, message: 'Invalid webhook payload' });
        return;
      }

      await PaymentService.processWebhookEvent({ event, data });

      // Always return 200 quickly to Paystack
      res.status(200).json({ success: true });
    } catch (err) {
      console.error('[webhook] Error processing Paystack webhook:', err);
      // Still return 200 to avoid Paystack retrying and spamming
      res.status(200).json({ success: true });
    }
  };
}

export default new PaymentController();
