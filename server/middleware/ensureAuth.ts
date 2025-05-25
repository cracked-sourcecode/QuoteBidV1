import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that ensures the request is authenticated via
 * either Passport session or JWT-based auth. It relies on the
 * `jwtAuth` middleware having already attached `req.user` when
 * a valid token is supplied.
 */
export function ensureAuth(req: Request, res: Response, next: NextFunction) {
  console.log('[ensureAuth] Checking authentication...');
  console.log('[ensureAuth] req.user:', req.user ? 'exists' : 'missing');
  console.log('[ensureAuth] Authorization header:', req.headers['authorization']);
  
  if (req.user) {
    console.log('[ensureAuth] User authenticated via JWT/session');
    return next();
  }
  if (typeof (req as any).isAuthenticated === 'function' && (req as any).isAuthenticated()) {
    console.log('[ensureAuth] User authenticated via Passport session');
    return next();
  }
  console.log('[ensureAuth] User not authenticated, returning 401');
  return res.status(401).json({ message: 'Unauthorized' });
}
