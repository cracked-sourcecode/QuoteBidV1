import { Request, Response, NextFunction } from "express";
import { Express } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, AdminUser } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    
    if (!hashed || !salt) {
      console.error("Invalid stored password format, missing hash or salt");
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Check if buffers are the same length first
    if (hashedBuf.length !== suppliedBuf.length) {
      console.log("Password buffers have different lengths");
      return false;
    }
    
    // Use timingSafeEqual for the comparison
    const isMatch = timingSafeEqual(hashedBuf, suppliedBuf);
    
    // Only log on debug flag or dev environment
    if (process.env.DEBUG_AUTH === 'true' || process.env.NODE_ENV === 'development') {
      console.log("Password comparison:", { 
        hashedLength: hashed.length, 
        saltLength: salt.length,
        bufferMatch: hashedBuf.length === suppliedBuf.length,
        isMatch: isMatch
      });
    }
    
    return isMatch;
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// Regular setup for admin authentication
export function setupAdminAuth(app: Express) {
  // Setup middleware for admin routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Get the admin user
      const adminUser = await storage.getAdminUserByUsername(username);
      
      // Only log in development or debug mode
      if (process.env.DEBUG_AUTH === 'true' || process.env.NODE_ENV === 'development') {
        console.log("Admin login attempt:", {
          username,
          adminFound: !!adminUser
        });
      }
      
      // If no admin user found or password doesn't match
      if (!adminUser) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
      
      // Check password
      try {
        const passwordMatches = await comparePasswords(password, adminUser.password);
        
        // Add detailed logging
        if (process.env.DEBUG_AUTH === 'true' || process.env.NODE_ENV === 'development') {
          console.log("Password check result:", {
            passwordMatches,
            passwordMatchesType: typeof passwordMatches,
            passwordMatchesTruthy: !!passwordMatches
          });
        }
        
        if (!passwordMatches) {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }
      } catch (error) {
        console.error("Error comparing admin passwords:", error);
        return res.status(500).json({ message: "Internal server error during authentication" });
      }
      
      // Use the session to store admin user info
      if (req.session) {
        // Set a long-lived session for admins
        if (req.session.cookie) {
          // Set session to last 24 hours for admins
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
        }
        
        req.session.adminUser = {
          id: adminUser.id,
          username: adminUser.username,
          fullName: adminUser.fullName,
          email: adminUser.email,
          role: adminUser.role,
        };
        
        // Explicitly save the session to ensure it's persisted
        req.session.save(err => {
          if (err) {
            console.error("Error saving admin session:", err);
          } else if (process.env.DEBUG_AUTH === 'true') {
            console.log("Admin session saved successfully");
          }
        });
      }
      
      // Return admin user data without password
      const { password: _, ...adminData } = adminUser;
      return res.status(200).json(adminData);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  });
  
  app.post("/api/admin/logout", (req, res) => {
    if (req.session) {
      // First delete the admin user property
      delete req.session.adminUser;
      
      // Then completely destroy the session to prevent any lingering issues
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying admin session:", err);
          return res.status(500).json({ 
            message: "Error during logout", 
            error: err.message 
          });
        }
        
        // Clear the client-side cookie as well
        res.clearCookie('connect.sid');
        
        res.status(200).json({ message: "Admin logged out successfully" });
      });
    } else {
      res.status(200).json({ message: "No active session" });
    }
  });
  
  app.get("/api/admin/current", (req, res) => {
    if (req.session && req.session.adminUser) {
      // Extend the session lifetime on access
      if (req.session.cookie) {
        // Keep admin session active for 24 hours from last activity
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
        
        // Save the session to ensure cookie is updated
        req.session.save(err => {
          if (err) {
            console.error("Error refreshing admin session:", err);
          } else if (process.env.DEBUG_AUTH === 'true') {
            console.log("Admin session refreshed on /current check");
          }
        });
      }
      
      return res.status(200).json({
        ...req.session.adminUser,
        sessionRenewed: true,
        // Provide session expiry info to the client
        sessionExpiresAt: req.session.cookie?.expires || null
      });
    }
    
    return res.status(401).json({ message: "Not authenticated as admin" });
  });
  
  app.get("/api/admin/check", requireAdminAuth, (req, res) => {
    res.status(200).json({ isAdmin: true });
  });
}

// Middleware to verify admin authentication
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  // Log auth check for diagnostic purposes
  console.log("Admin auth check for URL:", req.originalUrl);
  
  // Admin authentication is required in all environments
  // We previously had development bypass here, but we've removed it
  // because it was causing issues with the admin login process
  
  if (req.session && req.session.adminUser) {
    console.log("Admin authenticated, proceeding with user:", req.session.adminUser.username);
    
    // Add adminUser to request for easy access in route handlers
    (req as any).adminUser = req.session.adminUser;
    
    // Refresh the session expiry
    if (req.session.cookie) {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours - keep admin logged in longer (consistent with login function)
    }
    
    // Save the session to ensure cookie is refreshed
    req.session.save(err => {
      if (err) {
        console.error("Error saving session:", err);
      }
    });
    
    return next();
  }
  
  console.log("Admin auth failed - no valid admin session");
  return res.status(401).json({ message: "Not authenticated as admin" });
}

// Declare session with adminUser
declare module "express-session" {
  interface SessionData {
    adminUser?: {
      id: number;
      username: string;
      fullName: string;
      email: string;
      role: string | null;
    };
  }
}