import { z } from 'zod';

export const initializePaymentSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
});

export const verifyPaymentParamsSchema = z.object({
  reference: z.string().min(1, 'reference is required'),
});

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
