import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that ensures the request is authenticated via
 * either Passport session or JWT-based auth. It relies on the
 * `jwtAuth` middleware having already attached `req.user` when
 * a valid token is supplied.
 */
export function ensureAuth(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next();
  if (typeof (req as any).isAuthenticated === 'function' && (req as any).isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
}
