import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server.js';
import { resetMockAuthState, resetMockBooksState, resetMockCartState } from './mocks/handlers.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// After each test: reset MSW's handlers to the defaults (undoing any
// server.use() overrides a test added), clear the fake user/session/book
// state, and unmount any rendered components
afterEach(() => {
  server.resetHandlers();
  resetMockAuthState();
  resetMockBooksState();
  resetMockCartState();
  cleanup();
});

afterAll(() => server.close());
