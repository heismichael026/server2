import { Request, Response } from 'express';
import BlogService from './blog.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { listBlogsQuerySchema, blogParamsSchema } from './blog.validation';
import { ApiError } from '../../utils/ApiError';

class BlogController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const parsed = listBlogsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
    const result = await BlogService.listPublished(parsed.data);
    sendSuccess(res, result);
  });

  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const parsed = blogParamsSchema.safeParse(req.params);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);
    const blog = await BlogService.getBySlug(parsed.data.slug);
    if (!blog) throw ApiError.notFound('Blog post not found');
    sendSuccess(res, blog);
  });
}

export default new BlogController();
