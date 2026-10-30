import { describe, expect, it, vi } from 'vitest';
import { loadSolution } from '../_shared/load-solution.ts';
import type { AuthenticatedUser, AuthRequest, AuthResponse, SolutionModule } from './contract.ts';

const { createAuthMiddleware } = await loadSolution<SolutionModule>();

const VALID_TOKEN = 'valid-token';
const USER: AuthenticatedUser = { id: 'user-42' };

/** Deterministic in-memory verifier: only VALID_TOKEN is accepted. */
const verifier = () => vi.fn((token: string) => (token === VALID_TOKEN ? USER : null));

interface RecordedResponse extends AuthResponse {
  statusCode: number | undefined;
  body: unknown;
  sendCount: number;
}

function recordResponse(): RecordedResponse {
  const res: RecordedResponse = {
    statusCode: undefined,
    body: undefined,
    sendCount: 0,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      res.sendCount += 1;
    },
  };
  return res;
}

function run(authorization: string | undefined, verifyToken = verifier()) {
  const req: AuthRequest = { headers: { authorization } };
  const res = recordResponse();
  const next = vi.fn();
  createAuthMiddleware(verifyToken)(req, res, next);
  return { req, res, next, verifyToken };
}

function expectRejected({ req, res, next }: ReturnType<typeof run>) {
  expect(res.statusCode).toBe(401);
  expect(res.body).toEqual({ error: 'unauthorized' });
  expect(res.sendCount).toBe(1);
  expect(next).not.toHaveBeenCalled();
  expect(req.user).toBeUndefined();
}

describe('fix-auth-middleware', () => {
  it('authenticates a valid bearer token and calls next exactly once', () => {
    const outcome = run(`Bearer ${VALID_TOKEN}`);

    expect(outcome.next).toHaveBeenCalledTimes(1);
    expect(outcome.req.user).toEqual(USER);
    expect(outcome.res.sendCount).toBe(0);
  });

  it('rejects a request without an Authorization header and does not call next', () => {
    expectRejected(run(undefined));
  });

  it('does not call the token verifier when the header is missing', () => {
    const { verifyToken } = run(undefined);

    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('rejects a non-Bearer scheme', () => {
    expectRejected(run(`Basic ${VALID_TOKEN}`));
  });

  it('rejects "Bearer" without a token', () => {
    expectRejected(run('Bearer'));
  });

  it('rejects a header with extra segments', () => {
    expectRejected(run(`Bearer ${VALID_TOKEN} extra`));
  });

  it('rejects an invalid token and does not call next', () => {
    expectRejected(run('Bearer forged-token'));
  });

  it('treats a throwing verifier as an invalid token instead of crashing', () => {
    const throwing = vi.fn(() => {
      throw new Error('signature check failed: key material unavailable');
    });

    expectRejected(run(`Bearer ${VALID_TOKEN}`, throwing));
  });

  it('accepts the scheme case-insensitively (RFC 7235)', () => {
    const outcome = run(`bearer ${VALID_TOKEN}`);

    expect(outcome.next).toHaveBeenCalledTimes(1);
    expect(outcome.req.user).toEqual(USER);
    expect(outcome.res.sendCount).toBe(0);
  });

  it('leaves req.user unset when authentication fails', () => {
    const { req } = run('Bearer forged-token');

    expect(req.user).toBeUndefined();
  });
});
