import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const updateCategorySchema = createCategorySchema;

export { createCategorySchema, updateCategorySchema };
