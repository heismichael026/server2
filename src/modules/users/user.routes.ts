import { Router } from 'express';
import UserController from './user.controller';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { syncUserSchema, updateProfileSchema } from './user.validation';

const router = Router();

router.post('/sync', requireAuth, validate({ body: syncUserSchema }), UserController.sync);
router.get('/me', requireAuth, UserController.getMe);
router.patch('/me', requireAuth, validate({ body: updateProfileSchema }), UserController.updateMe);

export default router;
