import { Router } from 'express';
import PaymentController from './payment.controller';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { initializePaymentSchema, verifyPaymentParamsSchema } from './payment.validation';

const router = Router();

// Webhook route — no auth, uses raw body verification
router.post('/webhook', PaymentController.webhook);

// Protected routes
router.post('/initialize', requireAuth, validate({ body: initializePaymentSchema }), PaymentController.initialize);
router.get('/verify/:reference', validate({ params: verifyPaymentParamsSchema }), PaymentController.verify);

export default router;
