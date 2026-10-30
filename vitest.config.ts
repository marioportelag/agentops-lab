import { defineConfig } from 'vitest/config';

/** Configuration for the project's own tests. Task suites run only through the evaluator. */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
