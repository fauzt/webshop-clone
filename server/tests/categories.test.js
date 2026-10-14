import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

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
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: userEmail, password: 'password123' });
    return loginRes.body.accessToken;
  }

  return registerRes.body.accessToken;
}

describe('GET /categories', () => {
  it('returns an empty list when there are no categories', async () => {
    const res = await request(app).get('/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual([]);
  });

  it('lists categories without requiring authentication, sorted by name', async () => {
    await prisma.category.create({ data: { name: 'Sci-Fi' } });
    await prisma.category.create({ data: { name: 'Fantasy' } });

    const res = await request(app).get('/categories');

    expect(res.status).toBe(200);
    expect(res.body.categories.map((c) => c.name)).toEqual(['Fantasy', 'Sci-Fi']);
  });
});

describe('POST /categories', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/categories').send({ name: 'Fantasy' });
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin user with 403', async () => {
    const token = await createUserAndGetToken({ role: 'USER' });

    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fantasy' });

    expect(res.status).toBe(403);
  });

  it('creates a category when the requester is an admin', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });

    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fantasy' });

    expect(res.status).toBe(201);
    expect(res.body.category).toMatchObject({ name: 'Fantasy' });
  });

  it('rejects an empty name with 400', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });

    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('rejects a duplicate name with 409', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });
    await prisma.category.create({ data: { name: 'Fantasy' } });

    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fantasy' });

    expect(res.status).toBe(409);
  });
});

describe('PUT /categories/:id', () => {
  it('renames a category when the requester is an admin', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });
    const category = await prisma.category.create({ data: { name: 'Fantasy' } });

    const res = await request(app)
      .put(`/categories/${category.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Science Fiction' });

    expect(res.status).toBe(200);
    expect(res.body.category).toMatchObject({ name: 'Science Fiction' });
  });

  it('returns 404 when renaming a nonexistent category', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });

    const res = await request(app)
      .put('/categories/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Science Fiction' });

    expect(res.status).toBe(404);
  });

  it('rejects a non-admin user with 403', async () => {
    const token = await createUserAndGetToken({ role: 'USER' });
    const category = await prisma.category.create({ data: { name: 'Fantasy' } });

    const res = await request(app)
      .put(`/categories/${category.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Science Fiction' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /categories/:id', () => {
  it('deletes a category that has no books assigned', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });
    const category = await prisma.category.create({ data: { name: 'Fantasy' } });

    const res = await request(app)
      .delete(`/categories/${category.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it('refuses to delete a category that still has books assigned, with 409', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });
    const category = await prisma.category.create({ data: { name: 'Fantasy' } });
    await prisma.book.create({
      data: {
        title: 'Dune',
        author: 'Frank Herbert',
        price: 19.99,
        stock: 5,
        categoryId: category.id,
      },
    });

    const res = await request(app)
      .delete(`/categories/${category.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);

    const stillExists = await prisma.category.findUnique({ where: { id: category.id } });
    expect(stillExists).not.toBeNull();
  });

  it('returns 404 when deleting a nonexistent category', async () => {
    const token = await createUserAndGetToken({ role: 'ADMIN' });

    const res = await request(app)
      .delete('/categories/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('rejects a non-admin user with 403', async () => {
    const token = await createUserAndGetToken({ role: 'USER' });
    const category = await prisma.category.create({ data: { name: 'Fantasy' } });

    const res = await request(app)
      .delete(`/categories/${category.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
