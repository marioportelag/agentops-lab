import type { SolutionModule } from './contract.ts';
import * as buggy from './buggy.ts';
import * as reference from './solution.ts';

/** Compile-time check (`npm run typecheck`): every bundled solution satisfies the task contract. */
export const solutions = { buggy, reference } satisfies Record<string, SolutionModule>;
