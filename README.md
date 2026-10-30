<div align="center">

# AgentOps Lab

**Reproducible evaluations for code changes — built to grow into a lab for evaluating AI coding agents.**

[![CI](https://github.com/marioportelag/agentops-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/marioportelag/agentops-lab/actions/workflows/ci.yml)
![version](https://img.shields.io/badge/version-0.1.0-0d1117?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-0d1117?style=flat-square)

</div>

```text
task ──► solution ──► validation suite ──► verdict ──► JSON report
         (selected)   (isolated process)   PASS | PARTIAL | FAIL
```

> [!IMPORTANT]
> **v0.1.0 evaluates predefined code solutions bundled with each task — not AI agents.**
> There is no model integration, no token or cost accounting, and no agent performance data.
> Agent support is a planned milestone, described in the [roadmap](docs/ROADMAP.md).

---

## The problem

AI coding agents produce code changes quickly. Judging whether those changes are **correct, reliable,
secure and well-engineered** is still mostly manual: a reviewer reads the diff, maybe runs the tests, and
forms an opinion that is hard to reproduce or compare.

AgentOps Lab aims to make that judgement **measurable and repeatable**: a fixed task, a fixed validation
suite, an isolated run, and a structured result that can be stored, compared and audited. The long-term
goal is described in [docs/VISION.md](docs/VISION.md).

## What v0.1.0 does

- Runs a task's **validation test suite** (Vitest) against a **selected solution file**, in a separate
  Node.js process with a timeout.
- Ships one original task, [`fix-auth-middleware`](tasks/fix-auth-middleware/README.md): an authentication
  middleware that sends `401` but still lets the request through — with a **defective** and a **reference**
  implementation.
- Reports task ID, timestamp, solution, tests passed/failed/skipped, overall verdict and duration — on the
  console and as a **JSON report** in `reports/`.
- Derives every number from a real test run. Nothing is hardcoded or estimated.

## What it does not do (yet)

| Not in v0.1.0                                                 | Status                              |
| :------------------------------------------------------------ | :---------------------------------- |
| Run or integrate AI coding agents (Claude Code, Agent SDK, …) | Planned (v0.3.0)                    |
| Multiple tasks, comparisons between runs                      | Planned (v0.2.0)                    |
| Sandboxed execution (containers, no network, resource limits) | Planned (v0.4.0)                    |
| Web UI, history, dashboards                                   | Planned (v0.5.0)                    |
| Cloud execution, queues, persistence                          | Planned (v0.6.0)                    |
| Evaluate external repositories or arbitrary paths             | Out of scope by design              |
| Token usage, model cost, latency of an agent                  | Not measured — no agent is involved |

## How an evaluation works

1. **Resolve the task.** `--task` must match a directory under `tasks/` with a `task.json`. IDs are
   validated, and every path in `task.json` must stay inside the task directory.
2. **Select a solution.** `--solution` must be one of the solutions declared in `task.json`
   (`buggy` or `reference` for the bundled task). No other files can be selected.
3. **Run the validation suite.** The evaluator starts Vitest in a **child process**, passing the selected
   file through the `AGENTOPS_SOLUTION_FILE` environment variable. The suite imports the solution through
   a small loader, so the same tests run unchanged against every solution. A timeout (60 s) kills hung runs.
4. **Classify the result** from Vitest's JSON output:

   | Verdict   | Meaning                                                                         |
   | :-------- | :------------------------------------------------------------------------------ |
   | `PASS`    | Every test passed                                                               |
   | `PARTIAL` | At least one test passed and at least one did not                               |
   | `FAIL`    | No test passed, no tests ran, or the run errored (timeout, crash, load failure) |

5. **Report.** A summary is printed and a JSON report is written to `reports/`.

## Quick start

Requires **Node.js 22.18+** (24 LTS recommended, see `.nvmrc`). TypeScript runs directly through Node's
built-in type stripping, so there is no build step.

```bash
git clone https://github.com/marioportelag/agentops-lab.git
```

```bash
cd agentops-lab
```

```bash
npm ci
```

```bash
npm run evaluate -- --task fix-auth-middleware
```

## Commands

Evaluate the **reference** (corrected) solution — the default:

```bash
npm run evaluate -- --task fix-auth-middleware --solution reference
```

Evaluate the **defective** solution:

```bash
npm run evaluate -- --task fix-auth-middleware --solution buggy
```

List bundled tasks and their solutions:

```bash
npm run evaluate -- --list
```

Write the report somewhere other than `reports/`:

```bash
npm run evaluate -- --task fix-auth-middleware --solution buggy --output-dir /tmp/agentops-reports
```

Show all options:

```bash
npm run evaluate -- --help
```

The command exits with `0` whenever an evaluation completes — the verdict is in the output and the
report. It exits with `2` for invalid arguments or an unknown task/solution, and `1` for unexpected
errors.

## Example output

> [!NOTE]
> Illustrative. Timestamps, durations and report file names differ on every run; test counts are
> produced by the actual suite.

```text
  AgentOps Lab v0.1.0 · evaluation (predefined-solution)

  Task        fix-auth-middleware
  Solution    buggy (tasks/fix-auth-middleware/buggy.ts)
  Timestamp   2026-10-30T01:56:00.697Z
  Duration    634 ms
  Tests       2 passed · 8 failed · 0 skipped · 10 total
  Result      PARTIAL

    ✓ authenticates a valid bearer token and calls next exactly once
    ✗ rejects a request without an Authorization header and does not call next
    ✗ does not call the token verifier when the header is missing
    ✗ rejects a non-Bearer scheme
    ✗ rejects "Bearer" without a token
    ✗ rejects a header with extra segments
    ✗ rejects an invalid token and does not call next
    ✗ treats a throwing verifier as an invalid token instead of crashing
    ✗ accepts the scheme case-insensitively (RFC 7235)
    ✓ leaves req.user unset when authentication fails

  Report      reports/fix-auth-middleware.buggy.2026-10-30T01-56-00-697Z.json
```

The `reference` solution passes all 10 tests (`Result PASS`). An abridged report:

```json
{
  "schemaVersion": 1,
  "tool": { "name": "agentops-lab", "version": "0.1.0" },
  "evaluationMode": "predefined-solution",
  "taskId": "fix-auth-middleware",
  "solution": { "id": "buggy", "file": "tasks/fix-auth-middleware/buggy.ts" },
  "evaluatedAt": "2026-10-30T01:56:00.697Z",
  "durationMs": 634,
  "result": "PARTIAL",
  "tests": { "total": 10, "passed": 2, "failed": 8, "skipped": 0 },
  "testCases": [
    {
      "name": "rejects a request without an Authorization header and does not call next",
      "status": "failed",
      "durationMs": 6,
      "failureMessage": "AssertionError: expected 2 to be 1 // Object.is equality"
    }
  ]
}
```

`durationMs` is the wall-clock time of the validation run, including starting the child process.

## Project structure

```text
agentops-lab/
├── src/
│   ├── cli.ts              # Argument parsing, exit codes, entry point
│   ├── evaluator.ts        # Orchestrates one evaluation; verdict classification
│   ├── runner.ts           # Runs Vitest in a child process; parses its JSON output
│   ├── tasks.ts            # Task discovery and validation (path containment)
│   ├── reporter.ts         # Console summary and JSON report files
│   └── types.ts            # Shared types, including the report schema
├── tasks/
│   ├── vitest.config.ts    # Vitest configuration used for task runs
│   ├── _shared/
│   │   └── load-solution.ts
│   └── fix-auth-middleware/
│       ├── README.md       # Scenario, requirements, known defects
│       ├── task.json       # Task metadata: test file and solutions
│       ├── contract.ts     # Interface every solution implements
│       ├── buggy.ts        # Deliberately defective implementation
│       ├── solution.ts     # Reference implementation
│       ├── conformance.ts  # Compile-time check that both satisfy the contract
│       └── validation.test.ts
├── test/                   # Tests for the evaluator itself
├── reports/                # Generated JSON reports (git-ignored)
├── docs/
│   ├── VISION.md
│   ├── ROADMAP.md
│   └── DEVELOPMENT.md
├── .github/workflows/ci.yml
├── CLAUDE.md               # Project conventions for Claude Code
└── LICENSE
```

## Design decisions

- **Child-process isolation for task runs.** A defective solution can throw on import, loop forever or
  pollute global state. Running each suite in its own process with a hard timeout keeps the evaluator
  reliable. Task suites use Vitest's `threads` pool so the timeout also stops the workers. This is
  **robustness, not a security sandbox** — see [limitations](#current-limitations).
- **Solutions are injected, not edited.** The validation suite loads the solution named by the evaluator
  instead of importing a fixed file. Tests stay identical across solutions, and future agent-produced
  solutions can plug into the same mechanism.
- **Bundled, declared fixtures only.** The CLI accepts a task ID and a declared solution ID, never a path
  or URL, so it only ever executes code that lives in this repository.
- **Typed task contracts.** Each task defines a `contract.ts`, and `conformance.ts` makes `npm run typecheck`
  fail if any bundled solution drifts from it.
- **A versioned, honest report.** `schemaVersion` allows the format to evolve. `evaluationMode:
"predefined-solution"` records what was actually evaluated.
- **No build step, minimal dependencies.** Node.js runs TypeScript directly via type stripping, and the
  CLI uses `node:util` `parseArgs`. There are no runtime dependencies. The dev dependencies are
  TypeScript, Vitest, `@types/node` and Prettier.

## Testing

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run format:check
```

```bash
npm run check
```

`npm run check` runs all three. The test suite (42 tests) covers:

- **Task loading:** rejects unsafe IDs, path escapes, malformed definitions and unknown solutions.
- **Verdicts:** `PASS`, `PARTIAL` and `FAIL` classification, including errors and empty runs.
- **Reports:** Vitest output parsing, report writing (never overwriting), JSON round-trip and summary
  formatting.
- **CLI:** parsing, exit codes and task listing.
- **End to end:** **real evaluations** of both bundled solutions, checking that `reference` passes, that
  `buggy` does not, and that the reports are valid.
- **Failure handling:** a solution that throws on import, and a hanging solution stopped by the timeout.

## Current limitations

- **No AI agents.** Only predefined solutions bundled with a task are evaluated.
- **One task.** Results are only meaningful within `fix-auth-middleware`. There is no aggregation or
  comparison across runs yet.
- **Not a sandbox.** Solutions run as ordinary Node.js code with the user's permissions: file system and
  network access, no CPU or memory limits. This is acceptable only because every solution is part of this
  repository and reviewed. Strong isolation is planned for v0.4.0.
- **Correctness only.** The verdict reflects functional tests. Security, reliability and code-quality
  dimensions are part of the vision, not of v0.1.0.
- **Runtime coupling.** Task suites must be TypeScript and run on Vitest.

## Roadmap

These are aspirational milestones, not promises — see [docs/ROADMAP.md](docs/ROADMAP.md) for scope and
exit criteria.

| Version    | Theme                                                                         |
| :--------- | :---------------------------------------------------------------------------- |
| **v0.1.0** | ✅ Minimal CLI, one task, real test execution, JSON reports                   |
| v0.2.0     | Multiple evaluation tasks and result comparison                               |
| v0.3.0     | Agent adapter interface; integration with Claude Code or the Claude Agent SDK |
| v0.4.0     | Isolated execution environments and stronger security boundaries              |
| v0.5.0     | Web dashboard and evaluation history                                          |
| v0.6.0     | AWS Lambda, SQS and DynamoDB for asynchronous processing                      |
| v1.0.0     | A reliable, extensible agent evaluation platform                              |

## How Claude Code is used

AgentOps Lab is developed with [Claude Code](https://claude.com/claude-code) as a pair programmer, under
explicit human direction and review:

- Each milestone starts as a written request with scope, constraints and acceptance criteria.
- Claude Code implements on a feature branch, runs the type checker, tests and CLI, and opens a pull
  request. **Merges are done by the maintainer** after review.
- [`CLAUDE.md`](CLAUDE.md) records project conventions — honesty about capabilities, deterministic tests,
  no hardcoded results — so every session starts from the same rules.
- Commits produced with Claude Code carry a `Co-Authored-By` trailer.

Using an AI agent to build a tool for evaluating AI agents is intentional. The project should hold its own
development to the standards it aims to measure.

## Contributing

The project is early, and contributions are welcome — please open an issue to discuss larger changes first.

- Read [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for setup, conventions and **how to add a task**.
- Keep pull requests small and focused, and make sure `npm run check` passes.
- New tasks must be original, deterministic, self-contained, and include a defective and a reference
  solution, plus a task README.
- Never add features that fabricate metrics. Every reported number must come from an actual run.

## License

[MIT](LICENSE) © 2026 Mario Portela
