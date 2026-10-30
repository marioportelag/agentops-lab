import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ResolvedTask, TaskDefinition } from './types.ts';

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
export const TASKS_DIR = path.join(PROJECT_ROOT, 'tasks');

const TASK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class TaskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskError';
  }
}

/** Resolves a path inside `baseDir`, refusing anything that would escape it. */
function resolveInside(baseDir: string, relativePath: string, label: string): string {
  const resolved = path.resolve(baseDir, relativePath);
  if (!resolved.startsWith(baseDir + path.sep)) {
    throw new TaskError(`${label} must stay inside the task directory: ${relativePath}`);
  }
  if (!existsSync(resolved)) {
    throw new TaskError(`${label} not found: ${path.relative(PROJECT_ROOT, resolved)}`);
  }
  return resolved;
}

function parseDefinition(raw: unknown, file: string): TaskDefinition {
  const candidate = raw as Partial<TaskDefinition> | null;
  const solutions = candidate?.solutions;

  if (
    typeof candidate?.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.testFile !== 'string' ||
    typeof solutions !== 'object' ||
    solutions === null ||
    Object.keys(solutions).length === 0 ||
    !Object.values(solutions).every((value) => typeof value === 'string')
  ) {
    throw new TaskError(`Invalid task definition: ${path.relative(PROJECT_ROOT, file)}`);
  }

  return { id: candidate.id, title: candidate.title, testFile: candidate.testFile, solutions };
}

/** Lists the IDs of bundled tasks (directories under tasks/ containing a task.json). */
export function listTaskIds(tasksDir = TASKS_DIR): string[] {
  return readdirSync(tasksDir)
    .filter((entry) => TASK_ID_PATTERN.test(entry))
    .filter((entry) => existsSync(path.join(tasksDir, entry, 'task.json')))
    .sort();
}

/** Loads and validates a bundled task. Only tasks inside this repository can be loaded. */
export function loadTask(taskId: string, tasksDir = TASKS_DIR): ResolvedTask {
  if (!TASK_ID_PATTERN.test(taskId)) {
    throw new TaskError(`Invalid task ID "${taskId}". Use lower-case letters, digits and hyphens.`);
  }

  const directory = path.join(tasksDir, taskId);
  const definitionFile = path.join(directory, 'task.json');
  if (!existsSync(directory) || !statSync(directory).isDirectory() || !existsSync(definitionFile)) {
    const available = listTaskIds(tasksDir).join(', ') || 'none';
    throw new TaskError(`Unknown task "${taskId}". Available tasks: ${available}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(definitionFile, 'utf8'));
  } catch {
    throw new TaskError(`Task definition is not valid JSON: ${path.relative(PROJECT_ROOT, definitionFile)}`);
  }

  const definition = parseDefinition(raw, definitionFile);
  if (definition.id !== taskId) {
    throw new TaskError(`Task definition ID "${definition.id}" does not match its directory "${taskId}"`);
  }

  const testFile = resolveInside(directory, definition.testFile, 'Validation suite');
  for (const [solutionId, file] of Object.entries(definition.solutions)) {
    resolveInside(directory, file, `Solution "${solutionId}"`);
  }

  return { definition, directory, testFile };
}

/** Returns the absolute path of a declared solution, or throws listing the valid choices. */
export function resolveSolutionFile(task: ResolvedTask, solutionId: string): string {
  const file = Object.hasOwn(task.definition.solutions, solutionId)
    ? task.definition.solutions[solutionId]
    : undefined;

  if (file === undefined) {
    const available = Object.keys(task.definition.solutions).join(', ');
    throw new TaskError(
      `Unknown solution "${solutionId}" for task "${task.definition.id}". Available: ${available}`,
    );
  }
  return resolveInside(task.directory, file, `Solution "${solutionId}"`);
}
