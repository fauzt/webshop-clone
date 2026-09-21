import { z } from 'zod';

// Used for POST /books - all fields required except the optional ones.
const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().nonnegative('Stock cannot be negative').default(0),
  coverImage: z.url().optional(),
  categoryId: z.uuid().optional(),
});

// Used for PUT /books/:id - everything optional, since it's a partial update.
// .partial() takes createBookSchema and makes every field optional automatically.
const updateBookSchema = createBookSchema.partial();

// Used for GET /books - query params arrive as strings,
// so numeric field use z.coerce to convert "2" -> 2 before validating.
const listBooksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.uuid().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'title_asc', 'newest']).optional(),
});

export { createBookSchema, updateBookSchema, listBooksQuerySchema };
