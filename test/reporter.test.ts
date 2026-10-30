import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatSummary, reportFileName, writeReport } from '../src/reporter.ts';
import type { EvaluationReport } from '../src/types.ts';
import { expectValidReport, tempDir } from './helpers.ts';

const REPORT: EvaluationReport = {
  schemaVersion: 1,
  tool: { name: 'agentops-lab', version: '0.1.0' },
  evaluationMode: 'predefined-solution',
  taskId: 'fix-auth-middleware',
  solution: { id: 'buggy', file: 'tasks/fix-auth-middleware/buggy.ts' },
  evaluatedAt: '2026-01-01T12:34:56.789Z',
  durationMs: 512,
  result: 'PARTIAL',
  tests: { total: 2, passed: 1, failed: 1, skipped: 0 },
  testCases: [
    { name: 'accepts valid tokens', status: 'passed', durationMs: 1 },
    { name: 'rejects missing headers', status: 'failed', durationMs: 1, failureMessage: 'expected 401' },
  ],
};

describe('reporter', () => {
  it('derives a filesystem-safe, sortable file name', () => {
    expect(reportFileName(REPORT)).toBe('fix-auth-middleware.buggy.2026-01-01T12-34-56-789Z.json');
  });

  it('writes the report as valid JSON that round-trips', () => {
    const file = writeReport(REPORT, tempDir());
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));

    expectValidReport(parsed);
    expect(parsed).toEqual(REPORT);
    expect(path.basename(file)).toBe(reportFileName(REPORT));
  });

  it('never overwrites an existing report', () => {
    const directory = tempDir();
    writeReport(REPORT, directory);

    expect(() => writeReport(REPORT, directory)).toThrow(/EEXIST/);
  });

  it('summarises every required field for humans', () => {
    const summary = formatSummary(REPORT);

    for (const expected of [
      'fix-auth-middleware',
      'buggy',
      '2026-01-01T12:34:56.789Z',
      '512 ms',
      '1 passed · 1 failed · 0 skipped · 2 total',
      'PARTIAL',
      '✓ accepts valid tokens',
      '✗ rejects missing headers',
      'predefined-solution',
    ]) {
      expect(summary).toContain(expected);
    }
  });
});
