import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runValidationSuite } from './runner.ts';
import { loadTask, PROJECT_ROOT, resolveSolutionFile } from './tasks.ts';
import type { EvaluationReport, EvaluationResult, SuiteRun, TestCounts } from './types.ts';

const TOOL_VERSION = (
  JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')) as { version: string }
).version;

/** Maps test counts to an overall verdict. A run that errored or ran no tests is a FAIL. */
export function classifyResult(counts: TestCounts, error?: string): EvaluationResult {
  if (error !== undefined || counts.total === 0 || counts.passed === 0) return 'FAIL';
  if (counts.failed === 0 && counts.passed === counts.total) return 'PASS';
  return 'PARTIAL';
}

export interface EvaluateOptions {
  taskId: string;
  solutionId: string;
  timeoutMs?: number;
  /** Injectable for tests; defaults to running Vitest in a child process. */
  runSuite?: typeof runValidationSuite;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
}

/** Evaluates one bundled solution against its task's validation suite. */
export async function evaluate(options: EvaluateOptions): Promise<EvaluationReport> {
  const { taskId, solutionId, runSuite = runValidationSuite, now = () => new Date() } = options;

  const task = loadTask(taskId);
  const solutionFile = resolveSolutionFile(task, solutionId);

  const evaluatedAt = now();
  const startedAt = performance.now();
  const run: SuiteRun = await runSuite({
    testFile: task.testFile,
    solutionFile,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  const durationMs = Math.round(performance.now() - startedAt);

  return {
    schemaVersion: 1,
    tool: { name: 'agentops-lab', version: TOOL_VERSION },
    evaluationMode: 'predefined-solution',
    taskId,
    solution: { id: solutionId, file: path.relative(PROJECT_ROOT, solutionFile).split(path.sep).join('/') },
    evaluatedAt: evaluatedAt.toISOString(),
    durationMs,
    result: classifyResult(run.counts, run.error),
    tests: run.counts,
    testCases: run.testCases,
    ...(run.error === undefined ? {} : { error: run.error }),
  };
}
