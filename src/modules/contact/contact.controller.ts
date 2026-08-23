import { Request, Response } from 'express';
import ContactService from './contact.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { contactMessageSchema } from './contactMessage.validation';
import { ApiError } from '../../utils/ApiError';

class ContactController {
  submit = asyncHandler(async (req: Request, res: Response) => {
    const parsed = contactMessageSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.validation('Validation failed', parsed.error.errors);

    const saved = await ContactService.submitMessage(parsed.data);

    sendSuccess(res, { message: 'Message sent successfully', id: saved._id }, 201);
  });
}

export default new ContactController();
