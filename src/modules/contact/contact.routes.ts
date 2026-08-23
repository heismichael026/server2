import { Router } from 'express';
import ContactController from './contact.controller';
import { validate } from '../../middlewares/validate';
import { contactMessageSchema } from './contactMessage.validation';

const router = Router();

router.post('/', validate({ body: contactMessageSchema }), ContactController.submit);

export default router;
