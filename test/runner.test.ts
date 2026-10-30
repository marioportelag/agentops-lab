import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseVitestReport, runValidationSuite } from '../src/runner.ts';
import { TASKS_DIR } from '../src/tasks.ts';

describe('parseVitestReport', () => {
  it('maps Vitest JSON reporter output to counts and test cases', () => {
    const run = parseVitestReport({
      numTotalTests: 3,
      numPassedTests: 1,
      numFailedTests: 1,
      numPendingTests: 1,
      testResults: [
        {
          status: 'failed',
          assertionResults: [
            { title: 'passes', status: 'passed', duration: 1.6 },
            {
              title: 'fails',
              status: 'failed',
              duration: 2.2,
              failureMessages: ['\nAssertionError: expected 200 to be 401\n    at stack'],
            },
            { title: 'skipped', status: 'skipped', duration: null },
          ],
        },
      ],
    });

    expect(run.counts).toEqual({ total: 3, passed: 1, failed: 1, skipped: 1 });
    expect(run.testCases).toEqual([
      { name: 'passes', status: 'passed', durationMs: 2 },
      {
        name: 'fails',
        status: 'failed',
        durationMs: 2,
        failureMessage: 'AssertionError: expected 200 to be 401',
      },
      { name: 'skipped', status: 'skipped', durationMs: 0 },
    ]);
    expect(run.error).toBeUndefined();
  });

  it('reports a suite that failed to load (e.g. the solution throws on import)', () => {
    const run = parseVitestReport({
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 0,
      numPendingTests: 0,
      testResults: [{ status: 'failed', message: 'Error: boom\n at x', assertionResults: [] }],
    });

    expect(run.error).toBe('Validation suite failed to load: Error: boom');
  });
});

describe('runValidationSuite failure handling (real Vitest runs)', () => {
  const taskDir = path.join(TASKS_DIR, 'fix-auth-middleware');
  const testFile = path.join(taskDir, 'validation.test.ts');

  /** Writes a temporary solution next to the task (ignored by git) and removes it afterwards. */
  async function withSolution<T>(source: string, run: (file: string) => Promise<T>): Promise<T> {
    const file = path.join(taskDir, `.tmp-${process.pid}-${Date.now()}.ts`);
    writeFileSync(file, source);
    try {
      return await run(file);
    } finally {
      rmSync(file, { force: true });
    }
  }

  it('reports a solution that throws on import as a load failure', async () => {
    const run = await withSolution("throw new Error('exploded on import');\n", (solutionFile) =>
      runValidationSuite({ testFile, solutionFile }),
    );

    expect(run.counts.total).toBe(0);
    expect(run.error).toMatch(/failed to load: .*exploded on import/);
  });

  it('stops a hanging solution at the timeout', async () => {
    const started = Date.now();
    const run = await withSolution(
      'export function createAuthMiddleware() { return () => { for (;;) {} }; }\n',
      (solutionFile) => runValidationSuite({ testFile, solutionFile, timeoutMs: 4_000 }),
    );

    expect(run.error).toBe('Validation suite timed out after 4000 ms');
    expect(Date.now() - started).toBeLessThan(15_000);
  });
});
