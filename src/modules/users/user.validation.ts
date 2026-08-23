import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  additionalInfo: z.string().optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(120).optional(),
  phone: z.string().min(1, 'Phone is required').optional(),
  whatsapp: z.string().optional(),
  address: addressSchema.optional(),
});

export const syncUserSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().min(1),
  whatsapp: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SyncUserInput = z.infer<typeof syncUserSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
