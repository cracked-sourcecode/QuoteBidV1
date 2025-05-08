import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getDb } from "./db";
import { adminUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Delete an admin user by username
export async function deleteAdminUser(req: Request, res: Response) {
  try {
    const { username, adminSecretKey } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }
    
    // Verify admin secret key
    const expectedSecret = process.env.ADMIN_SECRET_KEY || "rubicon_admin_secret";
    if (adminSecretKey?.trim() !== expectedSecret?.trim()) {
      return res.status(403).json({ message: "Invalid admin secret key" });
    }
    
    // Delete the admin user directly from the database
    const result = await getDb().delete(adminUsers).where(eq(adminUsers.username, username));
    
    return res.status(200).json({
      message: `Admin user ${username} deleted successfully`
    });
  } catch (error) {
    console.error("Admin deletion error:", error);
    return res.status(500).json({
      message: "Failed to delete admin user"
    });
  }
}

// Create a new admin user with the provided details
// NOTE: This is meant for initial admin setup and should be secured properly
export async function registerAdmin(req: Request, res: Response) {
  try {
    const adminSchema = z.object({
      username: z.string().min(1, "Username is required"),
      password: z.string().min(4, "Password must be at least 4 characters"), // Lowered for testing
      email: z.string().email("Invalid email address"),
      fullName: z.string().min(1, "Full name is required"),
      adminSecretKey: z.string().min(1, "Admin secret key is required")
    });

    const validationResult = adminSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid admin registration data",
        errors: validationResult.error.errors
      });
    }

    const { adminSecretKey, ...adminData } = validationResult.data;

    // Verify the admin secret key is correct (this should be set in environment variables)
    const expectedSecret = process.env.ADMIN_SECRET_KEY || "rubicon_admin_secret";
    console.log("Expected admin secret key:", expectedSecret);
    console.log("Received admin secret key:", adminSecretKey);
    
    // Use a more flexible comparison to handle different formats
    const secretMatches = adminSecretKey?.trim() === expectedSecret?.trim();
    
    if (!secretMatches) {
      console.log("Admin secret key validation failed");
      return res.status(403).json({
        message: "Invalid admin secret key"
      });
    }

    // Delete any existing admin user with the same username (to prevent conflicts)
    console.log("Deleting any existing admin user with username:", adminData.username);
    try {
      const deleteResult = await getDb().delete(adminUsers).where(eq(adminUsers.username, adminData.username));
      console.log("Delete result:", deleteResult);
    } catch (deleteError) {
      console.error("Error deleting existing admin:", deleteError);
      // Continue even if delete fails
    }

    console.log("Creating admin user with username:", adminData.username);
    const hashedPassword = await hashPassword(adminData.password);
    console.log("Hashed password:", hashedPassword);

    // Create the admin user with hashed password
    const newAdmin = await storage.createAdminUser({
      ...adminData,
      password: hashedPassword,
      role: "admin" // Default role
    });

    console.log("Admin user created successfully:", newAdmin.id);

    // Remove the password from the response for security
    const { password, ...adminWithoutPassword } = newAdmin;

    return res.status(201).json({
      message: "Admin user created successfully",
      admin: adminWithoutPassword
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    return res.status(500).json({
      message: "Failed to create admin user"
    });
  }
}

// Simple endpoint to create a default admin user (for testing/setup)
export async function createDefaultAdmin(req: Request, res: Response) {
  try {
    // Check for admin secret key in the request
    const { adminSecretKey } = req.body;
    
    // Verify admin secret key (same as in registerAdmin)
    const expectedSecret = process.env.ADMIN_SECRET_KEY || "rubicon_admin_secret";
    
    if (adminSecretKey?.trim() !== expectedSecret?.trim()) {
      return res.status(403).json({ message: "Invalid admin secret key" });
    }
    
    // Delete any existing admin user with username 'admin'
    console.log("Deleting any existing default admin user");
    try {
      await getDb().delete(adminUsers).where(eq(adminUsers.username, "admin"));
    } catch (deleteError) {
      console.error("Error deleting existing admin:", deleteError);
      // Continue even if delete fails
    }
    
    // Admin user data
    const adminData = {
      username: "admin",
      password: "admin123", // Simple password for testing
      email: "admin@rubicon.com",
      fullName: "Admin User",
      role: "admin"
    };
    
    console.log("Creating default admin user");
    const hashedPassword = await hashPassword(adminData.password);
    
    // Create the admin user
    const newAdmin = await storage.createAdminUser({
      ...adminData,
      password: hashedPassword
    });
    
    console.log("Default admin created with ID:", newAdmin.id);
    
    return res.status(201).json({
      message: "Default admin user created successfully",
      credentials: {
        username: adminData.username,
        password: adminData.password
      }
    });
  } catch (error) {
    console.error("Default admin creation error:", error);
    return res.status(500).json({
      message: "Failed to create default admin user"
    });
  }
}