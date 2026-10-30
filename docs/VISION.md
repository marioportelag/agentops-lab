# Vision

## Why this project exists

AI coding agents now write meaningful amounts of production code. The open question is no longer
_whether_ they can produce a change, but **how good that change is** — and how we would know.

Today that judgement is mostly informal: a reviewer reads a diff, maybe runs the tests, and forms an
opinion. That does not scale, is hard to reproduce, and makes it difficult to compare agents, prompts,
models or configurations with any confidence.

## What AgentOps Lab aims to become

An open-source platform that evaluates code changes produced by AI coding agents through **reproducible
evaluations**:

- **Correctness:** does the change satisfy the task's acceptance tests, including the edge cases?
- **Reliability:** does it behave consistently across runs, environments and inputs?
- **Security:** does it avoid introducing vulnerabilities (injection, auth bypass, secret leakage, unsafe
  defaults)?
- **Engineering quality:** is the change typed, tested, maintainable and proportionate to the task?

Each evaluation should be **reproducible** (same task, same inputs, same verdict), **auditable** (a stored
report explains the result), and **honest** (no metric is shown unless it was actually measured).

## Principles

1. **Measure, don't estimate.** Every number in a report comes from an actual run.
2. **Small, owned tasks.** Tasks are original, self-contained and deterministic. No scraped benchmarks,
   no network dependencies.
3. **Isolation grows with capability.** Running agent-produced code safely requires real sandboxing. The
   platform will not accept untrusted code before it can contain it.
4. **Clear boundaries.** Each part has one job: tasks, runners, agent adapters, scoring and storage.
5. **Useful at every version.** Each milestone is a working tool, not a scaffold.

## Where v0.1.0 stands

v0.1.0 is the smallest honest version of this idea. It evaluates **predefined** solutions, a defective one
and a reference one, against one task's validation suite, in a child process, and writes a JSON report.
It deliberately contains **no AI integration**. The [roadmap](ROADMAP.md) describes how it could grow
from here.
