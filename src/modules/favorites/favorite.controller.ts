import { Request, Response } from 'express';
import FavoriteService from './favorite.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { addFavoriteSchema } from './favorite.validation';
import { ApiError } from '../../utils/ApiError';

class FavoriteController {
  list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const favorites = await FavoriteService.list(req.dbUser._id);
    sendSuccess(res, favorites);
  });

  add = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    const parsed = addFavoriteSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
    const fav = await FavoriteService.add(req.dbUser._id, parsed.data.productId);
    sendSuccess(res, fav, 201);
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    if (!req.dbUser) throw ApiError.unauthorized('Authentication required');
    await FavoriteService.remove(req.dbUser._id, req.params.productId);
    sendSuccess(res, { message: 'Removed from favorites' });
  });
}

export default new FavoriteController();
