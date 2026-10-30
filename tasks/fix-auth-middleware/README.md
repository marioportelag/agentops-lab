# Task: `fix-auth-middleware`

## Scenario

An API protects its routes with a Bearer-token middleware. When a request is rejected, the middleware
sends a `401` response — but it does not stop. It still calls `next()`, so the protected handler runs
for unauthenticated callers. This exact class of defect appears in real Express code bases, where a
missing `return` after `res.status(401).json(...)` is easy to overlook in review.

## Files

| File                 | Purpose                                                           |
| :------------------- | :---------------------------------------------------------------- |
| `contract.ts`        | Framework-agnostic types every solution must implement            |
| `buggy.ts`           | The defective starting point (kept intentionally broken)          |
| `solution.ts`        | Reference fix                                                     |
| `validation.test.ts` | Deterministic acceptance tests, run against the selected solution |
| `task.json`          | Task metadata used by the evaluator                               |

## Requirements

`createAuthMiddleware(verifyToken)` returns `(req, res, next) => void` that:

1. Accepts only `Authorization: Bearer <token>` — exactly two parts, scheme case-insensitive.
2. Calls `verifyToken(token)`; a `null` result **or a thrown error** means the token is invalid.
3. On success: sets `req.user` to the verified user and calls `next()` exactly once, sending no response.
4. On any failure: responds once with `401` and `{ "error": "unauthorized" }`, **does not call `next()`**,
   leaves `req.user` unset, and does not call the verifier when there is no usable token.

## Defects in `buggy.ts`

- No `return` after sending `401`, so `next()` still runs (and a missing header can produce two responses).
- The verifier is called even when the header is missing.
- The scheme check is case-sensitive and extra header segments are ignored.
- Exceptions thrown by the verifier propagate instead of producing a `401`.

## Run

```bash
npm run evaluate -- --task fix-auth-middleware --solution buggy
```

```bash
npm run evaluate -- --task fix-auth-middleware --solution reference
```
