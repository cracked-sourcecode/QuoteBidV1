import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce the onboarding flow for new users
 * Allows public access to specific PDF-related endpoints that need to be accessible
 * without authentication during the onboarding process
 */
export function enforceOnboarding(req: Request, res: Response, next: NextFunction) {
  // Public paths that should be accessible without authentication
  const publicPaths = [
    // PDF access paths
    '/api/onboarding/agreement.pdf',      // GET – serve the blank PDF
    '/api/onboarding/agreement/upload',   // POST – upload the signed PDF
    
    // Signup wizard API paths
    '/api/signup-stage',                  // Base path for signup stage endpoints
  ];

  // Skip authentication checks for public paths
  // Also check if the path starts with any of the base public paths
  if (publicPaths.some(path => req.path === path || req.path.startsWith(`${path}/`))) {
    return next();
  }

  // For all other paths, ensure user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // User is authenticated, proceed
  next();
}