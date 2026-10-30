import { describe, expect, it } from 'vitest';
import { listTaskIds, loadTask, resolveSolutionFile, TaskError } from '../src/tasks.ts';
import { createTaskFixture } from './helpers.ts';

const VALID_DEFINITION = JSON.stringify({
  id: 'sample-task',
  title: 'Sample',
  testFile: 'validation.test.ts',
  solutions: { reference: 'solution.ts' },
});

describe('bundled tasks', () => {
  it('lists fix-auth-middleware', () => {
    expect(listTaskIds()).toContain('fix-auth-middleware');
  });

  it('loads fix-auth-middleware with buggy and reference solutions', () => {
    const task = loadTask('fix-auth-middleware');

    expect(task.definition.id).toBe('fix-auth-middleware');
    expect(Object.keys(task.definition.solutions).sort()).toEqual(['buggy', 'reference']);
    expect(resolveSolutionFile(task, 'buggy')).toMatch(/tasks[/\\]fix-auth-middleware[/\\]buggy\.ts$/);
    expect(resolveSolutionFile(task, 'reference')).toMatch(/solution\.ts$/);
  });
});

describe('loadTask', () => {
  it.each(['../package', 'fix-auth-middleware/../..', '/etc', 'Fix-Auth', 'with space', ''])(
    'rejects an unsafe or malformed task ID (%j)',
    (taskId) => {
      expect(() => loadTask(taskId)).toThrow(TaskError);
    },
  );

  it('reports available tasks for an unknown ID', () => {
    expect(() => loadTask('does-not-exist')).toThrow(/Available tasks: .*fix-auth-middleware/);
  });

  it('rejects a solution path that escapes the task directory', () => {
    const tasksDir = createTaskFixture('sample-task', {
      'task.json': JSON.stringify({
        id: 'sample-task',
        title: 'Sample',
        testFile: 'validation.test.ts',
        solutions: { evil: '../../../package.json' },
      }),
      'validation.test.ts': '',
    });

    expect(() => loadTask('sample-task', tasksDir)).toThrow(/must stay inside the task directory/);
  });

  it('rejects a definition whose ID does not match its directory', () => {
    const tasksDir = createTaskFixture('sample-task', {
      'task.json': VALID_DEFINITION.replace('"sample-task"', '"other-task"'),
      'validation.test.ts': '',
      'solution.ts': '',
    });

    expect(() => loadTask('sample-task', tasksDir)).toThrow(/does not match/);
  });

  it('rejects invalid JSON and incomplete definitions', () => {
    const invalidJson = createTaskFixture('sample-task', { 'task.json': '{ not json' });
    const incomplete = createTaskFixture('sample-task', { 'task.json': '{"id":"sample-task"}' });

    expect(() => loadTask('sample-task', invalidJson)).toThrow(/not valid JSON/);
    expect(() => loadTask('sample-task', incomplete)).toThrow(/Invalid task definition/);
  });

  it('rejects a declared solution file that does not exist', () => {
    const tasksDir = createTaskFixture('sample-task', {
      'task.json': VALID_DEFINITION,
      'validation.test.ts': '',
    });

    expect(() => loadTask('sample-task', tasksDir)).toThrow(/Solution "reference" not found/);
  });
});

describe('resolveSolutionFile', () => {
  it('lists valid solutions for an unknown solution ID', () => {
    const task = loadTask('fix-auth-middleware');

    expect(() => resolveSolutionFile(task, 'agent')).toThrow(/Available: buggy, reference/);
  });

  it('does not treat inherited object properties as solutions', () => {
    const task = loadTask('fix-auth-middleware');

    expect(() => resolveSolutionFile(task, 'constructor')).toThrow(TaskError);
    expect(() => resolveSolutionFile(task, '__proto__')).toThrow(TaskError);
  });
});
