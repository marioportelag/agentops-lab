import type { AuthMiddleware, TokenVerifier } from './contract.ts';

/**
 * DELIBERATELY DEFECTIVE implementation — the starting point of the task.
 * Do not fix this file; `solution.ts` is the reference fix.
 */
export function createAuthMiddleware(verifyToken: TokenVerifier): AuthMiddleware {
  return (req, res, next) => {
    const header = req.headers['authorization'];

    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'unauthorized' });
    }

    const token = header?.split(' ')[1] ?? '';
    const user = verifyToken(token);

    if (!user) {
      res.status(401).json({ error: 'unauthorized' });
    }

    if (user) req.user = user;
    next();
  };
}
