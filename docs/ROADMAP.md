# Roadmap

> These milestones are **aspirational**. They describe intended direction, not completed or committed
> functionality. Scope will change as the project learns. Only v0.1.0 is implemented.

## ✅ v0.1.0 — Minimal MVP (current)

- CLI: `npm run evaluate -- --task <id> --solution <id>`
- One original task, `fix-auth-middleware`, with defective and reference solutions
- Validation suite run with Vitest in a child process with a timeout
- Verdicts: `PASS` / `PARTIAL` / `FAIL`, with a versioned JSON report
- CI: format check, type check, tests, and evaluation of both bundled solutions

## v0.2.0 — Multiple tasks and result comparison

- Three to five additional original tasks covering different defect classes (input validation, error
  handling, concurrency, injection)
- `--all` to evaluate every task, plus an aggregated summary
- `compare` command that diffs two reports, or two report sets (per-test regressions and improvements)
- A published JSON Schema for the report format

**Exit criteria:** evaluating all tasks is reproducible across machines, and comparisons explain every
change in verdict.

## v0.3.0 — Agent adapter interface

- An `AgentAdapter` interface: given a task workspace and instructions, produce a candidate solution
- A first adapter for Claude Code or the Claude Agent SDK, opt-in and requiring the user's own credentials
- Reports record the agent configuration and, where the agent provides them, token usage and timing.
  These are reported as measured values only, never estimated.

**Exit criteria:** an agent-produced solution is evaluated with the same suite and report format as a
predefined one.

## v0.4.0 — Isolated execution and security boundaries

- Run candidate solutions in disposable containers: no network, read-only base image, CPU, memory and
  time limits, non-root
- Static checks alongside tests (type safety, dependency audit, secret scanning)
- Threat model documented in `SECURITY.md`

**Exit criteria:** a deliberately malicious solution cannot affect the host or other evaluations.

## v0.5.0 — Web dashboard and evaluation history

- Persistent storage of reports
- A read-only dashboard: runs over time, per-task trends, side-by-side comparisons

## v0.6.0 — Asynchronous processing on AWS

- Submit evaluations through an API, queue them on SQS, execute in isolated workers (for example Lambda
  for short static checks, containers for test runs), and store results in DynamoDB
- Infrastructure as code, cost controls, observability

## v1.0.0 — Reliable, extensible agent evaluation platform

- Stable task, adapter and report formats with documented versioning
- A plugin model for third-party tasks and scorers, gated by the isolation work in v0.4.0
- Documentation good enough for others to run their own evaluations
