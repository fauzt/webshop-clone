import { z } from 'zod';

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'Password is required'),
});

export { registerSchema, loginSchema };
