/** PASS: every test passed. PARTIAL: some passed, some failed. FAIL: none passed, or the run did not complete. */
export type EvaluationResult = 'PASS' | 'PARTIAL' | 'FAIL';

export type TestStatus = 'passed' | 'failed' | 'skipped';

/** Metadata read from `tasks/<id>/task.json`. */
export interface TaskDefinition {
  id: string;
  title: string;
  /** Validation suite, relative to the task directory. */
  testFile: string;
  /** Solution identifier -> implementation file, relative to the task directory. */
  solutions: Record<string, string>;
}

/** A task with absolute, validated paths. */
export interface ResolvedTask {
  definition: TaskDefinition;
  directory: string;
  testFile: string;
}

export interface TestCaseResult {
  name: string;
  status: TestStatus;
  durationMs: number;
  /** First failure message, if the test failed. */
  failureMessage?: string;
}

export interface TestCounts {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

/** Raw outcome of running a validation suite. */
export interface SuiteRun {
  counts: TestCounts;
  testCases: TestCaseResult[];
  /** Set when the suite could not run to completion (timeout, crash, unreadable output). */
  error?: string;
}

/** The JSON document written to `reports/`. */
export interface EvaluationReport {
  schemaVersion: 1;
  tool: { name: 'agentops-lab'; version: string };
  /** v0.1.0 evaluates predefined solution files bundled with the task, not AI agents. */
  evaluationMode: 'predefined-solution';
  taskId: string;
  solution: { id: string; file: string };
  evaluatedAt: string;
  durationMs: number;
  result: EvaluationResult;
  tests: TestCounts;
  testCases: TestCaseResult[];
  error?: string;
}
