import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

async function createUserAndGetToken(email) {
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password: 'password123' });
  return res.body.accessToken;
}

async function createBook(overrides = {}) {
  return prisma.book.create({
    data: {
      title: 'The Pragmatic Programmer',
      author: 'David Thomas',
      price: 39.99,
      stock: 5,
      ...overrides,
    },
  });
}

describe('GET /cart', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/cart');
    expect(res.status).toBe(401);
  });

  it('returns an empty cart with total 0.00 for a new user', async () => {
    const token = await createUserAndGetToken('empty-cart@example.com');

    const res = await request(app).get('/cart').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe('0.00');
  });

  it('computes per-item subtotal and cart total correctly', async () => {
    const token = await createUserAndGetToken('math-check@example.com');
    const book = await createBook({ price: 10 });

    await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 3 });

    const res = await request(app).get('/cart').set('Authorization', `Bearer ${token}`);

    expect(res.body.items[0].subtotal).toBe('30.00');
    expect(res.body.total).toBe('30.00');
  });
});

describe('POST /cart/items', () => {
  it('adds a new book to an empty cart', async () => {
    const token = await createUserAndGetToken('add-item@example.com');
    const book = await createBook();

    const res = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({ quantity: 2 });
  });

  it('increments quantity when adding a book already in the cart', async () => {
    const token = await createUserAndGetToken('increment@example.com');
    const book = await createBook({ stock: 10 });

    await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 2 });

    const res = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.item.quantity).toBe(5);

    // Confirm there's still only ONE row for this book, not two —
    // proves the upsert path was taken, not a duplicate create.
    const cartRes = await request(app).get('/cart').set('Authorization', `Bearer ${token}`);
    expect(cartRes.body.items).toHaveLength(1);
  });

  it('rejects adding more than available stock', async () => {
    const token = await createUserAndGetToken('over-stock@example.com');
    const book = await createBook({ stock: 2 });

    const res = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 3 });

    expect(res.status).toBe(422);
  });

  it('rejects the combined quantity exceeding stock across two adds', async () => {
    const token = await createUserAndGetToken('combined-stock@example.com');
    const book = await createBook({ stock: 3 });

    await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 2 });

    // 2 already in cart + 2 more requested = 4, but stock is only 3.
    const res = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 2 });

    expect(res.status).toBe(422);

    // Confirm the failed second request didn't silently mutate the cart.
    const cartRes = await request(app).get('/cart').set('Authorization', `Bearer ${token}`);
    expect(cartRes.body.items[0].quantity).toBe(2);
  });

  it('returns 404 for a nonexistent book', async () => {
    const token = await createUserAndGetToken('missing-book@example.com');

    const res = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: '00000000-0000-0000-0000-000000000000', quantity: 1 });

    expect(res.status).toBe(404);
  });
});

describe('PUT /cart/items/:id', () => {
  it('sets the exact quantity, replacing the previous amount', async () => {
    const token = await createUserAndGetToken('update-qty@example.com');
    const book = await createBook({ stock: 10 });

    const addRes = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 5 });

    const res = await request(app)
      .put(`/cart/items/${addRes.body.item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body.item.quantity).toBe(1);
  });

  it('rejects a quantity above stock', async () => {
    const token = await createUserAndGetToken('update-over-stock@example.com');
    const book = await createBook({ stock: 4 });

    const addRes = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 1 });

    const res = await request(app)
      .put(`/cart/items/${addRes.body.item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 10 });

    expect(res.status).toBe(400);
  });

  it("returns 404 when trying to update someone else's cart item", async () => {
    const ownerToken = await createUserAndGetToken('owner@example.com');
    const otherToken = await createUserAndGetToken('other-user@example.com');
    const book = await createBook({ stock: 10 });

    const addRes = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookId: book.id, quantity: 1 });

    const res = await request(app)
      .put(`/cart/items/${addRes.body.item.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ quantity: 2 });

    expect(res.status).toBe(404);
  });

  it('returns 404 for a nonexistent cart item id', async () => {
    const token = await createUserAndGetToken('update-missing@example.com');

    const res = await request(app)
      .put('/cart/items/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /cart/items/:id', () => {
  it('removes a cart item belonging to the user', async () => {
    const token = await createUserAndGetToken('remove-item@example.com');
    const book = await createBook();

    const addRes = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: book.id, quantity: 1 });

    const res = await request(app)
      .delete(`/cart/items/${addRes.body.item.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const cartRes = await request(app).get('/cart').set('Authorization', `Bearer ${token}`);
    expect(cartRes.body.items).toEqual([]);
  });

  it("returns 404 when trying to remove someone else's cart item", async () => {
    const ownerToken = await createUserAndGetToken('owner2@example.com');
    const otherToken = await createUserAndGetToken('other-user2@example.com');
    const book = await createBook();

    const addRes = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookId: book.id, quantity: 1 });

    const res = await request(app)
      .delete(`/cart/items/${addRes.body.item.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });
});

describe('DELETE /cart', () => {
  it('clears every item in the cart', async () => {
    const token = await createUserAndGetToken('clear-cart@example.com');
    const bookA = await createBook({ title: 'Book A' });
    const bookB = await createBook({ title: 'Book B' });

    await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: bookA.id, quantity: 1 });
    await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: bookB.id, quantity: 1 });

    const res = await request(app).delete('/cart').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const cartRes = await request(app).get('/cart').set('Authorization', `Bearer ${token}`);
    expect(cartRes.body.items).toEqual([]);
  });
});
