import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SOLUTION_FILE_ENV } from '../tasks/_shared/load-solution.ts';
import { PROJECT_ROOT, TASKS_DIR } from './tasks.ts';
import type { SuiteRun, TestCaseResult, TestCounts, TestStatus } from './types.ts';

export const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_ERROR_OUTPUT = 2_000;

interface VitestJsonReport {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests?: number;
  testResults: {
    status: string;
    message?: string;
    assertionResults: {
      fullName?: string;
      title: string;
      status: string;
      duration?: number | null;
      failureMessages?: string[];
    }[];
  }[];
}

function vitestEntryPoint(): string {
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve('vitest/package.json');
  const { bin } = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    bin: string | Record<string, string>;
  };
  const relativeBin = typeof bin === 'string' ? bin : bin['vitest'];
  if (!relativeBin) throw new Error('Unable to locate the vitest executable');
  return path.join(path.dirname(packageJsonPath), relativeBin);
}

function toStatus(status: string): TestStatus {
  if (status === 'passed') return 'passed';
  if (status === 'failed') return 'failed';
  return 'skipped';
}

function firstLine(message: string | undefined): string | undefined {
  return message
    ?.split('\n')
    .find((line) => line.trim() !== '')
    ?.trim();
}

/** Converts Vitest's JSON reporter output into the evaluator's model. */
export function parseVitestReport(report: VitestJsonReport): SuiteRun {
  const testCases: TestCaseResult[] = report.testResults.flatMap((file) =>
    file.assertionResults.map((assertion) => {
      const status = toStatus(assertion.status);
      const failureMessage = status === 'failed' ? firstLine(assertion.failureMessages?.[0]) : undefined;
      return {
        name: assertion.title,
        status,
        durationMs: Math.round(assertion.duration ?? 0),
        ...(failureMessage ? { failureMessage } : {}),
      };
    }),
  );

  const counts: TestCounts = {
    total: report.numTotalTests,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    skipped: report.numPendingTests + (report.numTodoTests ?? 0),
  };

  // A suite can fail to load (e.g. the solution throws on import) without any test results.
  const loadFailure = report.testResults.find(
    (file) => file.status === 'failed' && file.assertionResults.length === 0,
  );
  const error = loadFailure
    ? `Validation suite failed to load: ${firstLine(loadFailure.message) ?? 'unknown error'}`
    : undefined;

  return { counts, testCases, ...(error ? { error } : {}) };
}

/**
 * Runs a task's validation suite against one solution file in a separate Node.js process,
 * so a broken or hanging solution cannot affect the evaluator itself.
 */
export async function runValidationSuite(options: {
  testFile: string;
  solutionFile: string;
  timeoutMs?: number;
}): Promise<SuiteRun> {
  const outputDir = mkdtempSync(path.join(tmpdir(), 'agentops-'));
  const outputFile = path.join(outputDir, 'vitest-report.json');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const { exitCode, stderr, timedOut } = await new Promise<{
      exitCode: number | null;
      stderr: string;
      timedOut: boolean;
    }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          vitestEntryPoint(),
          'run',
          '--config',
          path.join(TASKS_DIR, 'vitest.config.ts'),
          '--reporter=json',
          '--outputFile',
          outputFile,
          options.testFile,
        ],
        {
          cwd: PROJECT_ROOT,
          env: { ...process.env, [SOLUTION_FILE_ENV]: options.solutionFile, CI: 'true' },
          stdio: ['ignore', 'ignore', 'pipe'],
        },
      );

      let stderrOutput = '';
      let didTimeOut = false;
      const timer = setTimeout(() => {
        didTimeOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stderr.on('data', (chunk: Buffer) => {
        if (stderrOutput.length < MAX_ERROR_OUTPUT) stderrOutput += chunk.toString();
      });
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ exitCode: code, stderr: stderrOutput, timedOut: didTimeOut });
      });
    });

    if (timedOut) {
      return emptyRun(`Validation suite timed out after ${timeoutMs} ms`);
    }

    let report: VitestJsonReport;
    try {
      report = JSON.parse(readFileSync(outputFile, 'utf8')) as VitestJsonReport;
    } catch {
      const detail = stderr.trim().slice(0, MAX_ERROR_OUTPUT) || `exit code ${String(exitCode)}`;
      return emptyRun(`Validation suite produced no readable results: ${detail}`);
    }

    return parseVitestReport(report);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
}

function emptyRun(error: string): SuiteRun {
  return { counts: { total: 0, passed: 0, failed: 0, skipped: 0 }, testCases: [], error };
}
