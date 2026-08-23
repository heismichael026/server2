import { z } from 'zod';

export const listBlogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const blogParamsSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
});

export type ListBlogsQuery = z.infer<typeof listBlogsQuerySchema>;
