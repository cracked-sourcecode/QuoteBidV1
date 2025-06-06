import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { hashPassword, comparePasswords } from "./utils/passwordUtils";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { ensureAuth } from './middleware/ensureAuth';
import { z } from "zod";
import path from "path";
import fs from "fs";
import connectPg from "connect-pg-simple";
import { getPool } from "./db";
import jwt from 'jsonwebtoken';

// Path to uploads directory for avatars
const uploadsPath = path.join(process.cwd(), "uploads");
const avatarsPath = path.join(uploadsPath, "avatars");

// Create uploads directories if they don't exist
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
if (!fs.existsSync(avatarsPath)) {
  fs.mkdirSync(avatarsPath, { recursive: true });
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const PostgresSessionStore = connectPg(session);

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "qwoted-development-secret",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({ 
      pool: getPool(), 
      createTableIfMissing: true,
      tableName: 'user_sessions'
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || undefined);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if user with this username or email already exists
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if a user with this email already exists
      if (req.body.email) {
        const existingEmail = await storage.getUserByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Hash the password
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create the user
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      // Log the user in
      req.login(user, async (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        const { signUser } = await import('./lib/jwt');
        const token = signUser({
          id: user.id,
          email: user.email,
          role: user.isAdmin ? 'admin' : 'user'
        });
        res.status(201).json({ success: true, user: userWithoutPassword, token });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, async (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        const { signUser } = await import('./lib/jwt');
        const token = signUser({
          id: user.id,
          email: user.email,
          role: user.isAdmin ? 'admin' : 'user'
        });
        res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
        res.status(200).json({ success: true, user: userWithoutPassword, token });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.clearCookie('token');
      res.sendStatus(200);
    });
  });

  // Note: /api/user endpoint is defined in routes.ts with proper JWT middleware

  // Add PATCH endpoint for user profile updates
  app.patch("/api/user", ensureAuth, async (req, res, next) => {
    try {
      
      const userId = req.user!.id;
      
      let userData;
      
      // Check if data is sent as FormData with userData field
      if (req.body.userData) {
        try {
          userData = JSON.parse(req.body.userData);
        } catch (e) {
          return res.status(400).json({ message: "Invalid JSON in userData" });
        }
      } else {
        // If data is sent directly as JSON
        userData = req.body;
      }
      
      // Validate user data
      const schema = z.object({
        fullName: z.string().min(1).optional(),
        bio: z.string().optional().nullable(),
        location: z.string().optional().nullable(),
        title: z.string().optional().nullable(),
        industry: z.string().optional().nullable(),
        linkedIn: z.string().optional().nullable(), // Using the correct DB field name
        instagram: z.string().optional().nullable(),
        twitter: z.string().optional().nullable(),
        website: z.string().optional().nullable(),
        doFollowLink: z.string().optional().nullable(),
      });
      
      const validationResult = schema.safeParse(userData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Update user profile
      const updateData = validationResult.data;
      
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return updated user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
}