import { http, HttpResponse, delay } from 'msw';
import { randomUUID } from 'node:crypto';

const API_URL = 'http://localhost:4000';

// A tiny fake "database" so tests can register a user and then log in as
// them, exercising the real request/response flow rather than stubbing it.
export const fakeUsers = new Map();

// Tracks whether a "session" (refresh cookie) is currently valid. Tests
// flip this directly to simulate "already logged in on page load" vs
// "no session" without needing real cookies in jsdom.
export const sessionState = { hasValidRefreshToken: false, currentUser: null };

export function resetMockAuthState() {
  fakeUsers.clear();
  sessionState.hasValidRefreshToken = false;
  sessionState.currentUser = null;
}

export const handlers = [
  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const { email, password } = await request.json();

    if (password.length < 8) {
      return HttpResponse.json(
        { error: 'Validation failed' },
        { status: 400 }
      );
    }
    if (fakeUsers.has(email)) {
      return HttpResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const user = { id: randomUUID(), email, role: 'USER' };
    fakeUsers.set(email, { ...user, password });
    sessionState.hasValidRefreshToken = true;
    sessionState.currentUser = user;

    return HttpResponse.json({ accessToken: 'fake-access-token', user });
  }),

  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const { email, password } = await request.json();
    const stored = fakeUsers.get(email);

    if (!stored || stored.password !== password) {
      return HttpResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await delay();

    const user = { id: stored.id, email: stored.email, role: stored.role };
    sessionState.hasValidRefreshToken = true;
    sessionState.currentUser = user;

    return HttpResponse.json({ accessToken: 'fake-access-token', user });
  }),

  http.post(`${API_URL}/auth/refresh`, () => {
    if (!sessionState.hasValidRefreshToken) {
      return HttpResponse.json({ error: 'Refresh token invalid or expired' }, { status: 401 });
    }
    return HttpResponse.json({
      accessToken: 'refreshed-access-token',
      user: sessionState.currentUser,
    });
  }),

  http.post(`${API_URL}/auth/logout`, () => {
    sessionState.hasValidRefreshToken = false;
    sessionState.currentUser = null;
    return new HttpResponse(null, { status: 204 });
  }),
];
