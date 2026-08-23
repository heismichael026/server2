import FavoriteModel, { IFavorite } from './favorite.model';
import ProductModel from '../products/product.model';
import { ApiError } from '../../utils/ApiError';

class FavoriteService {
  async list(userId: string): Promise<IFavorite[]> {
    return FavoriteModel.find({ user: userId })
      .populate({ path: 'product', model: 'Product' })
      .lean() as unknown as Promise<IFavorite[]>;
  }

  async add(userId: string, productId: string): Promise<IFavorite> {
    const product = await ProductModel.findById(productId).lean();
    if (!product) throw ApiError.notFound('Product not found');

    try {
      const fav = await FavoriteModel.create({
        user: userId as unknown as import('mongoose').Types.ObjectId,
        product: productId as unknown as import('mongoose').Types.ObjectId,
      });
      return fav.toObject() as unknown as IFavorite;
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code === 11000) {
        throw ApiError.conflict('Product already in favorites');
      }
      throw err;
    }
  }

  async remove(userId: string, productId: string): Promise<void> {
    await FavoriteModel.deleteOne({
      user: userId,
      product: productId,
    });
  }
}

export default new FavoriteService();
