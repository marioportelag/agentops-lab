import type { AuthenticatedUser, AuthMiddleware, AuthResponse, TokenVerifier } from './contract.ts';

/** Reference fix for the `fix-auth-middleware` task. */
export function createAuthMiddleware(verifyToken: TokenVerifier): AuthMiddleware {
  return (req, res, next) => {
    const token = extractBearerToken(req.headers['authorization']);
    if (token === null) {
      reject(res);
      return;
    }

    let user: AuthenticatedUser | null;
    try {
      user = verifyToken(token);
    } catch {
      // A verifier failure is treated as an invalid token; details are not exposed.
      reject(res);
      return;
    }

    if (user === null) {
      reject(res);
      return;
    }

    req.user = user;
    next();
  };
}

/** Returns the token from `Bearer <token>` (scheme is case-insensitive), or null. */
function extractBearerToken(header: string | undefined): string | null {
  if (header === undefined) return null;

  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2) return null;

  const [scheme, token] = parts;
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

function reject(res: AuthResponse): void {
  res.status(401).json({ error: 'unauthorized' });
}
