import { Request, Response } from 'express';
import CartService from './cart.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { addCartItemSchema, updateCartItemSchema } from './cart.validation';
import { ApiError } from '../../utils/ApiError';

class CartController {
  getCart = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const cart = await CartService.getCart(req.dbUser._id);
    sendSuccess(res, cart ?? { user: req.dbUser._id, items: [] });
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const parsed = addCartItemSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
    const cart = await CartService.addItem(req.dbUser._id, parsed.data.productId, parsed.data.quantity);
    sendSuccess(res, cart);
  });

  updateItem = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const parsed = updateCartItemSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
    const cart = await CartService.updateItemQuantity(req.dbUser._id, req.params.productId, parsed.data.quantity);
    sendSuccess(res, cart);
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const cart = await CartService.removeItem(req.dbUser._id, req.params.productId);
    sendSuccess(res, cart);
  });

  clearCart = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    await CartService.clearCart(req.dbUser._id);
    sendSuccess(res, { message: 'Cart cleared' });
  });
}

export default new CartController();
