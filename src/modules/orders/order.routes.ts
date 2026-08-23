import { Router } from 'express';
import OrderController from './order.controller';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { createOrderSchema, listOrdersQuerySchema } from './order.validation';

const router = Router();

router.use(requireAuth);

router.post('/', validate({ body: createOrderSchema }), OrderController.create);
router.get('/', validate({ query: listOrdersQuerySchema }), OrderController.list);
router.get('/:id', OrderController.getById);
router.get('/:id/whatsapp', OrderController.whatsapp);

export default router;
