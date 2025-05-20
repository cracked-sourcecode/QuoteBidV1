import dotenv from 'dotenv';
dotenv.config();

// Debug logging for dotenv
console.log('Dotenv loaded. Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);

// Add more detailed logging
console.log('All environment variables:', Object.keys(process.env));
console.log('STRIPE_SECRET_KEY value:', process.env.STRIPE_SECRET_KEY ? 'exists' : 'missing');
console.log('STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY?.length);

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import { checkUnique } from "./routes/public/checkUnique";
import path from 'path';
import cors from 'cors';

// Initialize database connection
initializeDatabase();

const app = express();

// Add CORS middleware before any routes
app.use(cors({
  origin: 'http://localhost:5050',
  credentials: true,
}));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/* ----------   PUBLIC ENDPOINTS (no auth)   ---------- */
app.get("/api/users/check-unique", checkUnique);
app.get("/api/test-public", (_req, res) => res.json({ ok: true }));

// Middleware setup for most routes (except Stripe webhook which needs raw body)
// The stripe webhook route will be defined with its own body parser in routes.ts
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe-webhook') {
    // Skip body parsing for Stripe webhook endpoint
    next();
  } else {
    // Apply JSON and URL-encoded parsers for all other routes
    express.json({ limit: '50mb' })(req, res, (err) => {
      if (err) return next(err);
      express.urlencoded({ extended: false, limit: '50mb' })(req, res, next);
    });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use environment variable for port, default to 5050
  const port = process.env.WS_PORT ? Number(process.env.WS_PORT) : 5050;
  server.listen(port, '0.0.0.0', () => {
    log(`serving on http://192.168.1.21:${port}`);
  });
})();
