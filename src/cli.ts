import { realpathSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { evaluate } from './evaluator.ts';
import { DEFAULT_REPORTS_DIR, formatSummary, writeReport } from './reporter.ts';
import { listTaskIds, loadTask, TaskError } from './tasks.ts';

export const DEFAULT_SOLUTION = 'reference';

export const EXIT = { OK: 0, ERROR: 1, USAGE: 2 } as const;

const USAGE = `Usage: npm run evaluate -- --task <id> [--solution <id>] [--output-dir <dir>]
       npm run evaluate -- --list

Options:
  --task <id>          Task to evaluate (see --list)
  --solution <id>      Bundled solution to evaluate (default: ${DEFAULT_SOLUTION})
  --output-dir <dir>   Directory for the JSON report (default: reports/)
  --list               List bundled tasks and their solutions
  --help               Show this help

The exit code is 0 whenever an evaluation completes, whatever its result;
the verdict (PASS, PARTIAL or FAIL) is printed and stored in the report.`;

export interface CliIO {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

const processIO: CliIO = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

export type CliCommand =
  | { kind: 'help' }
  | { kind: 'list' }
  | { kind: 'evaluate'; taskId: string; solutionId: string; outputDir: string };

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

export function parseCliArgs(argv: string[]): CliCommand {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        task: { type: 'string' },
        solution: { type: 'string' },
        'output-dir': { type: 'string' },
        list: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    }));
  } catch (error) {
    throw new UsageError((error as Error).message);
  }

  if (values.help) return { kind: 'help' };
  if (values.list) return { kind: 'list' };
  if (!values.task) throw new UsageError('Missing required option --task');

  return {
    kind: 'evaluate',
    taskId: values.task,
    solutionId: values.solution ?? DEFAULT_SOLUTION,
    outputDir: values['output-dir'] ? path.resolve(values['output-dir']) : DEFAULT_REPORTS_DIR,
  };
}

function formatTaskList(): string {
  const lines = listTaskIds().map((taskId) => {
    const { definition } = loadTask(taskId);
    return `  ${taskId}\n    ${definition.title}\n    solutions: ${Object.keys(definition.solutions).join(', ')}`;
  });
  return `Bundled tasks:\n${lines.join('\n')}\n`;
}

/** Runs the CLI and returns the process exit code. */
export async function runCli(argv: string[], io: CliIO = processIO): Promise<number> {
  let command: CliCommand;
  try {
    command = parseCliArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.stderr(`Error: ${error.message}\n\n${USAGE}\n`);
    return EXIT.USAGE;
  }

  try {
    if (command.kind === 'help') {
      io.stdout(`${USAGE}\n`);
      return EXIT.OK;
    }
    if (command.kind === 'list') {
      io.stdout(formatTaskList());
      return EXIT.OK;
    }

    const report = await evaluate({ taskId: command.taskId, solutionId: command.solutionId });
    const reportFile = writeReport(report, command.outputDir);
    io.stdout(formatSummary(report, reportFile));
    return EXIT.OK;
  } catch (error) {
    if (error instanceof TaskError) {
      io.stderr(`Error: ${error.message}\n`);
      return EXIT.USAGE;
    }
    io.stderr(`Unexpected error: ${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT.ERROR;
  }
}

function isEntryPoint(): boolean {
  const invoked = process.argv[1];
  return invoked !== undefined && realpathSync(invoked) === realpathSync(import.meta.filename);
}

if (isEntryPoint()) {
  process.exitCode = await runCli(process.argv.slice(2));
}
