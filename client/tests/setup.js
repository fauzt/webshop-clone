import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server.js';
import { resetMockAuthState } from './mocks/handlers.js';

// Start intercepting requests before any test runs.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// After each test: reset MSW's handlers to the defaults (undoing any
// server.use() overrides a test added), clear the fake user/session state,
// and unmount any rendered components — same "leave no trace" principle
// as the backend's DB truncation between tests.
afterEach(() => {
  server.resetHandlers();
  resetMockAuthState();
  cleanup();
});

afterAll(() => server.close());
