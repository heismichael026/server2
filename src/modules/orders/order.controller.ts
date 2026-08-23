import { Request, Response } from 'express';
import OrderService from './order.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { createOrderSchema, listOrdersQuerySchema } from './order.validation';
import { ApiError } from '../../utils/ApiError';

class OrderController {
  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
    const order = await OrderService.createOrder(req.dbUser._id, parsed.data);
    sendSuccess(res, order, 201);
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const parsed = listOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
    const result = await OrderService.listOrders(req.dbUser._id, parsed.data);
    sendSuccess(res, result);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const order = await OrderService.getById(req.dbUser._id, req.params.id);
    sendSuccess(res, order);
  });

  whatsapp = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const order = await OrderService.getById(req.dbUser._id, req.params.id);
    const { buildOrderWhatsappMessage } = await import('../../utils/whatsapp');
    const whatsapp = buildOrderWhatsappMessage(order);
    sendSuccess(res, whatsapp);
  });
}

export default new OrderController();
