import { Router } from 'express';
import FavoriteController from './favorite.controller';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { addFavoriteSchema } from './favorite.validation';

const router = Router();

router.use(requireAuth);

router.get('/', FavoriteController.list);
router.post('/', validate({ body: addFavoriteSchema }), FavoriteController.add);
router.delete('/:productId', FavoriteController.remove);

export default router;
