import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['./tests/**/*.test.js'],
    setupFiles: ['./tests/env.js', './tests/setup.js'],
    fileParallelism: false,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
    }
  },
});
