import { Router } from 'express';
import ProductController from './product.controller';

const router = Router();

router.get('/', ProductController.list);
router.get('/categories', ProductController.categories);
router.get('/:id', ProductController.getById);

export default router;
