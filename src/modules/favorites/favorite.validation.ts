import { z } from 'zod';

export const addFavoriteSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
});

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
