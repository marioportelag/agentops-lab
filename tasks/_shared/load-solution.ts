import { pathToFileURL } from 'node:url';

/** Environment variable through which the evaluator passes the selected solution file. */
export const SOLUTION_FILE_ENV = 'AGENTOPS_SOLUTION_FILE';

/**
 * Imports the solution module selected by the evaluator.
 * Validation suites call this instead of importing an implementation directly,
 * so the same tests run unchanged against every solution.
 */
export async function loadSolution<Module>(): Promise<Module> {
  const file = process.env[SOLUTION_FILE_ENV];
  if (!file) {
    throw new Error(
      `${SOLUTION_FILE_ENV} is not set. Run task suites through the evaluator: npm run evaluate -- --task <id>`,
    );
  }
  return (await import(pathToFileURL(file).href)) as Module;
}
