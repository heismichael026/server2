import OrderModel, { IOrder, IOrderDocument } from './order.model';
import ProductModel from '../products/product.model';
import UserService from '../users/user.service';
import { ApiError } from '../../utils/ApiError';
import { generateOrderNumber } from '../../utils/orderNumber';
import { calculateDeliveryFee } from './deliveryFee';
import { CreateOrderInput, ListOrdersQuery } from './order.validation';
import mongoose from 'mongoose';

class OrderService {
  async createOrder(userId: string, input: CreateOrderInput): Promise<IOrder> {
    const user = await UserService.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    // Validate products and retrieve current prices from MongoDB
    const productIds = input.items.map((item) => item.productId);
    const products = await ProductModel.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => String(p._id)));
      const missing = productIds.filter((id) => !foundIds.has(id));
      throw ApiError.badRequest(`Products not found: ${missing.join(', ')}`);
    }

    // Validate availability and build order item snapshots
    const orderItems: Array<{
      product: mongoose.Types.ObjectId;
      name: string;
      price: number;
      quantity: number;
    }> = [];
    let subtotal = 0;

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) throw ApiError.notFound(`Product not found: ${item.productId}`);
      if (!product.available) throw ApiError.badRequest(`Product not available: ${product.name}`);

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        product: new mongoose.Types.ObjectId(item.productId),
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    // Backend calculates delivery fee — never trust the frontend
    const deliveryFee = calculateDeliveryFee(input.deliveryMethod);

    // Determine delivery address
    let deliveryAddress: IOrder['deliveryAddress'];
    if (input.deliveryMethod === 'delivery') {
      if (input.deliveryAddress) {
        deliveryAddress = {
          street: input.deliveryAddress.street,
          city: input.deliveryAddress.city,
          state: input.deliveryAddress.state,
          ...(input.deliveryAddress.additionalInfo ? { additionalInfo: input.deliveryAddress.additionalInfo } : {}),
        };
      } else if (input.useDefaultAddress && user.address) {
        deliveryAddress = {
          street: user.address.street,
          city: user.address.city,
          state: user.address.state,
          ...(user.address.additionalInfo ? { additionalInfo: user.address.additionalInfo } : {}),
        };
      } else {
        throw ApiError.badRequest('Delivery address is required for home delivery');
      }
    }

    const totalAmount = subtotal + deliveryFee;
    const orderNumber = await generateOrderNumber();

    const order = await OrderModel.create({
      orderNumber,
      user: new mongoose.Types.ObjectId(userId),
      customerName: user.fullName,
      customerPhone: user.phone,
      items: orderItems,
      subtotal,
      deliveryFee,
      totalAmount,
      deliveryMethod: input.deliveryMethod,
      deliveryAddress,
      orderStatus: 'placed',
      paymentStatus: 'pending',
      timeline: [{ status: 'placed', timestamp: new Date() }],
    });

    return order.toObject() as unknown as IOrder;
  }

  async listOrders(
    userId: string,
    query: ListOrdersQuery
  ): Promise<{ items: IOrder[]; total: number; page: number; limit: number; totalPages: number }> {
    const filter = { user: userId };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
      OrderModel.countDocuments(filter),
    ]);

    return {
      items: items as unknown as IOrder[],
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 0,
    };
  }

  async getById(userId: string, orderId: string): Promise<IOrder> {
    if (!mongoose.isValidObjectId(orderId)) throw ApiError.notFound('Order not found');
    const order = await OrderModel.findOne({ _id: orderId, user: userId }).lean() as unknown as IOrder | null;
    if (!order) throw ApiError.notFound('Order not found');
    return order;
  }

  async findByOrderNumber(userId: string, orderNumber: string): Promise<IOrder | null> {
    return OrderModel.findOne({ orderNumber, user: userId }).lean() as unknown as Promise<IOrder | null>;
  }

  async markPaymentStatus(
    orderId: string,
    status: 'paid' | 'failed' | 'refunded',
    reference?: string
  ): Promise<IOrder | null> {
    const update: Record<string, unknown> = {
      paymentStatus: status,
    };
    if (reference) update.paymentReference = reference;
    if (status === 'paid') {
      update.$push = { timeline: { status: 'paid', timestamp: new Date() } };
    } else if (status === 'failed') {
      update.$push = { timeline: { status: 'payment_failed', timestamp: new Date() } };
    }

    return OrderModel.findByIdAndUpdate(orderId, update, { new: true }).lean() as unknown as Promise<IOrder | null>;
  }
}

export default new OrderService();
