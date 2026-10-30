# Development

## Setup

- Node.js **22.18+** (24 LTS recommended; `.nvmrc` pins 24)
- npm (bundled with Node.js)

```bash
npm ci
```

There is no build step. Node.js executes the TypeScript sources directly using
[type stripping](https://nodejs.org/api/typescript.html#type-stripping). The compiler is used only for
type checking.

## Commands

| Command                                             | Purpose                                                             |
| :-------------------------------------------------- | :------------------------------------------------------------------ |
| `npm run evaluate -- --task <id> [--solution <id>]` | Run an evaluation                                                   |
| `npm test`                                          | Project tests (Vitest), including real end-to-end evaluations       |
| `npm run typecheck`                                 | `tsc --noEmit` in strict mode, including task contract conformance  |
| `npm run format` / `npm run format:check`           | Prettier                                                            |
| `npm run check`                                     | Format check, type check and tests (what CI runs, plus evaluations) |

## Conventions

- **TypeScript:** `strict`, `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`. Use only
  _erasable_ syntax (`erasableSyntaxOnly`): no `enum`, `namespace` or constructor parameter properties,
  because Node's type stripping cannot run them. Relative imports use the `.ts` extension.
- **Module boundaries:** `cli` handles I/O and arguments → `evaluator` orchestrates → `runner` executes
  Vitest → `reporter` handles output. `tasks` owns task discovery and validation. Keep logic out of
  `cli.ts`.
- **Tests are deterministic:** no network, no real clocks in assertions (inject `now`), no reliance on test
  order.
- **Honest output:** never print or store a value that was not measured.

## Adding a task

1. Create `tasks/<task-id>/`, where the ID uses lower-case letters, digits and hyphens.
2. Add:
   - `README.md`: scenario, requirements and the defects in the buggy version
   - `contract.ts`: the interface every solution exports
   - `buggy.ts` and `solution.ts`: the defective and reference implementations
   - `conformance.ts`: `export const solutions = { buggy, reference } satisfies Record<string, SolutionModule>;`
   - `validation.test.ts`: loads the implementation with
     `const impl = await loadSolution<SolutionModule>();` from `../_shared/load-solution.ts`
   - `task.json`:

     ```json
     {
       "id": "<task-id>",
       "title": "One-line description",
       "testFile": "validation.test.ts",
       "solutions": { "buggy": "buggy.ts", "reference": "solution.ts" }
     }
     ```

3. Check that the reference solution produces `PASS` and the buggy one does not:

   ```bash
   npm run evaluate -- --task <task-id> --solution reference
   ```

   ```bash
   npm run evaluate -- --task <task-id> --solution buggy
   ```

4. Make sure the suite is deterministic and runs in well under a second. Run it several times.

Task code must be original and self-contained, with no network access and no external services.

## Pull requests

- Branch from `main` and keep changes focused.
- `npm run check` must pass, and CI must be green.
- Update documentation, including the README's capabilities and limitations, when behaviour changes.
