import prisma from '../src/config/db.js';

afterEach(async () => {
  // CASCADE handles foreign keys automatically (e.g. deleting a user's
  // refresh tokens/cart items along with the truncate), so table order here
  // doesn't matter.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "users", "refresh_tokens", "categories", "books",
      "cart_items", "orders", "order_items"
    RESTART IDENTITY CASCADE;
  `);
});

afterAll(async () => {
  await prisma.$disconnect();
});
