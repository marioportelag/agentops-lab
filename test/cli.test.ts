import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SOLUTION, EXIT, parseCliArgs, runCli } from '../src/cli.ts';
import { PROJECT_ROOT } from '../src/tasks.ts';
import type { EvaluationReport } from '../src/types.ts';
import { expectValidReport, tempDir } from './helpers.ts';

function captureIO() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { stdout: (text: string) => out.push(text), stderr: (text: string) => err.push(text) },
    stdout: () => out.join(''),
    stderr: () => err.join(''),
  };
}

describe('parseCliArgs', () => {
  it('defaults to the reference solution', () => {
    expect(parseCliArgs(['--task', 'fix-auth-middleware'])).toMatchObject({
      kind: 'evaluate',
      taskId: 'fix-auth-middleware',
      solutionId: DEFAULT_SOLUTION,
    });
  });

  it('accepts an explicit solution and output directory', () => {
    expect(parseCliArgs(['--task', 't', '--solution', 'buggy', '--output-dir', 'out'])).toEqual({
      kind: 'evaluate',
      taskId: 't',
      solutionId: 'buggy',
      outputDir: path.resolve('out'),
    });
  });
});

describe('runCli', () => {
  it.each([
    ['missing --task', []],
    ['unknown option', ['--task', 'fix-auth-middleware', '--repo', 'https://example.com/x.git']],
    ['positional argument', ['fix-auth-middleware']],
  ])('exits with a usage error on %s', async (_case, argv) => {
    const capture = captureIO();

    expect(await runCli(argv, capture.io)).toBe(EXIT.USAGE);
    expect(capture.stderr()).toContain('Usage:');
  });

  it('exits with a usage error for an unknown task or solution', async () => {
    const capture = captureIO();

    expect(await runCli(['--task', 'unknown-task'], capture.io)).toBe(EXIT.USAGE);
    expect(await runCli(['--task', 'fix-auth-middleware', '--solution', 'other'], capture.io)).toBe(
      EXIT.USAGE,
    );
    expect(capture.stderr()).toContain('Available tasks: fix-auth-middleware');
    expect(capture.stderr()).toContain('Available: buggy, reference');
  });

  it('lists bundled tasks', async () => {
    const capture = captureIO();

    expect(await runCli(['--list'], capture.io)).toBe(EXIT.OK);
    expect(capture.stdout()).toContain('fix-auth-middleware');
    expect(capture.stdout()).toContain('solutions: buggy, reference');
  });
});

describe('end-to-end evaluation (real Vitest runs)', () => {
  async function evaluateTo(solution: string) {
    const outputDir = tempDir();
    const capture = captureIO();
    const exitCode = await runCli(
      ['--task', 'fix-auth-middleware', '--solution', solution, '--output-dir', outputDir],
      capture.io,
    );
    const files = readdirSync(outputDir);
    expect(files).toHaveLength(1);
    const report: unknown = JSON.parse(readFileSync(path.join(outputDir, files[0]!), 'utf8'));
    expectValidReport(report);
    return { exitCode, report: report as EvaluationReport, stdout: capture.stdout() };
  }

  it('the reference solution passes every validation test', async () => {
    const { exitCode, report, stdout } = await evaluateTo('reference');

    expect(exitCode).toBe(EXIT.OK);
    expect(report.result).toBe('PASS');
    expect(report.tests.failed).toBe(0);
    expect(report.tests.passed).toBe(report.tests.total);
    expect(report.tests.total).toBeGreaterThan(0);
    expect(stdout).toContain('Result      PASS');
  });

  it('the buggy solution fails the rejection-path tests', async () => {
    const { exitCode, report } = await evaluateTo('buggy');

    expect(exitCode).toBe(EXIT.OK);
    expect(report.result).not.toBe('PASS');
    expect(report.tests.failed).toBeGreaterThan(0);
    expect(report.testCases).toContainEqual(
      expect.objectContaining({
        name: 'rejects a request without an Authorization header and does not call next',
        status: 'failed',
      }),
    );
  });

  it('runs as a standalone Node.js process', async () => {
    const { stdout } = await promisify(execFile)(process.execPath, ['src/cli.ts', '--help'], {
      cwd: PROJECT_ROOT,
    });

    expect(stdout).toContain('Usage: npm run evaluate');
  });
});
