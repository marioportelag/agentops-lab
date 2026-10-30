import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from './tasks.ts';
import type { EvaluationReport } from './types.ts';

export const DEFAULT_REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');

/** e.g. fix-auth-middleware.reference.2026-10-30T01-45-12-345Z.json */
export function reportFileName(report: EvaluationReport): string {
  const timestamp = report.evaluatedAt.replace(/[:.]/g, '-');
  return `${report.taskId}.${report.solution.id}.${timestamp}.json`;
}

/** Writes the report as pretty-printed JSON and returns the file path. */
export function writeReport(report: EvaluationReport, directory = DEFAULT_REPORTS_DIR): string {
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, reportFileName(report));
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return file;
}

const STATUS_ICON = { passed: '✓', failed: '✗', skipped: '–' } as const;

/** Relative to the working directory when inside it, absolute otherwise. */
function displayPath(file: string): string {
  const relative = path.relative(process.cwd(), file);
  return relative.startsWith('..') || path.isAbsolute(relative) ? file : relative;
}

/** Human-readable summary printed by the CLI. */
export function formatSummary(report: EvaluationReport, reportFile?: string): string {
  const { tests } = report;
  const lines = [
    '',
    `  AgentOps Lab v${report.tool.version} · evaluation (${report.evaluationMode})`,
    '',
    `  Task        ${report.taskId}`,
    `  Solution    ${report.solution.id} (${report.solution.file})`,
    `  Timestamp   ${report.evaluatedAt}`,
    `  Duration    ${report.durationMs} ms`,
    `  Tests       ${tests.passed} passed · ${tests.failed} failed · ${tests.skipped} skipped · ${tests.total} total`,
    `  Result      ${report.result}`,
    '',
    ...report.testCases.map((testCase) => `    ${STATUS_ICON[testCase.status]} ${testCase.name}`),
  ];

  if (report.error !== undefined) lines.push('', `  Error       ${report.error}`);
  if (reportFile !== undefined) lines.push('', `  Report      ${displayPath(reportFile)}`);

  return `${lines.join('\n')}\n`;
}
