import { Router } from 'express';
import CartController from './cart.controller';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { addCartItemSchema, updateCartItemSchema } from './cart.validation';

const router = Router();

router.use(requireAuth);

router.get('/', CartController.getCart);
router.post('/', validate({ body: addCartItemSchema }), CartController.addItem);
router.patch('/:productId', validate({ body: updateCartItemSchema }), CartController.updateItem);
router.delete('/:productId', CartController.removeItem);
router.delete('/', CartController.clearCart);

export default router;
