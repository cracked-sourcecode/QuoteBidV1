import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { getDb } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      rubiconUser?: {
        id: string;
        email: string;
        name: string;
        role: string;
        firstName?: string;
        lastName?: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using Rubicon proxy headers
 * Expects headers: x-user-id, x-user-email, x-user-name, x-user-role
 */
export async function rubiconHeaderAuth(req: Request, res: Response, next: NextFunction) {
  // Skip auth for public routes
  const publicPaths = ['/api/health', '/sso/consume', '/public', '/static', '/assets'];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  try {
    // Check for trusted proxy headers
    const trustProxyHeaders = process.env.TRUSTED_PROXY_HEADERS === 'true';
    
    if (!trustProxyHeaders) {
      console.log('[RubiconAuth] Proxy headers not trusted, skipping');
      return next();
    }

    // Extract Rubicon user data from headers
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    const userName = req.headers['x-user-name'] as string;
    const userRole = req.headers['x-user-role'] as string;

    console.log('[RubiconAuth] Headers received:', {
      userId: userId ? 'present' : 'missing',
      userEmail: userEmail ? 'present' : 'missing',
      userName: userName ? 'present' : 'missing',
      userRole: userRole ? 'present' : 'missing',
    });

    // If no headers, user is not authenticated via Rubicon
    if (!userId || !userEmail) {
      console.log('[RubiconAuth] Missing required headers, user not authenticated');
      return next(); // Let downstream middleware handle unauthenticated state
    }

    // Create/update QuoteBid user from Rubicon data
    const db = getDb();
    let quotebidUser;

    try {
      // Try to find existing user by Rubicon ID or email
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (existingUser) {
        // Update existing user with latest Rubicon data
        await db
          .update(users)
          .set({
            full_name: userName || existingUser.full_name,
            rubicon_user_id: userId,
            // Don't overwrite existing data with empty values
          })
          .where(eq(users.id, existingUser.id));

        quotebidUser = { ...existingUser, rubicon_user_id: userId };
        console.log(`[RubiconAuth] Updated existing user: ${userEmail}`);
      } else {
        // Create new QuoteBid user from Rubicon data
        const newUser = {
          email: userEmail,
          username: userEmail, // Use email as username for Rubicon users
          full_name: userName || userEmail,
          signup_stage: 'completed', // Skip onboarding for Rubicon users
          email_verified: true,
          rubicon_user_id: userId,
          created_at: new Date(),
        };

        const [createdUser] = await db.insert(users).values(newUser).returning();
        quotebidUser = createdUser;
        console.log(`[RubiconAuth] Created new user: ${userEmail} (Rubicon ID: ${userId})`);
      }
    } catch (dbError) {
      console.error('[RubiconAuth] Database error:', dbError);
      return res.status(500).json({ error: 'Authentication database error' });
    }

    // Set Rubicon user data on request
    req.rubiconUser = {
      id: userId,
      email: userEmail,
      name: userName || userEmail,
      role: userRole || 'user',
      firstName: userName?.split(' ')[0],
      lastName: userName?.split(' ').slice(1).join(' '),
    };

    // Set QuoteBid user for compatibility with existing middleware
    req.user = quotebidUser;

    // Set session for compatibility
    if (req.session) {
      req.session.userId = quotebidUser.id;
      req.session.user = {
        id: quotebidUser.id,
        email: quotebidUser.email,
        name: quotebidUser.full_name,
        isAuthenticated: true,
        rubiconUserId: userId,
      };
    }

    // Add isAuthenticated helper for compatibility
    (req as any).isAuthenticated = () => true;

    console.log(`[RubiconAuth] ✅ Authenticated: ${userEmail} (QuoteBid ID: ${quotebidUser.id})`);
    next();

  } catch (error) {
    console.error('[RubiconAuth] Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to require Rubicon authentication
 */
export function requireRubiconAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.rubiconUser && !req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'This endpoint requires Rubicon authentication' 
    });
  }
  next();
}

/**
 * Middleware to check if user has admin role via Rubicon
 */
export function requireRubiconAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.rubiconUser || req.rubiconUser.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'This endpoint requires admin privileges' 
    });
  }
  next();
}