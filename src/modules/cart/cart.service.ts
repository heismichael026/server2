import CartModel, { ICart, ICartDocument } from './cart.model';
import ProductModel from '../products/product.model';
import { ApiError } from '../../utils/ApiError';
import mongoose from 'mongoose';

class CartService {
  async getCart(userId: string): Promise<ICart | null> {
    return CartModel.findOne({ user: userId }).lean() as unknown as Promise<ICart | null>;
  }

  async getOrCreateCart(userId: string): Promise<ICartDocument> {
    let cart = await CartModel.findOne({ user: userId });
    if (!cart) {
      cart = await CartModel.create({ user: userId, items: [] });
    }
    return cart;
  }

  async addItem(userId: string, productId: string, quantity: number): Promise<ICart> {
    const product = await ProductModel.findById(productId).lean();
    if (!product) throw ApiError.notFound('Product not found');
    if (!product.available) throw ApiError.badRequest('Product is not available');

    const cart = await this.getOrCreateCart(userId);
    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += quantity;
      cart.items[existingIndex].price = product.price;
    } else {
      cart.items.push({
        product: new mongoose.Types.ObjectId(productId),
        quantity,
        price: product.price,
      });
    }

    await cart.save();
    return cart.toObject() as unknown as ICart;
  }

  async updateItemQuantity(userId: string, productId: string, quantity: number): Promise<ICart> {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart) throw ApiError.notFound('Cart not found');

    const item = cart.items.find((item) => item.product.toString() === productId);
    if (!item) throw ApiError.notFound('Item not in cart');

    item.quantity = quantity;
    await cart.save();
    return cart.toObject() as unknown as ICart;
  }

  async removeItem(userId: string, productId: string): Promise<ICart> {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart) throw ApiError.notFound('Cart not found');

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();
    return cart.toObject() as unknown as ICart;
  }

  async clearCart(userId: string): Promise<void> {
    await CartModel.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
  }
}

export default new CartService();
