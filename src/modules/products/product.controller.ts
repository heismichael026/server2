import { Request, Response } from 'express';
import ProductService from './product.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { listProductsQuerySchema } from './product.validation';
import { ApiError } from '../../utils/ApiError';

class ProductController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const parsed = listProductsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
    const result = await ProductService.list(parsed.data);
    sendSuccess(res, result);
  });

  categories = asyncHandler(async (_req: Request, res: Response) => {
    const cats = await ProductService.listCategories();
    sendSuccess(res, { categories: cats });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.findById(req.params.id);
    if (!product) throw ApiError.notFound('Product not found');
    sendSuccess(res, product);
  });
}

export default new ProductController();
