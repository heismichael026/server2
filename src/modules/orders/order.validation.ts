import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  additionalInfo: z.string().optional(),
});

const orderItemInputSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const createOrderSchema = z
  .object({
    items: z.array(orderItemInputSchema).min(1, 'At least one item is required'),
    deliveryMethod: z.enum(['pickup', 'delivery']),
    deliveryAddress: addressSchema.optional(),
    useDefaultAddress: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.deliveryMethod === 'delivery') {
        return data.deliveryAddress !== undefined || data.useDefaultAddress === true;
      }
      return true;
    },
    {
      message: 'Delivery address is required for home delivery',
      path: ['deliveryAddress'],
    }
  );

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
