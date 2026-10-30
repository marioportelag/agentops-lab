import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect } from 'vitest';
import type { EvaluationReport } from '../src/types.ts';

export function tempDir(prefix = 'agentops-test-'): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

/** Creates a throwaway tasks directory containing one task with the given files. */
export function createTaskFixture(taskId: string, files: Record<string, string>): string {
  const tasksDir = tempDir('agentops-tasks-');
  const taskDir = path.join(tasksDir, taskId);
  mkdirSync(taskDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(taskDir, name), content);
  }
  return tasksDir;
}

/** Structural validation of a report as written to disk. */
export function expectValidReport(value: unknown): asserts value is EvaluationReport {
  expect(value).toMatchObject({
    schemaVersion: 1,
    tool: { name: 'agentops-lab', version: expect.stringMatching(/^\d+\.\d+\.\d+$/) },
    evaluationMode: 'predefined-solution',
    taskId: expect.any(String),
    solution: { id: expect.any(String), file: expect.stringMatching(/^tasks\/.+\.ts$/) },
    evaluatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    durationMs: expect.any(Number),
    result: expect.stringMatching(/^(PASS|PARTIAL|FAIL)$/),
    tests: {
      total: expect.any(Number),
      passed: expect.any(Number),
      failed: expect.any(Number),
      skipped: expect.any(Number),
    },
    testCases: expect.any(Array),
  });

  const report = value as EvaluationReport;
  expect(report.tests.passed + report.tests.failed + report.tests.skipped).toBe(report.tests.total);
  expect(report.testCases).toHaveLength(report.tests.total);
  expect(report.testCases.filter((testCase) => testCase.status === 'passed')).toHaveLength(
    report.tests.passed,
  );
  expect(report.durationMs).toBeGreaterThanOrEqual(0);
}
