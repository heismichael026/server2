import ContactMessageModel, { IContactMessageDocument } from './contactMessage.model';
import { sendContactNotification } from '../../utils/email';

class ContactService {
  async submitMessage(data: {
    name: string;
    email: string;
    phone?: string;
    message: string;
  }): Promise<IContactMessageDocument> {
    // Store in MongoDB
    const saved = await ContactMessageModel.create(data);

    // Send email notification to the restaurant (non-blocking — failure shouldn't block the API)
    sendContactNotification(data).catch((err) => {
      console.error('[contact] Failed to send email notification:', err);
    });

    return saved.toObject();
  }
}

export default new ContactService();
