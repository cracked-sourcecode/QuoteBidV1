import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce the onboarding flow for new users
 * Allows public access to specific PDF-related endpoints that need to be accessible
 * without authentication during the onboarding process
 */
export function enforceOnboarding(req: Request, res: Response, next: NextFunction) {
  // Skip this middleware entirely for signup-stage routes
  // These are handled before this middleware is applied
  if (req.path.startsWith('/signup-stage/') || 
      req.path === '/signup-stage' ||
      req.path.startsWith('/signup/') ||
      req.path === '/signup') {
    return next();
  }

  // Public paths that should be accessible without authentication
  const publicPaths = [
    // PDF access paths
    '/api/onboarding/agreement.pdf',      // GET – serve the blank PDF
    '/api/onboarding/agreement/upload',   // POST – upload the signed PDF
  ];

  // Skip authentication checks for public paths
  if (publicPaths.some(path => req.path === path)) {
    return next();
  }

  // For all other paths, ensure user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // User is authenticated, proceed
  next();
}