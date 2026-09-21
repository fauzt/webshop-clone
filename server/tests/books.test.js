import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

// Registers a user via the real API, then promotes them to ADMIN directly
// via Prisma. There's deliberately no public endpoint that grants admin,
// so tests reach into the DB the same way you'd do it manually in dev.
async function createUserAndGetToken({ role = 'USER', email } = {}) {
  const userEmail = email || `${role.toLowerCase()}-${Date.now()}@example.com`;
  const registerRes = await request(app)
    .post('/auth/register')
    .send({ email: userEmail, password: 'password123' });

  if (role === 'ADMIN') {
    await prisma.user.update({
      where: { email: userEmail },
      data: { role: 'ADMIN' },
    });
    // The access token issued at registration still says role: USER
    // (see the note in tokens.js/auth.js about tokens being self-contained)
    // So we log in again to get a fresh token that reflects the new role.
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: userEmail, password: 'password123' });
    return loginRes.body.accessToken;
  }

  return registerRes.body.accessToken;
}

const samplebook = {
  title: 'The Pragmatic Programmer',
  author: 'David Thomas',
  price: 39.99,
  stock: 10,
};

describe('GET /books', () => {
  it('returns an empty paginated list when there are no books', async () => {
    const res = await request(app).get('/books');

    expect(res.status).toBe(200);
    expect(res.body.books).toEqual([]);
    expect(res.body.pagination).toMatchObject({ page: 1, total: 0, totalPages: 0 });
  });

  it('lists books without requiring authentication', async () => {
    await prisma.book.create({ data: samplebook });

    const res = await request(app).get('/books');

    expect(res.status).toBe(200);
    expect(res.body.books).toHaveLength(1);
    expect(res.body.books[0]).toMatchObject({ title: samplebook.title });
  });

  it('filters results by search term across title and author', async () => {
    await prisma.book.create({ data: samplebook });
    await prisma.book.create({ data: { ...samplebook, title: 'Clean Code', author: 'Robert Martin' } });

    const res = await request(app).get('/books').query({ search: 'pragmatic' });

    expect(res.body.books).toHaveLength(1);
    expect(res.body.books[0].title).toBe(samplebook.title);
  });

  it('paginates results according to page and limit', async () => {
    await Promise.all(
      Array.from({ length: 5 }).map((_, i) =>
        prisma.book.create({ data: { ...samplebook, title: `Book ${i}` } })
      )
    );

    const res = await request(app).get('/books').query({ page: 2, limit: 2 });

    expect(res.body.books).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });
});

describe('GET /books/:id', () => {
  it('returns 404 for a nonexistent book', async () => {
    const res = await request(app).get('/books/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns the book for a valid id', async () => {
    const book = await prisma.book.create({ data: samplebook });

    const res = await request(app).get(`/books/${book.id}`);

    expect(res.status).toBe(200);
    expect(res.body.book).toMatchObject({ id: book.id, title: samplebook.title });
  });
});

describe('POST /books', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/books').send(samplebook);
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin user with 403', async () => {
    const token = await createUserAndGetToken({ role: 'USER' });

    const res = await request(app)
      .post('/books')
      .set('Authorization', `Bearer ${token}`)
      .send(samplebook);

    expect(res.status).toBe(403);
  });

  it('creates a book when the requester is an admin', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });

    const res = await request(app)
      .post('/books')
      .set('Authorization', `Bearer ${token}`)
      .send(samplebook);

    expect(res.status).toBe(201);
    expect(res.body.book).toMatchObject({ title: samplebook.title });
  });

  it('rejects an invalid payload (missing title) with 400', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });
    const { title, ...invalidBook } = samplebook;

    const res = await request(app)
      .post('/books')
      .set('Authorization', `Bearer ${token}`)
      .send(invalidBook);

    expect(res.status).toBe(400);
  });
});

describe('PUT /books/:id', () => {
  it('updates only the provided fields (partial update)', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });
    const book = await prisma.book.create({ data: samplebook });

    const res = await request(app)
      .put(`/books/${book.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 29.99 });

    expect(res.status).toBe(200);
    expect(res.body.book).toMatchObject({ title: samplebook.title, price: '29.99' });
  });

  it('returns 404 when updating a nonexistent book', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });

    const res = await request(app)
      .put('/books/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 10 });

    expect(res.status).toBe(404);
  });

  it('rejects a non-admin user with 403', async () => {
    const token = await createUserAndGetToken({ role: 'USER' });
    const book = await prisma.book.create({ data: samplebook });

    const res = await request(app)
      .put(`/books/${book.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 10 });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /books/:id', () => {
  it('deletes a book when the requester is an admin', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });
    const book = await prisma.book.create({ data: samplebook });

    const res = await request(app)
      .delete(`/books/${book.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/books/${book.id}`);
    expect(getRes.status).toBe(404);
  });

  it('rejects a non-admin user with 403', async () => {
    const token = await createUserAndGetToken({ role: 'USER' });
    const book = await prisma.book.create({ data: samplebook });

    const res = await request(app)
      .delete(`/books/${book.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
