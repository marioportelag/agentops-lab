import { describe, expect, it, vi } from 'vitest';
import { classifyResult, evaluate } from '../src/evaluator.ts';
import { TaskError } from '../src/tasks.ts';
import type { SuiteRun, TestCounts } from '../src/types.ts';
import { expectValidReport } from './helpers.ts';

const counts = (passed: number, failed: number, skipped = 0): TestCounts => ({
  total: passed + failed + skipped,
  passed,
  failed,
  skipped,
});

describe('classifyResult', () => {
  it.each([
    ['all tests passed', counts(10, 0), undefined, 'PASS'],
    ['some passed, some failed', counts(2, 8), undefined, 'PARTIAL'],
    ['none passed', counts(0, 10), undefined, 'FAIL'],
    ['no tests ran', counts(0, 0), undefined, 'FAIL'],
    ['passing tests but the run errored', counts(10, 0), 'timeout', 'FAIL'],
    ['passed tests with skipped ones', counts(9, 0, 1), undefined, 'PARTIAL'],
  ] as const)('%s → %s', (_case, testCounts, error, expected) => {
    expect(classifyResult(testCounts, error)).toBe(expected);
  });
});

describe('evaluate', () => {
  const fixedClock = () => new Date('2026-01-01T00:00:00.000Z');

  function fakeSuite(run: SuiteRun) {
    return vi.fn(() => Promise.resolve(run));
  }

  it('builds a report from the suite run, without inventing data', async () => {
    const runSuite = fakeSuite({
      counts: counts(1, 1),
      testCases: [
        { name: 'a', status: 'passed', durationMs: 1 },
        { name: 'b', status: 'failed', durationMs: 2, failureMessage: 'expected 401' },
      ],
    });

    const report = await evaluate({
      taskId: 'fix-auth-middleware',
      solutionId: 'buggy',
      runSuite,
      now: fixedClock,
    });

    expectValidReport(report);
    expect(report).toMatchObject({
      taskId: 'fix-auth-middleware',
      solution: { id: 'buggy', file: 'tasks/fix-auth-middleware/buggy.ts' },
      evaluatedAt: '2026-01-01T00:00:00.000Z',
      result: 'PARTIAL',
      tests: { total: 2, passed: 1, failed: 1, skipped: 0 },
    });
    expect(report).not.toHaveProperty('error');
    expect(runSuite).toHaveBeenCalledWith({
      testFile: expect.stringMatching(/validation\.test\.ts$/),
      solutionFile: expect.stringMatching(/buggy\.ts$/),
    });
  });

  it('records suite errors and reports FAIL', async () => {
    const report = await evaluate({
      taskId: 'fix-auth-middleware',
      solutionId: 'reference',
      runSuite: fakeSuite({ counts: counts(0, 0), testCases: [], error: 'timed out' }),
      now: fixedClock,
    });

    expect(report.result).toBe('FAIL');
    expect(report.error).toBe('timed out');
  });

  it('rejects unknown tasks and solutions before running anything', async () => {
    const runSuite = fakeSuite({ counts: counts(1, 0), testCases: [] });

    await expect(evaluate({ taskId: 'nope', solutionId: 'reference', runSuite })).rejects.toThrow(TaskError);
    await expect(evaluate({ taskId: 'fix-auth-middleware', solutionId: 'agent', runSuite })).rejects.toThrow(
      TaskError,
    );
    expect(runSuite).not.toHaveBeenCalled();
  });
});
