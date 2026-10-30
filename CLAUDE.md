# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

AgentOps Lab evaluates code solutions against bundled tasks by running real test suites. In v0.1.0 it
evaluates **predefined** solutions only; there is no AI agent integration yet. See `docs/VISION.md` and
`docs/ROADMAP.md`.

## Rules

- **Never fabricate results or metrics.** Every reported number must come from an actual run. Do not add
  token, cost or "agent performance" figures that were not measured.
- **Keep documentation truthful.** If behaviour changes, update the README's capabilities and limitations
  in the same change. Planned features are labelled as planned.
- **Only execute bundled code.** Do not add options that accept arbitrary file paths, URLs or repositories
  until real isolation exists (roadmap v0.4.0).
- **Stay within the requested milestone.** Do not implement future roadmap items unprompted.
- **Deterministic tests:** no network, inject clocks, no order dependence.
- **No new dependencies** without a clear reason stated in the pull request.

## Code

- Node.js runs TypeScript directly via type stripping, so use erasable syntax only (no `enum`, `namespace`
  or parameter properties), and relative imports with `.ts` extensions.
- Strict TypeScript; no `any` unless justified.
- Module boundaries: `cli` → `evaluator` → `runner` / `tasks` / `reporter`.

## Before finishing

Run `npm run check`, then evaluate both bundled solutions:

```bash
npm run evaluate -- --task fix-auth-middleware --solution buggy
```

```bash
npm run evaluate -- --task fix-auth-middleware --solution reference
```

Work on a feature branch and open a pull request. Never merge or push to `main` without explicit
maintainer approval.
