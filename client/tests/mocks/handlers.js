import { http, HttpResponse, delay } from 'msw';
import { randomUUID } from 'node:crypto';

const API_URL = 'http://localhost:4000';

// A fake "database" so tests can register a user and then log in as them
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

// A fake "books table" — an array (not a Map) since tests need to seed
// specific ordering/pagination scenarios, which a Map's insertion order
// makes awkward to reason about compared to a plain array.
export let fakeBooks = [];

export function seedBooks(books) {
  fakeBooks = books;
}

export function resetMockBooksState() {
  fakeBooks = [];
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

http.get(`${API_URL}/books`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 12;
    const search = url.searchParams.get('search');

    let filtered = fakeBooks;
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term)
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const books = filtered.slice(start, start + limit);

    return HttpResponse.json({
      books,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  // Mirrors the real bookController's stock check for BookCard's 
  // add-to-cart button to be tested against realistic responses.
  http.post(`${API_URL}/cart/items`, async ({ request }) => {
    const { bookId, quantity } = await request.json();
    const book = fakeBooks.find((b) => b.id === bookId);

    if (!book) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    if (quantity > book.stock) {
      return HttpResponse.json({ error: `Only ${book.stock} in stock` }, { status: 400 });
    }

    return HttpResponse.json(
      { item: { id: randomUUID(), quantity, book } },
      { status: 201 }
    );
  }),
];
