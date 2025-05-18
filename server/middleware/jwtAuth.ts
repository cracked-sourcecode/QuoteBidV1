import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware to authenticate requests using a JWT token.
 * If a valid token is present in the Authorization header,
 * the corresponding user is loaded and attached to `req.user`.
 * This allows existing `req.isAuthenticated()` checks to work
 * even without a session.
 */
export async function jwtAuth(req: Request, _res: Response, next: NextFunction) {
  if (req.user) return next();

  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'quotebid_secret') as { id: number };
    const [user] = await getDb().select().from(users).where(eq(users.id, payload.id));
    if (user) {
      // Assign user so `req.isAuthenticated()` returns true
      (req as any).user = user;
    }
  } catch (err) {
    // Ignore invalid token
  }

  next();
}
