import { z } from 'zod';

export const contactMessageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  message: z.string().min(1, 'Message is required').max(5000),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
