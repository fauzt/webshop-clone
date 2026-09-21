import { z } from 'zod';

const addToCartSchema = z.object({
  bookId: z.uuid(),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
});

const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive(),
});

export { addToCartSchema, updateCartItemSchema };
