/**
 * Public contract for the `fix-auth-middleware` task.
 *
 * Every solution (defective, reference, or — in future versions — agent-produced)
 * must export a module of this shape. The types are deliberately framework-agnostic
 * so the task needs no web framework to run.
 */

export interface AuthenticatedUser {
  id: string;
}

export interface AuthRequest {
  /** Header names are lower-case, as in Node.js `IncomingMessage.headers`. */
  headers: Readonly<Record<string, string | undefined>>;
  /** Set by the middleware only when authentication succeeds. */
  user?: AuthenticatedUser;
}

export interface AuthResponse {
  status(code: number): AuthResponse;
  json(body: unknown): void;
}

export type NextFunction = () => void;

/** Returns the user for a valid token, or `null` for an invalid one. May throw. */
export type TokenVerifier = (token: string) => AuthenticatedUser | null;

export type AuthMiddleware = (req: AuthRequest, res: AuthResponse, next: NextFunction) => void;

export interface SolutionModule {
  createAuthMiddleware(verifyToken: TokenVerifier): AuthMiddleware;
}
