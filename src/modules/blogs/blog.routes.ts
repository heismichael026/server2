import { Router } from 'express';
import BlogController from './blog.controller';
import { validate } from '../../middlewares/validate';
import { listBlogsQuerySchema, blogParamsSchema } from './blog.validation';

const router = Router();

router.get('/', validate({ query: listBlogsQuerySchema }), BlogController.list);
router.get('/:slug', validate({ params: blogParamsSchema }), BlogController.getBySlug);

export default router;
