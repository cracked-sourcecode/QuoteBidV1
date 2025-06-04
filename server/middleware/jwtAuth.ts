import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import cookie from 'cookie';
import { verifyToken } from '../lib/jwt';

/**
 * Middleware to authenticate requests using a JWT token.
 * If a valid token is present in the Authorization header,
 * the corresponding user is loaded and attached to `req.user`.
 * This allows existing `req.isAuthenticated()` checks to work
 * even without a session.
 */
export async function jwtAuth(req: Request, _res: Response, next: NextFunction) {
  console.log('[jwtAuth] Checking for JWT token...');
  console.log('[jwtAuth] URL:', req.url);
  
  // Skip if user is already authenticated (e.g., via session)
  if (req.user) {
    console.log('[jwtAuth] User already authenticated via session, skipping JWT check');
    return next();
  }

  const authHeader = req.headers['authorization'];
  console.log('[jwtAuth] Authorization header:', authHeader);
  
  let token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  if (!token && req.headers.cookie) {
    const cookies = cookie.parse(req.headers.cookie);
    token = cookies.token;
    console.log('[jwtAuth] Token from cookie:', token ? 'found' : 'not found');
  }

  // Check for token in query parameters as fallback (for invoice downloads)
  if (!token && req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
    console.log('[jwtAuth] Token from query parameter found');
  }

  if (!token) {
    console.log('[jwtAuth] No token found, continuing without auth');
    return next();
  }

  try {
    console.log('[jwtAuth] Verifying token...');
    const payload = verifyToken(token);
    console.log('[jwtAuth] Token verified, user ID:', payload.id, 'jti:', payload.jti);
    
    const [user] = await getDb().select().from(users).where(eq(users.id, payload.id));
    if (user) {
      console.log('[jwtAuth] User found:', user.email);
      
      // Set user on request object
      req.user = user;
      
      // Also set isAuthenticated function for compatibility
      (req as any).isAuthenticated = () => true;
      
      console.log('[jwtAuth] req.user set successfully, user ID:', req.user.id);
    } else {
      console.log('[jwtAuth] User not found in database');
    }
  } catch (err) {
    console.log('[jwtAuth] Token verification failed:', err);
    // Ignore invalid token and continue
  }

  next();
}
