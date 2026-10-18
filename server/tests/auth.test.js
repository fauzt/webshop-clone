import request from 'supertest';
import app from '../src/app.js';
import { REFRESH_TOKEN_TTL_DAYS } from '../src/utils/tokens';
import prisma from '../src/config/db.js';
import { OAuth2Client } from 'google-auth-library';

const validUser = { email: 'reader@example.com', password: 'correcthorse123' };

// e.g. "refreshToken=abc; Max-Age=2592000; Path=...".
function parseMaxAge(cookieHeader) {
  const match = cookieHeader.match(/Max-Age=(\d+)/);
  return match ? Number(match[1]) : null;
}

describe('POST /auth/register', () => {
  it('creates a user and returns an access token + user info', async () => {
    const res = await request(app).post('/auth/register').send(validUser);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: validUser.email, role: 'USER' });
    // The refresh token should never appear in the JSON body — only as a cookie.
    expect(res.body.refreshToken).toBeUndefined();
  });

  it('sets an httpOnly refresh token cookie scoped to /auth/refresh', async () => {
    const res = await request(app).post('/auth/register').send(validUser);

    const cookieHeader = res.headers['set-cookie']?.[0];
    expect(cookieHeader).toContain('refreshToken=');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('Path=/auth/refresh');
  });

  it('sets a Max-Age reflecting the full refresh token lifetime, not 0', async () => {
    const res = await request(app).post('/auth/register').send(validUser);

    const cookieHeader = res.headers['set-cookie']?.[0];
    const maxAge = parseMaxAge(cookieHeader);
    const expectedSeconds = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

    expect(maxAge).not.toBe(0);
    expect(maxAge).not.toBeNull();
    // Allow a small tolerance rather than an exact match, in case the
    // constant is tweaked slightly or computed with a moment of
    // clock drift between request and assertion.
    expect(maxAge).toBeGreaterThan(expectedSeconds - 60);
    expect(maxAge).toBeLessThanOrEqual(expectedSeconds);
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/auth/register').send(validUser);
    const res = await request(app).post('/auth/register').send(validUser);

    expect(res.status).toBe(409);
  });

  it('rejects a password shorter than 8 characters with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'short@example.com', password: 'abc' });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send(validUser);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/auth/login').send(validUser);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: validUser.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects a nonexistent email with the same 401 as a wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('issues a new access token given a valid refresh cookie', async () => {
    const registerRes = await request(app).post('/auth/register').send(validUser);
    const cookie = registerRes.headers['set-cookie'];

    const refreshRes = await request(app).post('/auth/refresh').set('Cookie', cookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));
    // Rotation: the new refresh token cookie should differ from the original.
    const newCookie = refreshRes.headers['set-cookie']?.[0];
    expect(newCookie).toContain('refreshToken=');
    expect(newCookie).not.toBe(cookie[0]);

    const rotatedMaxAge = parseMaxAge(newCookie);
    expect(rotatedMaxAge).not.toBe(0);
    expect(rotatedMaxAge).toBeGreaterThan(REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 - 60);
  });

  it('rejects a reused (already-rotated) refresh token', async () => {
    const registerRes = await request(app).post('/auth/register').send(validUser);
    const originalCookie = registerRes.headers['set-cookie'];

    // First use rotates it, this should succeed.
    await request(app).post('/auth/refresh').set('Cookie', originalCookie);

    // Reusing the now-revoked original token should fail.
    const reuseRes = await request(app).post('/auth/refresh').set('Cookie', originalCookie);
    expect(reuseRes.status).toBe(401);
  });

  it('rejects a missing refresh token with 401', async () => {
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token so it can no longer be used', async () => {
    const registerRes = await request(app).post('/auth/register').send(validUser);
    const cookie = registerRes.headers['set-cookie'];

    const logoutRes = await request(app).post('/auth/logout').set('Cookie', cookie);
    expect(logoutRes.status).toBe(204);

    const refreshRes = await request(app).post('/auth/refresh').set('Cookie', cookie);
    expect(refreshRes.status).toBe(401);
  });
});

const testGoogleIdTokenPayload = {
  sub: '1234567890',
  email: 'reader@example.com',
  email_verified: true,
  given_name: 'Test',
  family_name: 'User',
  name: 'Test User',
}

vi.mock('google-auth-library', () => {
  const mOAuth2Client = {
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => (testGoogleIdTokenPayload),
    }),
  };
  return {
    OAuth2Client: vi.fn(function () {
      return mOAuth2Client;
    }),
  };
});

describe('POST /auth/google', () => {
  // for overriding override its resolved value.
  const googleClientMock = new OAuth2Client();

  it('creates a new user on a successful fresh sign-in with OAuth', async () => {
    const idToken = 'fake-id-token';
    const oAuthRes = await request(app).post('/auth/google').send({ idToken });
    expect(oAuthRes.status).toBe(200);
    expect(oAuthRes.body.accessToken).toEqual(expect.any(String));
    expect(oAuthRes.body.user).toMatchObject({ email: validUser.email, role: 'USER' });

    const newUser = await prisma.user.findUnique({ where: { email: validUser.email } });
    expect(newUser).not.toBeNull();
    expect(newUser.googleId).toBe(testGoogleIdTokenPayload.sub)
    expect(newUser.passwordHash).toBeNull();
  });

  it('links an existing password account to Google on first OAuth sign-in, without creating a duplicate', async () => {
    const registerRes = await request(app).post('/auth/register').send(validUser);
    const existingUserId = registerRes.body.user.id;

    const oAuthRes = await request(app).post('/auth/google').send({ idToken: 'fake-id-token' });

    expect(oAuthRes.status).toBe(200);
    expect(oAuthRes.body.user.id).toBe(existingUserId);

    const linkedUser = await prisma.user.findUnique({ where: { email: validUser.email } });
    expect(linkedUser.id).toBe(existingUserId);
    expect(linkedUser.googleId).toBe(testGoogleIdTokenPayload.sub);
    // The original password must survive linking.
    expect(linkedUser.passwordHash).not.toBeNull();

    const allMatchingUsers = await prisma.user.findMany({ where: { email: validUser.email } });
    expect(allMatchingUsers).toHaveLength(1);
  });

  it('logs into the same user on a repeat sign-in, without creating a duplicate', async () => {
    const firstRes = await request(app).post('/auth/google').send({ idToken: 'fake-id-token' });
    const secondRes = await request(app).post('/auth/google').send({ idToken: 'fake-id-token' });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.user.id).toBe(firstRes.body.user.id);

    const allMatchingUsers = await prisma.user.findMany({ where: { email: validUser.email } });
    expect(allMatchingUsers).toHaveLength(1);
  });

  it('rejects an unverified Google email with 401, without creating a user', async () => {
    googleClientMock.verifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ ...testGoogleIdTokenPayload, email_verified: false }),
    });

    const oAuthRes = await request(app).post('/auth/google').send({ idToken: 'fake-id-token' });

    expect(oAuthRes.status).toBe(401);
    const user = await prisma.user.findUnique({ where: { email: validUser.email } });
    expect(user).toBeNull();
  });
});

describe('GET /me', () => {
  it('rejects a request with no access token', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
  });

  it('returns the user id and role for a valid access token', async () => {
    const registerRes = await request(app).post('/auth/register').send(validUser);
    const { accessToken } = registerRes.body;

    const res = await request(app).get('/me').set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ role: 'USER' });
  });
});
