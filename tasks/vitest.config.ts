import path from 'node:path';
import { defineConfig } from 'vitest/config';

/** Configuration used by the evaluator to run a task's validation suite in a child process. */
export default defineConfig({
  // Keep Vite's cache in the project's node_modules rather than creating tasks/node_modules.
  cacheDir: path.join(import.meta.dirname, '..', 'node_modules', '.vite-tasks'),
  test: {
    root: import.meta.dirname,
    include: ['*/validation.test.ts'],
    testTimeout: 5_000,
    // Worker threads live inside the Vitest process, so the evaluator's timeout
    // (which kills that process) also stops a hanging solution. Forked workers would survive it.
    pool: 'threads',
    watch: false,
  },
});
