import { Request, Response, NextFunction } from "express";

/**
 * Middleware to check if a user is an admin
 * Only allows admin users to access the protected route
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First check if the user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false, 
      message: "Not authenticated" 
    });
  }

  // Then check if the user is an admin
  if (!req.user?.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: "You do not have permission to access this resource" 
    });
  }

  // If user is authenticated and is an admin, proceed
  next();
}