import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { processVoiceRecording } from "./lib/voice";
import { increaseBidAmount } from "./lib/bidding";
import { z } from "zod";
import { insertBidSchema, insertOpportunitySchema, insertPitchSchema, insertPublicationSchema, insertSavedOpportunitySchema, User, PlacementWithRelations, users, pitches, opportunities, publications, notifications } from "@shared/schema";
import { getDb } from "./db";
import { eq, sql, desc, and, ne, asc, isNull, isNotNull, gte, lte, or, inArray } from "drizzle-orm";
import { notificationService } from "./services/notification-service";
import { createSampleNotifications } from "./data/sample-notifications";
import Stripe from "stripe";
import { setupAuth } from "./auth";
import sgMail from '@sendgrid/mail';
import { sendOpportunityNotification, sendPasswordResetEmail } from './lib/email';
import { randomBytes } from 'crypto';
import { requireAdmin } from "./middleware/admin";
import { registerAdmin, deleteAdminUser, createDefaultAdmin } from "./admin-auth";
import { setupAdminAuth, requireAdminAuth } from "./admin-auth-middleware";
import { enforceOnboarding } from "./middleware/enforceOnboarding";
import { jwtAuth } from "./middleware/jwtAuth";
import { ensureAuth } from "./middleware/ensureAuth";
import upload from './middleware/upload';
import pdfUpload from './middleware/pdfUpload';
import path from 'path';
import fs from 'fs';
import { saveAgreementPDF, regenerateAgreementsPDF, createAgreementPDF, generateProfessionalPDF } from './pdf-utils';
import { serveAgreementPDF, handleAgreementUpload } from './handlers/agreement-handlers';
import { handleGeneratePDF, handleSignupAgreementUpload, serveAgreementHTML } from './handlers/signup-wizard-handlers';
import signupStageRouter, { startSignup } from './routes/signupStage';
import signupStateRouter from './routes/signupState';
import signupRouter from './routes/signup';
import { hashPassword } from './utils/passwordUtils';
import jwt from 'jsonwebtoken';
// Sample pitches import removed

export async function registerRoutes(app: Express): Promise<Server> {
  // --- PUBLIC REGISTRATION ENDPOINT (must be before any middleware) ---
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { email, password, username, fullName, companyName, phone, industry } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });
    if (!username) return res.status(400).json({ message: 'Username is required' });
    if (!fullName) return res.status(400).json({ message: 'Full name is required' });
    if (!companyName) return res.status(400).json({ message: 'Company name is required' });
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });
    if (!industry) return res.status(400).json({ message: 'Industry is required' });
    try {
      let [user] = await getDb().select().from(users).where(eq(users.email, email));
      if (user) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      const hashedPassword = await hashPassword(password);
      await getDb().insert(users).values({
        username,
        fullName,
        email,
        password: hashedPassword,
        company_name: companyName,
        phone_number: phone,
        industry,
        signup_stage: 'agreement',
        profileCompleted: false,
        premiumStatus: 'free',
        subscription_status: 'inactive'
      });
      [user] = await getDb().select().from(users).where(eq(users.email, email));
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          signup_stage: user.signup_stage,
          wizard: true
        },
        process.env.JWT_SECRET || 'quotebid_secret',
        { expiresIn: '7d' }
      );
      res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          signup_stage: user.signup_stage
        }
      });
    } catch (error: any) {
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  });

  // Unified signup start endpoint used by new registration flow
  app.post('/api/auth/signup/start', startSignup);

  // --- PUBLIC ENDPOINTS (must be before any middleware) ---
  app.get('/api/test-public', (req, res) => res.json({ ok: true }));

  app.get('/api/users/check-unique', async (req, res) => {
    try {
      const { field, value } = req.query;
      console.log('► [check-unique] field:', field, 'value:', value);

      if (!field || !value || typeof field !== 'string' || typeof value !== 'string') {
        console.log('► [check-unique] Invalid field or value');
        return res.status(400).json({ error: 'Invalid field or value' });
      }
      type ValidField = 'username' | 'email' | 'phone';
      if (!['username', 'email', 'phone'].includes(field)) {
        console.log('► [check-unique] Invalid field name:', field);
        return res.status(400).json({ error: 'Invalid field name' });
      }
      const validField = field as ValidField;
      const column = validField === 'phone' ? 'phone_number' : validField;

      // Normalize the input value based on field type
      let normalizedValue = value;
      if (validField === 'email' || validField === 'username') {
        normalizedValue = value.toLowerCase().trim();
      } else if (validField === 'phone') {
        // Remove non-numeric characters from phone number for consistent comparison
        normalizedValue = value.replace(/\D/g, '');
        // Ensure we're not searching with an empty string
        if (normalizedValue.length === 0) {
          return res.json({ unique: false, error: 'Invalid phone format' });
        }
      }

      // Defensive: check DB connection
      let existingUser = [];
      try {
        // For username and email: case-insensitive search
        if (validField === 'email' || validField === 'username') {
          existingUser = await getDb()
            .select()
            .from(users)
            .where(sql`LOWER(${users[column]}) = LOWER(${normalizedValue})`)
            .limit(1);
        } 
        // For phone: search for the normalized phone number
        else if (validField === 'phone') {
          existingUser = await getDb()
            .select()
            .from(users)
            .where(sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone_number}, '+', ''), '-', ''), ' ', ''), '()', '') LIKE ${'%' + normalizedValue + '%'}`)
            .limit(1);
        }
      } catch (dbErr) {
        console.error('► [check-unique] DB error:', dbErr);
        return res.status(500).json({ error: 'Database error' });
      }

      console.log('► [check-unique] Found:', existingUser?.length || 0);
      return res.json({ unique: !existingUser || existingUser.length === 0 });
    } catch (error) {
      console.error('► [check-unique] General error:', error);
      return res.status(500).json({ error: 'Failed to check uniqueness' });
    }
  });

  // API Routes for pitch messages
  app.get('/api/pitch-messages/:pitchId', requireAdminAuth, async (req, res) => {
    try {
      const { pitchId } = req.params;
      
      // Check if the pitch exists
      const pitch = await storage.getPitchById(parseInt(pitchId));
      if (!pitch) {
        return res.status(404).json({ error: 'Pitch not found' });
      }
      
      const messages = await storage.getPitchMessages(parseInt(pitchId));
      res.json(messages);
    } catch (error) {
      console.error('Error fetching pitch messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/pitch-messages/:pitchId', requireAdminAuth, async (req, res) => {
    try {
      const { pitchId } = req.params;
      const { message } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }
      
      // Check if the pitch exists
      const pitch = await storage.getPitchById(parseInt(pitchId));
      if (!pitch) {
        return res.status(404).json({ error: 'Pitch not found' });
      }
      
      // Get admin user ID from session
      const adminId = req.session.adminUser?.id;
      if (typeof adminId !== 'number') {
        return res.status(400).json({ error: 'Admin ID not found in session' });
      }
      
      const newMessage = await storage.createPitchMessage({
        pitchId: parseInt(pitchId),
        senderId: adminId,
        isAdmin: true,
        message,
        isRead: false
      });
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error creating pitch message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.post('/api/pitch-messages/mark-read/:pitchId', requireAdminAuth, async (req, res) => {
    try {
      const { pitchId } = req.params;
      
      // Check if the pitch exists
      const pitch = await storage.getPitchById(parseInt(pitchId));
      if (!pitch) {
        return res.status(404).json({ error: 'Pitch not found' });
      }
      
      // Get admin user ID from session
      const adminId = req.session.adminUser?.id;
      
      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID not found in session' });
      }
      
      await storage.markPitchMessagesAsRead(parseInt(pitchId), adminId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: 'Failed to update messages' });
    }
  });
  // Add public PDF routes and signup wizard routes BEFORE authentication setup
  // These routes need to be accessible without authentication
  app.get('/api/onboarding/agreement.pdf', serveAgreementPDF);
  app.post('/api/onboarding/agreement/upload', handleAgreementUpload);
  
  // Register signup stage routes once before auth setup
  app.use('/api/signup-stage', signupStageRouter);
  app.use('/api/signup/state', signupStateRouter);
  app.use('/api/signup', signupRouter);
  
  // Serve the agreement HTML template
  app.get('/api/onboarding/agreement.html', serveAgreementHTML);
  
  // Generate PDF from HTML and signature
  app.post('/api/generate-pdf', handleGeneratePDF);
  
  // Upload signed agreement
  app.post('/api/upload-agreement', pdfUpload.single('pdf'), handleSignupAgreementUpload);
  
  // Set up regular user authentication
  setupAuth(app);
  // Allow JWT-based auth for API requests
  app.use(jwtAuth);

  // Endpoint to report the current signup stage for the authenticated user
  app.get('/api/auth/progress', ensureAuth, (req: Request, res: Response) => {
    const stage = (req.user as any).signup_stage || 'agreement';
    res.json({ stage });
  });

  // Endpoint to update the signup stage for the authenticated user
  app.patch('/api/auth/stage', ensureAuth, async (req: Request, res: Response) => {
    const { stage } = req.body as { stage?: string };
    if (!stage) {
      return res.status(400).json({ message: 'Stage required' });
    }
    await getDb()
      .update(users)
      .set({ signup_stage: stage })
      .where(eq(users.id, req.user.id));
    res.json({ success: true });
  });

  // Signup stage router is already registered above; duplicate registration removed
  // to avoid redundant handlers after auth setup.

  // Set up admin authentication
  setupAdminAuth(app);
  
  // Apply onboarding enforcement middleware to protected routes
  const apiRouter = express.Router();
  app.use('/api', enforceOnboarding, apiRouter);
  
  // Notifications API
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user.id;
      
      // Get notifications for the user, ordered by most recent first
      const userNotifications = await getDb().select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));

      return res.json(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });
  
  // Count unread notifications
  app.get("/api/notifications/unread-count", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user.id;
      
      // Count unread notifications
      const unreadCount = await getDb().select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

      return res.json({ count: Number(unreadCount[0]?.count || 0) });
    } catch (error) {
      console.error('Error counting unread notifications:', error);
      return res.status(500).json({ message: 'Failed to count notifications' });
    }
  });
  
  // Mark a notification as read
  app.post("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const notificationId = parseInt(req.params.id);
      const userId = req.user.id;

      // Check if notification belongs to user
      const notification = await getDb().select()
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .then(results => results[0]);

      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      // Update notification
      await getDb().update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));

      return res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ message: 'Failed to update notification' });
    }
  });
  
  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user.id;

      // Update all unread notifications
      await getDb().update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

      return res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ message: 'Failed to update notifications' });
    }
  });
  
  // Create sample notifications for testing
  app.post("/api/notifications/create-samples", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const userId = req.user.id;
      const result = await createSampleNotifications(userId);
      
      if (result) {
        return res.json({ success: true, message: 'Sample notifications created successfully' });
      } else {
        return res.status(500).json({ message: 'Failed to create sample notifications' });
      }
    } catch (error) {
      console.error('Error creating sample notifications:', error);
      return res.status(500).json({ message: 'Failed to create sample notifications' });
    }
  });
  
  // Register admin registration endpoint
  app.post("/api/admin/register", registerAdmin);
  
  // Add endpoint to delete admin users
  app.post("/api/admin/delete", deleteAdminUser);
  
  // Simple endpoint to create a default admin user (for testing/setup)
  app.post("/api/admin/create-default", createDefaultAdmin);
  
  // Serve static files from the uploads directory
  const uploadsPath = path.join(process.cwd(), 'uploads');
  const avatarsPath = path.join(uploadsPath, 'avatars');
  
  // Ensure the avatars directory exists
  if (!fs.existsSync(avatarsPath)) {
    fs.mkdirSync(avatarsPath, { recursive: true });
    console.log('Created avatars directory at:', avatarsPath);
  }
  
  app.use('/uploads', express.static(uploadsPath));
  app.use('/uploads/avatars', express.static(avatarsPath));

  // Create Stripe instance
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Missing required Stripe secret: STRIPE_SECRET_KEY');
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: "2025-03-31.basil",
  });
  
  // ============ PAYMENT ENDPOINTS ============

  // Create a payment intent for one-time payments or bid authorization
  app.post("/api/create-payment-intent", async (req: Request, res: Response) => {
    try {
      console.log("Payment intent request body:", req.body);
      const { amount = 1.00, capture_method = "automatic", metadata = {}, pitchId = null } = req.body;
      
      console.log(`Received amount: ${amount} of type ${typeof amount}`);
      
      // Convert amount to cents (Stripe uses the smallest currency unit)
      const amountInCents = Math.round(amount * 100);
      
      // Use the actual bid amount as requested by the client
      const finalAmount = amountInCents;
      
      console.log(`Creating payment intent for $${finalAmount/100} with capture method: ${capture_method}`);
      
      // Check if we have a userId in the metadata to look up the customer ID
      let stripeCustomerId: string | undefined = undefined;
      if (metadata.userId) {
        try {
          // Look up the user's Stripe customer ID
          const user = await storage.getUser(parseInt(metadata.userId));
          if (user && user.stripeCustomerId) {
            stripeCustomerId = user.stripeCustomerId;
            console.log(`Found Stripe customer ID ${stripeCustomerId} for user ${metadata.userId}`);
          }
        } catch (lookupError) {
          console.error("Error looking up user's customer ID:", lookupError);
          // Continue without the customer ID
        }
      }
      
      // Create the payment intent
      const paymentIntentOptions: any = {
        amount: finalAmount,
        currency: "usd",
        capture_method: capture_method as 'automatic' | 'manual',
        // Merge provided metadata with defaults
        metadata: {
          test_mode: 'true', 
          sandbox: 'true',
          ...metadata,
          // Add pitchId to metadata if provided
          ...(pitchId ? { pitchId: pitchId.toString() } : {})
        },
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        }
      };
      
      // If we have a customer ID, use it to enable saved payment methods
      if (stripeCustomerId) {
        paymentIntentOptions.customer = stripeCustomerId;
        paymentIntentOptions.setup_future_usage = 'off_session';
        // Only specify card payment type to avoid requiring additional configuration
        paymentIntentOptions.payment_method_types = ['card'];
      } else {
        // Use automatic payment methods but limit to card to avoid requiring additional configuration
        paymentIntentOptions.payment_method_types = ['card'];
      }
      
      const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
      
      console.log(`Created payment intent: ${paymentIntent.id} for $${finalAmount/100}`);
      
      // If a pitch ID was provided, link the payment intent to the pitch
      if (pitchId) {
        try {
          // Calculate authorization expiration (6.5 days from now, matching the ticket requirement)
          const authorizationExpiresAt = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000);
          
          // Update the pitch with the payment intent ID and expiration
          const updatedPitch = await storage.updatePitchPaymentIntent(
            parseInt(pitchId.toString()), 
            paymentIntent.id, 
            authorizationExpiresAt
          );
          
          console.log(`[SAVE-PI] ${pitchId} ${paymentIntent.id}`);
        } catch (linkError) {
          console.error(`Error linking payment intent to pitch ${pitchId}:`, linkError);
          // Continue without failing - we'll still return the payment intent
        }
      }
      
      res.json({ 
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: finalAmount/100,
        customerId: stripeCustomerId
      });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Get user subscription status
  app.get("/api/user/:userId/subscription", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let subscriptionStatus = {
        isPremium: false,
        status: user.premiumStatus || 'free',
        expiresAt: user.premiumExpiry || null,
        subscriptionId: user.stripeSubscriptionId || null
      };
      
      // If user has a subscription ID, check its status
      if (user.stripeSubscriptionId) {
        try {
          const subscription: any = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          // Update with actual Stripe data
          subscriptionStatus = {
            isPremium: subscription.status === 'active' || subscription.status === 'trialing',
            status: subscription.status,
            expiresAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
            subscriptionId: subscription.id
          };
        } catch (error) {
          console.error("Error fetching subscription:", error);
          // We'll just use the data from our database
        }
      }
      
      res.json(subscriptionStatus);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching subscription status: " + error.message });
    }
  });
  
  // Cancel subscription
  app.post("/api/user/:userId/cancel-subscription", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ message: "No active subscription found" });
      }
      
      // Cancel the subscription at period end (allows user to still use the service until the end of the billing period)
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      
      // Update user status
      await getDb().update(users)
        .set({ 
          premiumStatus: 'cancelling'
        })
        .where(eq(users.id, userId));
      
      res.json({ 
        success: true, 
        message: "Subscription will be canceled at the end of the billing period",
        status: 'cancelling',
        expiresAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null
      });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Error cancelling subscription: " + error.message });
    }
  });
  
  // Verify and get details from a Stripe Checkout session
  app.post("/api/verify-subscription", async (req: Request, res: Response) => {
    console.log("Verify subscription endpoint called with:", req.body);
    
    try {
      if (!req.isAuthenticated()) {
        console.log("User not authenticated");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { sessionId, paymentIntentId } = req.body;
      const user = req.user as User;
      
      console.log(`Authentication passed. User ID: ${user.id}. sessionId: ${sessionId || 'none'}, paymentIntentId: ${paymentIntentId || 'none'}`);
      
      // Handle both session-based (Checkout) and direct payment intent (embedded form) verification
      if (sessionId) {
        console.log(`Retrieving checkout session: ${sessionId}`);
        
        // Retrieve the Checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log("Session retrieved:", {
          id: session.id,
          paymentStatus: session.payment_status,
          hasSubscription: !!session.subscription
        });
        
        // Make sure this session belongs to the authenticated user
        if (session.metadata?.userId && parseInt(session.metadata.userId) !== user.id) {
          console.log(`Session userId mismatch. Session: ${session.metadata.userId}, User: ${user.id}`);
          return res.status(403).json({ message: "This session does not belong to the authenticated user" });
        }
        
        if (session.payment_status !== 'paid') {
          console.log(`Payment not completed. Status: ${session.payment_status}`);
          return res.status(400).json({ message: "Payment not completed" });
        }
        
        // If this has a subscription, get subscription details
        let subscriptionDetails = null;
        if (session.subscription) {
          console.log(`Retrieving subscription details for: ${session.subscription}`);
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          if (subscription) {
            console.log("Subscription retrieved:", {
              id: subscription.id,
              status: subscription.status,
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
            });
            
            // Update user record with subscription info if not already done by webhook
            if (!user.stripeSubscriptionId) {
              console.log(`Updating user ${user.id} with subscription ID ${subscription.id}`);
              await getDb().update(users)
                .set({
                  stripeSubscriptionId: subscription.id,
                  premiumStatus: 'active',
                  premiumExpiry: new Date((subscription as any).current_period_end * 1000)
                })
                .where(eq(users.id, user.id));
            }
            
            subscriptionDetails = {
              id: subscription.id,
              status: subscription.status,
              current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString()
            };
          }
        }
        
        const response = {
          success: true,
          userId: user.id,
          customerEmail: session.customer_details?.email,
          paymentStatus: session.payment_status,
          status: 'active',
          ...subscriptionDetails
        };
        console.log("Sending success response for session verification:", response);
        res.json(response);
      } 
      // Handle verification by payment intent ID (from embedded form)
      else if (paymentIntentId) {
        console.log(`Retrieving payment intent: ${paymentIntentId}`);
        
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          console.log("Payment intent retrieved:", {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata || {}
          });
          
          // For test cards (which sometimes have statuses like 'requires_capture' or 'processing'), 
          // we'll consider these as 'acceptable' statuses too
          const acceptableStatuses = ['succeeded', 'processing', 'requires_capture'];
          
          if (!acceptableStatuses.includes(paymentIntent.status)) {
            console.log(`Payment not in acceptable status. Status: ${paymentIntent.status}`);
            return res.status(400).json({ 
              message: `Payment not completed. Status: ${paymentIntent.status}. Please try again or contact support.` 
            });
          }
          
          // Log the payment amount for tracking
          console.log(`Payment amount: ${paymentIntent.amount} cents (${paymentIntent.amount/100} USD)`);
          
          // We no longer need to check for a specific amount as we're using the actual bid amount
          
          // Update user record with premium status
          console.log(`Updating user ${user.id} premium status to active`);
          await getDb().update(users)
            .set({
              premiumStatus: 'active',
              // Set premium expiry to 30 days from now for the monthly subscription
              premiumExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            })
            .where(eq(users.id, user.id));
          
          // Return success response with debug info for testing
          const response = {
            success: true,
            userId: user.id,
            paymentStatus: paymentIntent.status,
            paymentAmount: paymentIntent.amount,
            paymentId: paymentIntent.id,
            status: 'active',
            _debug: {
              isTestMode: paymentIntent.livemode === false,
              paymentMethod: paymentIntent.payment_method_types
            },
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          };
          console.log("Sending success response for payment intent verification:", response);
          res.json(response);
        } catch (stripeError: any) {
          console.error("Stripe API error when retrieving payment intent:", stripeError);
          
          // Special handler for test mode to help with debugging
          if (stripeError.type === 'StripeInvalidRequestError' && stripeError.param === 'intent') {
            console.log("This appears to be a test mode issue. Proceeding with fake verification for testing.");
            
            // Update user record with premium status anyway for testing
            await getDb().update(users)
              .set({
                premiumStatus: 'active',
                premiumExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              })
              .where(eq(users.id, user.id));
            
            // Return success response for testing
            res.json({
              success: true,
              userId: user.id,
              paymentStatus: 'simulated_success',
              status: 'active',
              _debug: {
                errorHandled: true,
                originalErrorType: stripeError.type
              },
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            
            return;
          }
          
          // Re-throw for normal error handling
          throw stripeError;
        }
      } 
      else {
        console.log("Missing session ID and payment intent ID");
        return res.status(400).json({ message: "Either Session ID or Payment Intent ID is required" });
      }
    } catch (error: any) {
      console.error("Error verifying subscription:", error);
      res.status(500).json({ message: "Error verifying subscription: " + error.message });
    }
  });
  


  // Handle subscription creation or retrieval - Modernized for SaaS 
  app.post('/api/get-or-create-subscription', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = req.user as User;
      
      // Check if the user already has an active subscription
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            // User already has an active subscription
            return res.json({
              subscriptionId: subscription.id,
              clientSecret: null,
              status: 'active',
              message: 'You already have an active subscription'
            });
          }
        } catch (error) {
          console.log("Error retrieving subscription, creating new one:", error);
          // Continue to create a new subscription if there was an error
        }
      }
      
      // Create or retrieve a customer for this user
      let customer;
      if (user.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
          if (customer.deleted) {
            throw new Error("Customer was deleted");
          }
        } catch (error) {
          // Customer not found or deleted, create a new one
          customer = await stripe.customers.create({
            email: user.email,
            name: user.fullName || user.username,
            metadata: {
              userId: user.id.toString()
            }
          });
          
          // Update user with the new customer ID
          await getDb().update(users)
            .set({ stripeCustomerId: customer.id })
            .where(eq(users.id, user.id));
        }
      } else {
        // No customer ID, create a new one
        customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName || user.username,
          metadata: {
            userId: user.id.toString(),
            registrationDate: new Date().toISOString()
          }
        });
        
        // Update user with the new customer ID
        await getDb().update(users)
          .set({ stripeCustomerId: customer.id })
          .where(eq(users.id, user.id));
      }
      
      // Look for existing product and price or create them
      let price;
      try {
        // Try to find our subscription product
        const products = await stripe.products.list({
          active: true,
          limit: 10
        });
        
        const quoteBidProduct = products.data.find(
          (p) => p.name === 'QuoteBid Platform Access'
        );
        
        if (quoteBidProduct) {
          // Find the price for this product
          const prices = await stripe.prices.list({
            product: quoteBidProduct.id,
            active: true,
            limit: 10
          });
          
          // Use the first active price
          if (prices.data.length > 0) {
            price = prices.data[0];
          }
        }
      } catch (error) {
        console.log("Error finding product/price, will create new ones:", error);
      }
      
      // If no existing product/price was found, create them
      if (!price) {
        // Create product
        const product = await stripe.products.create({
          name: 'QuoteBid Platform Access',
          description: 'Monthly subscription to QuoteBid platform'
        });
        
        // Create price
        price = await stripe.prices.create({
          product: product.id,
          currency: 'usd',
          unit_amount: 9999, // $99.99 in cents for the monthly subscription
          recurring: {
            interval: 'month'
          },
          metadata: {
            isTestPrice: 'false'
          }
        });
      }
      
      // Create Checkout Session for the user to subscribe
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        // Redirect after successful payment to the subscription success page
        success_url: `${req.protocol}://${req.get('host')}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/subscribe?canceled=true`,
        metadata: {
          userId: user.id.toString()
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        subscription_data: {
          metadata: {
            userId: user.id.toString()
          },
          trial_period_days: 7 // Optional: Add a 7-day free trial
        }
      });
      
      // Update user to pending status
      await getDb().update(users)
        .set({ 
          premiumStatus: 'pending'
        })
        .where(eq(users.id, user.id));
      
      // Return the session URL
      res.json({
        sessionId: session.id,
        url: session.url
      });
      
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ message: "Error creating subscription payment: " + error.message });
    }
  });
  // ============ OPPORTUNITIES ENDPOINTS ============
  
  // Get all opportunities with publications
  app.get("/api/opportunities", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          message: "Authentication required to view opportunities" 
        });
      }

      const opportunities = await storage.getOpportunitiesWithPublications();
      res.json(opportunities);
    } catch (error: any) {
      console.error("Opportunities error:", error);
      res.status(500).json({ 
        message: "Failed to fetch opportunities", 
        error: error.message || "Unknown error" 
      });
    }
  });

  // Get single opportunity with publication
  app.get("/api/opportunities/:id", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          message: "Authentication required to view opportunities" 
        });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const oppWithPub = await storage.getOpportunityWithPublication(id);
      if (!oppWithPub) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Transform the data to match what the client expects
      const opportunity = {
        id: oppWithPub.id,
        title: oppWithPub.title,
        outlet: oppWithPub.publication.name,
        outletLogo: oppWithPub.publication.logo,
        tier: oppWithPub.tier ? parseInt(oppWithPub.tier.replace('Tier ', '')) as 1 | 2 | 3 : 1,
        status: oppWithPub.status as 'open' | 'closed',
        summary: oppWithPub.description || '',
        topicTags: Array.isArray(oppWithPub.tags) ? oppWithPub.tags : [],
        slotsTotal: 5, // Default value
        slotsRemaining: 3, // Default value
        basePrice: oppWithPub.minimumBid || 100,
        currentPrice: oppWithPub.minimumBid || 100,
        increment: 50, // Default value
        floorPrice: oppWithPub.minimumBid || 100,
        cutoffPrice: (oppWithPub.minimumBid || 100) + 500, // Default value
        deadline: oppWithPub.deadline || new Date().toISOString(),
        postedAt: oppWithPub.createdAt || new Date().toISOString(),
        createdAt: oppWithPub.createdAt || new Date().toISOString(),
        updatedAt: oppWithPub.createdAt || new Date().toISOString(),
        publicationId: oppWithPub.publicationId,
        industry: oppWithPub.industry || 'Business',
        mediaType: oppWithPub.mediaType || 'Article'
      };
      
      res.json(opportunity);
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      res.status(500).json({ message: "Failed to fetch opportunity" });
    }
  });

  // Get bid information for an opportunity
  app.get("/api/opportunities/:id/bid-info", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          message: "Authentication required to view bid information" 
        });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      // Get opportunity details
      const opportunity = await storage.getOpportunity(id);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Get current highest bid
      const highestBid = await storage.getHighestBidForOpportunity(id);
      
      // Compute minimum bid (current highest + increment or base price)
      const basePrice = opportunity.minimumBid || 100;
      const increment = 50; // Standard increment
      const currentPrice = highestBid > 0 ? highestBid : basePrice;
      const minBid = currentPrice + increment;
      
      // Slots info - could be dynamic in the future
      const slotsTotal = 5;
      const slotsRemaining = 3;
      
      // Build bid info
      const bidInfo = {
        opportunityId: id,
        currentPrice,
        minBid,
        deadline: opportunity.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        slotsRemaining,
        slotsTotal
      };
      
      res.json(bidInfo);
    } catch (error) {
      console.error("Error fetching bid info:", error);
      res.status(500).json({ message: "Failed to fetch bid information" });
    }
  });
  
  // Get price history for an opportunity
  app.get("/api/opportunities/:id/price-history", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          message: "Authentication required to view price history" 
        });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      // Get opportunity details
      const opportunity = await storage.getOpportunity(id);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Get bid history
      const bids = await storage.getBidsByOpportunityId(id);
      
      // Sort bids by timestamp
      bids.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return aDate.getTime() - bDate.getTime();
      });
      
      // Create price history with at least two points
      const priceHistory = [];
      
      // Add starting point (opportunity creation with base price)
      const createdAt = opportunity.createdAt || new Date().toISOString();
      const basePrice = opportunity.minimumBid || 100;
      
      priceHistory.push({
        timestamp: createdAt,
        price: basePrice,
        slotsRemaining: 5 // Default starting slots
      });
      
      // Add points for each bid
      let currentSlots = 5;
      for (const bid of bids) {
        // Each successful bid takes a slot
        currentSlots = Math.max(0, currentSlots - 1);
        
        priceHistory.push({
          timestamp: bid.createdAt,
          price: bid.amount,
          slotsRemaining: currentSlots
        });
      }
      
      // If no bids, add current point
      if (bids.length === 0) {
        priceHistory.push({
          timestamp: new Date().toISOString(),
          price: basePrice,
          slotsRemaining: 5
        });
      }
      
      res.json(priceHistory);
    } catch (error) {
      console.error("Error fetching price history:", error);
      res.status(500).json({ message: "Failed to fetch price history" });
    }
  });
  
  // Search opportunities
  app.get("/api/opportunities/search/:query", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          message: "Authentication required to search opportunities" 
        });
      }

      const query = req.params.query;
      const opportunities = await storage.searchOpportunities(query);
      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ message: "Failed to search opportunities" });
    }
  });
  
  // ============ PUBLICATIONS ENDPOINTS ============
  
  // Get all publications
  app.get("/api/publications", async (req: Request, res: Response) => {
    try {
      const publications = await storage.getPublications();
      res.json(publications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publications" });
    }
  });
  
  // Serve uploaded publication logos
  app.use('/uploads/publications', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', 'publications', req.path);
    res.sendFile(filePath, (err) => {
      if (err) {
        next();
      }
    });
  });
  
  // Upload publication logo
  app.post('/api/upload/publication-logo', requireAdminAuth, upload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Import sharp for image processing
      const sharp = require('sharp');
      
      // Get original file path
      const originalPath = req.file.path;
      const filename = req.file.filename;
      const outputPath = path.join(process.cwd(), 'uploads', 'publications', `resized-${filename}`);
      
      // Resize the image to 200x200 while maintaining aspect ratio
      await sharp(originalPath)
        .resize({
          width: 200,
          height: 200,
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
        })
        .toFile(outputPath);
      
      // Remove the original file after resizing
      fs.unlinkSync(originalPath);
      
      // Rename the resized file to the original filename to maintain URL format
      fs.renameSync(outputPath, originalPath);
      
      // Generate the URL for the uploaded file
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/uploads/publications/${req.file.filename}`;
      
      console.log('Publication logo resized and saved successfully:', fileUrl);
      
      res.status(200).json({ 
        message: 'File uploaded and resized successfully',
        fileUrl: fileUrl 
      });
    } catch (error) {
      console.error('Failed to process publication logo:', error);
      res.status(500).json({ message: 'Failed to upload and resize file' });
    }
  });
  
  // Get single publication
  app.get("/api/publications/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }
      
      const publication = await storage.getPublication(id);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      res.json(publication);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publication" });
    }
  });
  
  // ============ BIDS ENDPOINTS ============
  
  // Check if a user has already submitted a pitch for an opportunity
  app.get("/api/opportunities/:opportunityId/user-pitch-status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const opportunityId = parseInt(req.params.opportunityId);
      const userId = req.user.id;
      
      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      console.log(`Checking pitch status for user ${userId} and opportunity ${opportunityId}`);
      
      // First, check for any pitch for this opportunity regardless of status
      // This is the most comprehensive check to make sure we don't miss anything
      const allPitches = await getDb().select()
        .from(pitches)
        .where(
          and(
            eq(pitches.userId, userId),
            eq(pitches.opportunityId, opportunityId)
          )
        );
        
      console.log(`Found ${allPitches.length} pitches for user ${userId} and opportunity ${opportunityId}`);
      
      if (allPitches.length > 0) {
        // Group pitches by status
        const pitchesByStatus = allPitches.reduce((acc, pitch) => {
          if (!acc[pitch.status]) {
            acc[pitch.status] = [];
          }
          acc[pitch.status].push(pitch);
          return acc;
        }, {} as Record<string, any[]>);
        
        console.log(`Pitches by status:`, Object.keys(pitchesByStatus));
        
        // Priority: non-draft pitches with status not 'draft'
        const nonDraftStatuses = Object.keys(pitchesByStatus).filter(status => status !== 'draft');
        
        if (nonDraftStatuses.length > 0) {
          // Find the first non-draft pitch that's submitted
          const firstNonDraftStatus = nonDraftStatuses[0];
          const pitch = pitchesByStatus[firstNonDraftStatus][0];
          
          console.log(`Found non-draft pitch with status ${pitch.status}:`, pitch);
          
          // Fix any metadata inconsistencies
          if (pitch.isDraft) {
            await getDb().update(pitches)
              .set({ isDraft: false })
              .where(eq(pitches.id, pitch.id));
            
            console.log(`Fixed isDraft flag for pitch ${pitch.id}`);
            pitch.isDraft = false;
          }
          
          // Check if it's a pending pitch - these can still be edited through My Pitches
          if (pitch.status === 'pending') {
            return res.status(200).json({
              hasSubmitted: true,
              isPending: true,
              pitch: pitch,
              message: "You have a pending pitch for this opportunity that can still be edited from My Pitches."
            });
          }
          
          // It's a pitch that's already been processed and can't be edited
          return res.status(200).json({
            hasSubmitted: true,
            isPending: false,
            pitch: pitch,
            message: "You have already submitted a pitch for this opportunity."
          });
        }
        
        // If we only have draft pitches, return the first one
        if (pitchesByStatus['draft'] && pitchesByStatus['draft'].length > 0) {
          const draftPitch = pitchesByStatus['draft'][0];
          console.log(`Only found draft pitch:`, draftPitch);
          
          // Ensure draft is properly flagged
          if (!draftPitch.isDraft) {
            await getDb().update(pitches)
              .set({ isDraft: true })
              .where(eq(pitches.id, draftPitch.id));
            
            console.log(`Fixed isDraft flag for draft pitch ${draftPitch.id}`);
            draftPitch.isDraft = true;
          }
          
          // Just return that we have a draft, not a submitted pitch
          return res.status(200).json({
            hasSubmitted: false,
            isPending: false,
            hasDraft: true,
            pitch: null,
            draftPitch: draftPitch,
            message: "You have a draft pitch for this opportunity."
          });
        }
      }
      
      // User has not submitted a pitch yet
      return res.status(200).json({
        hasSubmitted: false,
        isPending: false,
        hasDraft: false,
        pitch: null,
        message: "No pitch has been submitted for this opportunity."
      });
    } catch (error) {
      console.error("Error checking user pitch status:", error);
      return res.status(500).json({ message: "Error checking pitch status" });
    }
  });
  
  // Get bids for an opportunity
  app.get("/api/opportunities/:id/bids", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const bids = await storage.getBidsByOpportunityId(id);
      res.json(bids);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });
  
  // Create a new bid
  app.post("/api/bids", async (req: Request, res: Response) => {
    try {
      const validationResult = insertBidSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid bid data", 
          errors: validationResult.error.errors 
        });
      }
      
      const bidData = validationResult.data;
      
      // Add dual user ID formats
      const enhancedBidData = {
        ...bidData,
        user_id: bidData.userId // Add snake_case format for database compatibility
      };
      
      console.log("Creating bid with enhanced data:", enhancedBidData);
      
      // Check if opportunity exists
      const opportunity = await storage.getOpportunity(bidData.opportunityId);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Check if bid amount is higher than minimum bid
      const currentHighestBid = await storage.getHighestBidForOpportunity(bidData.opportunityId);
      if (bidData.amount < currentHighestBid) {
        return res.status(400).json({ 
          message: "Bid amount must be higher than current highest bid",
          minimumBid: await increaseBidAmount(currentHighestBid)
        });
      }
      
      // Extract the payment intent ID if provided in the request
      const paymentIntentId = req.body.paymentIntentId || null;

      // Create the bid record
      const newBid = await storage.createBid(enhancedBidData);
      console.log(`Created new bid with ID ${newBid.id}`);
      
      // If no payment intent ID was provided, create one with Stripe
      if (!paymentIntentId && bidData.amount) {
        try {
          // Calculate amount in cents for Stripe
          const amountInCents = Math.round(bidData.amount * 100);
          
          // Create a payment intent with manual capture
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            capture_method: "manual",
            metadata: {
              bidId: newBid.id.toString(),
              opportunityId: bidData.opportunityId.toString(),
              userId: bidData.userId.toString(),
              bidType: 'media_coverage'
            },
            payment_method_types: ['card']
          });
          
          console.log(`Created payment intent ${paymentIntent.id} for bid ${newBid.id}`);
          
          // Now create a pitch based on this bid and attach the payment intent
          // First check if a pitch already exists for this user and opportunity
          const existingPitch = await storage.getPitchByUserAndOpportunity(
            bidData.userId,
            bidData.opportunityId
          );
          
          // Calculate authorization expiration (6.5 days from now, matching the ticket requirement)
          const authorizationExpiresAt = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000);
          
          if (existingPitch) {
            // Update the existing pitch with the payment intent ID
            console.log(`[SAVE-PI] ${existingPitch.id} ${paymentIntent.id}`);
            await storage.updatePitchPaymentIntent(
              existingPitch.id,
              paymentIntent.id,
              authorizationExpiresAt
            );
          } else {
            // Create a new pitch with the payment intent
            console.log(`Creating new pitch for bid ${newBid.id} with payment intent ${paymentIntent.id}`);
            const pitchData = {
              opportunityId: bidData.opportunityId,
              userId: bidData.userId,
              content: null,
              audioUrl: null,
              transcript: null,
              status: 'pending',
              paymentIntentId: paymentIntent.id,
              bidAmount: bidData.amount,
              authorizationExpiresAt
            };
            
            const newPitch = await storage.createPitch(pitchData);
            console.log(`[SAVE-PI] ${newPitch.id} ${paymentIntent.id}`);
          }
          
          // Return the bid with payment intent info
          return res.status(201).json({
            ...newBid,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret
          });
        } catch (stripeError) {
          console.error('Error creating payment intent for bid:', stripeError);
          // Continue without payment intent if creation fails
        }
      }
      
      // Return the bid without payment information if no payment intent was created
      res.status(201).json(newBid);
    } catch (error) {
      res.status(500).json({ message: "Failed to create bid" });
    }
  });
  
  // ============ PITCHES ENDPOINTS ============
  
  // Get pitches for an opportunity
  app.get("/api/opportunities/:id/pitches", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const pitches = await storage.getPitchesByOpportunityId(id);
      res.json(pitches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pitches" });
    }
  });
  
  // Create a new pitch
  app.post("/api/pitches", async (req: Request, res: Response) => {
    try {
      console.log("Received request to create pitch:", req.body);
      
      // Extract fields from request - accept both camelCase and snake_case formats
      // If we can't find user or opportunity IDs, check session for auth data
      let userId = req.body.userId || req.body.user_id;
      
      // If no userId provided but user is logged in, use session data
      if (!userId && req.isAuthenticated() && req.user && req.user.id) {
        userId = req.user.id;
        console.log("Using authenticated user ID from session:", userId);
      }
      
      let opportunityId = req.body.opportunityId || req.body.opportunity_id;
      const content = req.body.content || "";
      const audioUrl = req.body.audioUrl || req.body.audio_url || "";
      const transcript = req.body.transcript || "";
      const status = req.body.status || 'pending';
      
      // Convert values to numbers if they're strings
      if (userId && typeof userId === 'string') userId = parseInt(userId);
      if (opportunityId && typeof opportunityId === 'string') opportunityId = parseInt(opportunityId);
      const requestPaymentIntentId = req.body.paymentIntentId || req.body.payment_intent_id;
      const bidAmount = req.body.bidAmount || req.body.bid_amount;
      
      console.log("Extracted data from request:", { 
        userId, 
        opportunityId,
        hasContent: !!content,
        hasAudio: !!audioUrl,
        hasTranscript: !!transcript,
        paymentIntent: requestPaymentIntentId
      });
      
      // Basic validation
      if (!opportunityId || !userId) {
        console.error("Missing required fields:", { opportunityId, userId });
        return res.status(400).json({
          message: "Invalid pitch data",
          errors: [
            { path: ["opportunityId"], message: "Required" },
            { path: ["userId"], message: "Required" }
          ]
        });
      }
      
      console.log("Pitch data extracted successfully");
      
      // Check if opportunity exists
      const opportunity = await storage.getOpportunity(opportunityId);
      if (!opportunity) {
        console.error(`Opportunity not found with ID: ${opportunityId}`);
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      console.log(`Found opportunity ${opportunity.id} for the pitch`);
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User not found with ID: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`Found user ${user.id} for the pitch`);
      
      // Check if user has an associated payment method/intent
      let paymentIntentId = null;
      if (requestPaymentIntentId) {
        console.log(`Pitch submitted with payment intent: ${requestPaymentIntentId}`);
        paymentIntentId = requestPaymentIntentId;
      }
      
      // Check if a pitch already exists for this user and opportunity (prevent duplicates)
      const existingPitch = await storage.getPitchByUserAndOpportunity(userId, opportunityId);
      if (existingPitch) {
        console.log(`Found existing pitch ${existingPitch.id} for user ${userId} and opportunity ${opportunityId}, updating it`);
        // Update the existing pitch
        const updatedData = {
          content: content || existingPitch.content,
          audioUrl: audioUrl || existingPitch.audioUrl,
          transcript: transcript || existingPitch.transcript,
          status: status,
          paymentIntentId: paymentIntentId || existingPitch.paymentIntentId,
          bidAmount: bidAmount || existingPitch.bidAmount
        };
        
        const updatedPitch = await storage.updatePitch({
          id: existingPitch.id,
          ...updatedData
        });
        return res.status(200).json(updatedPitch);
      }
      
      // Create the pitch data object
      const pitchData = {
        opportunityId,
        userId,
        content: content || null,
        audioUrl: audioUrl || null,
        transcript: transcript || null,
        status: status || 'pending',
        paymentIntentId,
        bidAmount: bidAmount || null
      };
      
      console.log("Creating NEW pitch with data:", pitchData);
      
      // Create the pitch
      const newPitch = await storage.createPitch(pitchData);
      
      console.log("Successfully created pitch with ID:", newPitch.id);
      
      // If no payment intent ID was provided and bid amount exists, create one now
      if (!paymentIntentId && bidAmount) {
        try {
          console.log(`Creating payment intent for pitch ${newPitch.id} with amount ${bidAmount}`);
          
          // Convert amount to cents for Stripe API
          const amountInCents = Math.round(bidAmount * 100);
          
          // Create the payment intent with manual capture
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            capture_method: "manual",
            metadata: {
              pitchId: newPitch.id.toString(),
              userId: userId.toString(),
              opportunityId: opportunityId.toString(),
              pitchType: 'media_coverage'
            },
            payment_method_types: ['card']
          });
          
          console.log(`Created payment intent ${paymentIntent.id} for pitch ${newPitch.id}`);
          
          // Calculate authorization expiration (6.5 days from now, matching the ticket requirement)
          const authorizationExpiresAt = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000);
          
          // Update the pitch with payment intent ID and expiration
          const updatedPitch = await storage.updatePitchPaymentIntent(
            newPitch.id,
            paymentIntent.id,
            authorizationExpiresAt
          );
          
          if (updatedPitch) {
            console.log(`[SAVE-PI] ${newPitch.id} ${paymentIntent.id}`);
            // Return the updated pitch with client secret for frontend to handle payment
            return res.status(201).json({
              ...updatedPitch,
              paymentIntentId: paymentIntent.id,
              clientSecret: paymentIntent.client_secret
            });
          }
        } catch (stripeError) {
          console.error('Error creating payment intent:', stripeError);
          // Continue without payment intent if creation fails
        }
      }
      
      // IMPORTANT: Try to get the pitch back from storage to verify it exists
      const verificationPitch = await storage.getPitch(newPitch.id);
      if (verificationPitch) {
        console.log("Verified pitch exists in database with ID:", verificationPitch.id);
      } else {
        console.error("WARNING: Could not verify pitch exists immediately after creation!");
      }
      
      res.status(201).json(newPitch);
    } catch (error) {
      console.error('Error creating pitch:', error);
      res.status(500).json({ message: "Failed to create pitch" });
    }
  });
  
  // Update pitch transcript
  app.patch("/api/pitches/:id/transcript", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const schema = z.object({
        transcript: z.string().min(1)
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid transcript data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { transcript } = validationResult.data;
      
      const updatedPitch = await storage.updatePitchTranscript(id, transcript);
      if (!updatedPitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      res.json(updatedPitch);
    } catch (error) {
      res.status(500).json({ message: "Failed to update transcript" });
    }
  });
  
  // Process voice recording
  // Create or update a draft pitch
  app.post("/api/pitches/draft", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'You must be logged in to save a draft' });
      }
      
      console.log("Received request to save draft pitch:", req.body);
      
      // Extract fields from request - accept both camelCase and snake_case formats
      let userId = req.body.userId || req.body.user_id || req.user.id;
      let opportunityId = req.body.opportunityId || req.body.opportunity_id;
      const content = req.body.content || "";
      const audioUrl = req.body.audioUrl || req.body.audio_url || "";
      const transcript = req.body.transcript || "";
      const bidAmount = Number(req.body.bidAmount || req.body.bid_amount || 0);
      const pitchType = req.body.pitchType || 'text';
      
      // Default values
      const status = 'draft';
      const isDraft = true;
      
      // Convert values to numbers if they're strings
      userId = typeof userId === 'string' ? parseInt(userId) : userId;
      opportunityId = typeof opportunityId === 'string' ? parseInt(opportunityId) : opportunityId;
      
      // Validate that we have required data
      if (!userId || !opportunityId) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          details: { userId, opportunityId }
        });
      }
      
      // Insert draft pitch
      const pitchData = {
        opportunityId,
        userId,
        content,
        audioUrl,
        transcript, 
        status,
        isDraft,
        pitchType,
        bidAmount: bidAmount || null,
        updatedAt: new Date()
      };
      
      const result = await storage.createPitch(pitchData);
      console.log("Draft pitch created:", result);
      
      // Return the created draft
      return res.status(201).json(result);
    } catch (error) {
      console.error('Error creating draft pitch:', error);
      return res.status(500).json({ error: 'Failed to save draft', details: error.message });
    }
  });
  
  // Update an existing draft pitch
  app.put("/api/pitches/:id/draft", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'You must be logged in to update a draft' });
      }
      
      const pitchId = parseInt(req.params.id);
      if (isNaN(pitchId)) {
        return res.status(400).json({ error: 'Invalid pitch ID' });
      }
      
      // Get the existing pitch to verify ownership
      const existingPitch = await storage.getPitch(pitchId);
      
      if (!existingPitch) {
        return res.status(404).json({ error: 'Draft not found' });
      }
      
      // Verify ownership
      if (existingPitch.userId !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this draft' });
      }
      
      console.log("Updating draft pitch ID:", pitchId, "with data:", req.body);
      
      // Extract fields from request
      const content = req.body.content || existingPitch.content || "";
      const audioUrl = req.body.audioUrl || req.body.audio_url || existingPitch.audioUrl || "";
      const transcript = req.body.transcript || existingPitch.transcript || "";
      const bidAmount = Number(req.body.bidAmount || req.body.bid_amount || existingPitch.bidAmount || 0);
      const pitchType = req.body.pitchType || existingPitch.pitchType || 'text';
      
      // Update the draft pitch
      const updateData = {
        id: pitchId,
        content,
        audioUrl,
        transcript,
        bidAmount,
        pitchType,
        isDraft: true,
        status: 'draft',
        updatedAt: new Date()
      };
      
      const result = await storage.updatePitch({
        ...updateData
      });
      console.log("Draft pitch updated:", result);
      
      return res.status(200).json(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: 'Failed to update draft', details: errMsg });
    }
  });
  
  // Get drafts for a user
  app.get("/api/users/:userId/drafts", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'You must be logged in to view drafts' });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const opportunityId = req.query.opportunityId ? parseInt(req.query.opportunityId as string) : undefined;
      
      console.log("Fetching drafts for user:", userId, "and opportunity:", opportunityId);
      
      // Get drafts
      const drafts = await storage.getUserDrafts(userId, opportunityId);
      
      return res.status(200).json(drafts);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      return res.status(500).json({ error: 'Failed to fetch drafts', details: error.message });
    }
  });

  // Get drafts for the current authenticated user
  app.get("/api/users/current/drafts", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'You must be logged in to view drafts' });
      }
      
      const userId = req.user.id;
      if (!userId) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      const opportunityId = req.query.opportunityId ? parseInt(req.query.opportunityId as string) : undefined;
      
      console.log("Fetching drafts for current user:", userId, "and opportunity:", opportunityId);
      
      // Get drafts
      const drafts = await storage.getUserDrafts(userId, opportunityId);
      
      return res.status(200).json(drafts);
    } catch (error) {
      console.error('Error fetching drafts for current user:', error);
      return res.status(500).json({ error: 'Failed to fetch drafts', details: error.message });
    }
  });

  app.post("/api/pitches/voice", async (req: Request, res: Response) => {
    try {
      if (!req.body || !req.body.audio) {
        return res.status(400).json({ message: "No audio data provided" });
      }
      
      const audioData = req.body.audio;
      const result = await processVoiceRecording(audioData);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to process voice recording" });
    }
  });
  
  // ============ SAVED OPPORTUNITIES ENDPOINTS ============
  
  // Get saved opportunities for a user
  app.get("/api/users/:userId/saved", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const saved = await storage.getSavedOpportunitiesByUserId(userId);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved opportunities" });
    }
  });
  
  // Save an opportunity
  app.post("/api/saved", async (req: Request, res: Response) => {
    try {
      const validationResult = insertSavedOpportunitySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validationResult.error.errors 
        });
      }
      
      const savedData = validationResult.data;
      
      // Check if already saved
      const existing = await storage.getSavedOpportunity(savedData.userId, savedData.opportunityId);
      if (existing) {
        return res.status(400).json({ message: "Opportunity already saved" });
      }
      
      const saved = await storage.createSavedOpportunity(savedData);
      res.status(201).json(saved);
    } catch (error) {
      res.status(500).json({ message: "Failed to save opportunity" });
    }
  });
  
  // Unsave an opportunity
  app.delete("/api/users/:userId/saved/:opportunityId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const opportunityId = parseInt(req.params.opportunityId);
      
      if (isNaN(userId) || isNaN(opportunityId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      
      const success = await storage.deleteSavedOpportunity(userId, opportunityId);
      if (!success) {
        return res.status(404).json({ message: "Saved opportunity not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to unsave opportunity" });
    }
  });
  
  // Email endpoints removed

  app.post("/api/test-email", async (req: Request, res: Response) => {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ 
          success: false, 
          message: 'SendGrid API key not configured'
        });
      }

      const { email, subject, message } = req.body;
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is required' 
        });
      }

      // If subject and message are provided, it's a custom support email
      if (subject && message) {
        try {
          const msg = {
            to: email,
            from: 'admin@quotebid.com', // This should be your verified sender email
            subject: subject,
            text: message,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                  <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
                </div>
                <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
                  <h2 style="color: #2d3748;">${subject}</h2>
                  <div style="white-space: pre-wrap;">${message.replace(/\n/g, '<br/>')}</div>
                  <p style="margin-top: 30px;">If you have any questions, please contact our support team.</p>
                </div>
                <div style="text-align: center; padding: 15px; font-size: 12px; color: #718096;">
                  <p>© ${new Date().getFullYear()} QuoteBid. All rights reserved.</p>
                </div>
              </div>
            `
          };
          
          await sgMail.send(msg);
          
          return res.json({ 
            success: true, 
            message: 'Custom support email sent successfully!' 
          });
        } catch (error) {
          console.error('Error sending custom email:', error);
          throw error;
        }
      }
      
      // Default test notification email
      const success = await sendOpportunityNotification([email], {
        title: 'Test PR Platform Email',
        description: 'This is a test email from your PR Platform'
      });
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Test email sent successfully!' 
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message,
        details: error.response?.body || error.toString()
      });
    }
  });

  // ============ USER PROFILE ENDPOINTS ============
  
  // Complete user profile with additional information
  app.patch("/api/users/:userId/profile", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const schema = z.object({
        fullName: z.string().min(1).optional(),
        bio: z.string().optional(),
        location: z.string().optional(),
        title: z.string().optional(),
        industry: z.string().min(1).optional(),
        linkedIn: z.string().url().optional().or(z.string().length(0)),
        instagram: z.string().url().optional().or(z.string().length(0)),
        facebook: z.string().url().optional().or(z.string().length(0)),
        twitter: z.string().url().optional().or(z.string().length(0)),
        website: z.string().url().optional().or(z.string().length(0)),
        pastPrLinks: z.string().optional(),
        avatar: z.string().optional(),
        profileCompleted: z.boolean().optional(),
        doFollowLink: z.string().optional(),
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update the user's profile
      const updatedUser = await getDb().update(users)
        .set({ ...validationResult.data, profileCompleted: true })
        .where(eq(users.id, userId))
        .returning()
        .then(rows => rows[0]);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to update user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });
  
  // Handle avatar upload
  app.post('/api/users/:userId/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Generate the URL for the uploaded file
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
      
      console.log("Avatar uploaded to:", fileUrl);
      
      // Update user's avatar in the database
      const updatedUser = await getDb().update(users)
        .set({ avatar: fileUrl })
        .where(eq(users.id, userId))
        .returning()
        .then(rows => rows[0]);
      
      res.status(200).json({ 
        message: 'Avatar uploaded successfully',
        fileUrl: fileUrl, // Return as fileUrl to match what the client expects
        user: updatedUser
      });
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      res.status(500).json({ message: 'Failed to upload avatar' });
    }
  });
  
  // Handle agreement PDF upload
  app.post('/api/users/:userId/agreement-pdf', async (req: Request, res: Response) => {
    saveAgreementPDF(req, res);
  });
  
  // Get user's existing agreement PDF URL
  app.get('/api/users/:userId/agreement-pdf', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || (userId !== req.user.id && !(req as any).adminUser)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get the user record
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return the agreement PDF URL if it exists
      if (user.agreementPdfUrl) {
        res.json({ pdfUrl: user.agreementPdfUrl, signedAt: user.agreementSignedAt });
      } else {
        res.status(404).json({ message: "No signed agreement found for this user" });
      }
    } catch (error: any) {
      console.error("Error fetching agreement PDF URL:", error);
      res.status(500).json({ message: "Error fetching agreement PDF URL: " + error.message });
    }
  });
  
  // Regenerate user agreement PDFs (admin only)
  app.post('/api/admin/regenerate-agreements', async (req: Request, res: Response) => {
    regenerateAgreementsPDF(req, res);
  });
  
  // Update user industry preference
  // Update user premium status
  app.post("/api/users/:userId/update-premium-status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { status, expiry } = req.body;
      
      // Update user status
      await getDb().update(users)
        .set({ 
          premiumStatus: status,
          premiumExpiry: expiry ? new Date(expiry) : null
        })
        .where(eq(users.id, userId));
      
      res.json({ 
        success: true, 
        message: "Payment processed successfully"
      });
    } catch (error: any) {
      console.error("Error updating premium status:", error);
      res.status(500).json({ message: "Error updating premium status: " + error.message });
    }
  });

  app.patch("/api/users/:userId/industry", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const schema = z.object({
        industry: z.string().min(1)
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid industry data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update the user's industry
      const updatedUser = await getDb().update(users)
        .set({ industry: validationResult.data.industry })
        .where(eq(users.id, userId))
        .returning()
        .then(rows => rows[0]);
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update industry preference" });
    }
  });
  
  // Get user's successful placements with full details
  app.get("/api/users/:userId/pitches", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      console.log(`Fetching pitches for user ID: ${userId}`);
      
      // Try to get pitches with full relations first
      try {
        const pitchesWithRelations = await getDb().select()
          .from(pitches)
          .where(eq(pitches.userId, userId))
          .orderBy(desc(pitches.createdAt));
          
        // If we have pitches, enrich them with relations (opportunity, publication)
        if (pitchesWithRelations.length > 0) {
          console.log(`Found ${pitchesWithRelations.length} pitches for user ${userId}`);
          
          // Get all related data in parallel
          const enrichedPitches = await Promise.all(
            pitchesWithRelations.map(async (pitch) => {
              try {
                // Get opportunity
                const [opportunity] = pitch.opportunityId 
                  ? await getDb().select()
                      .from(opportunities)
                      .where(eq(opportunities.id, pitch.opportunityId))
                  : [null];
                
                // Get publication if opportunity exists
                let publication = null;
                if (opportunity?.publicationId) {
                  const [pub] = await getDb().select()
                    .from(publications)
                    .where(eq(publications.id, opportunity.publicationId));
                  publication = pub;
                }
                
                // Return the pitch with its relations
                return {
                  ...pitch,
                  opportunity: opportunity || undefined,
                  publication: publication || undefined
                };
              } catch (error) {
                console.error(`Error getting relations for pitch ${pitch.id}:`, error);
                return pitch; // Return the pitch without relations
              }
            })
          );
          
          return res.json(enrichedPitches);
        } else {
          console.log(`No pitches found for user ${userId}`);
          return res.json([]);
        }
      } catch (error) {
        console.error('Error fetching user pitches with relations:', error);
        
        // Fall back to basic pitch retrieval
        const basicPitches = await storage.getPitchesByUserId(userId);
        console.log(`Fallback: Found ${basicPitches.length} basic pitches for user ${userId}`);
        return res.json(basicPitches);
      }
    } catch (error) {
      console.error('Error fetching user pitches:', error);
      res.status(500).json({ 
        message: "Error fetching user pitches",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.get("/api/users/:userId/placements", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get basic placements
      const userPlacements = await storage.getPlacementsByUserId(userId);
      
      // For each placement, get full details with relations
      const placementsWithDetails = await Promise.all(
        userPlacements.map(async (placement) => {
          const details = await storage.getPlacementWithRelations(placement.id);
          return details;
        })
      );
      
      // Filter out any undefined results and only return paid or complete placements
      const successfulPlacements = placementsWithDetails
        .filter((p): p is PlacementWithRelations => 
          p !== undefined && (p.status === 'paid' || p.status === 'complete')
        );
      
      res.json(successfulPlacements);
    } catch (error: any) {
      console.error("Failed to fetch user placements:", error);
      res.status(500).json({ message: "Failed to fetch user placements", error: error.message });
    }
  });
  
  // ============ ADMIN ENDPOINTS ============
  
  // Admin registration endpoint (hidden, requires a secret key)
  app.post("/api/admin/register", registerAdmin);
  
  // Check if current user is admin
  app.get("/api/admin/check", requireAdminAuth, (req: Request, res: Response) => {
    res.json({ isAdmin: true });
  });
  
  // Get all admin users (admin only)
  app.get("/api/admin/admins", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const admins = await storage.getAllAdminUsers();
      res.json(admins);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });
  
  // Get all users (admin only)
  app.get("/api/admin/users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Get a single user by ID (admin only)
  app.get("/api/admin/users/:userId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Admin endpoint to reset a user's password
  app.post("/api/admin/reset-password", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { userId, email } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ message: "User ID and email are required" });
      }
      
      // Get the user to ensure they exist and get their username
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Ensure the email matches the user record
      if (user.email !== email) {
        return res.status(400).json({ message: "Email does not match user record" });
      }
      
      // Generate a secure reset token
      const resetToken = randomBytes(32).toString('hex');
      
      // Store the reset token in the database (you'll need to add a resetToken field to your users table)
      // For this implementation, we'll just send the email without storing the token
      
      // Send the password reset email
      const emailSent = await sendPasswordResetEmail(email, resetToken, user.username);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send password reset email" });
      }
      
      res.json({ 
        success: true, 
        message: "Password reset email sent successfully" 
      });
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      res.status(500).json({ 
        message: "Failed to send password reset email", 
        error: error.message || "Unknown error" 
      });
    }
  });
  
  // Previously an endpoint to update a user's admin status
  // This is no longer needed since we have a separate admin users table
  
  // Admin API to get all publications
  app.get("/api/admin/publications", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const publications = await storage.getPublications();
      res.json(publications);
    } catch (error) {
      console.error('Error fetching publications:', error);
      res.status(500).json({ message: 'Failed to fetch publications', error: error });
    }
  });

  // Add a new publication (admin only)
  app.post("/api/admin/publications", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const validationResult = insertPublicationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid publication data", 
          errors: validationResult.error.errors 
        });
      }
      
      const publicationData = validationResult.data;
      const newPublication = await storage.createPublication(publicationData);
      
      res.status(201).json(newPublication);
    } catch (error) {
      res.status(500).json({ message: "Failed to create publication" });
    }
  });

  // Update a publication (admin only)
  app.patch("/api/admin/publications/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }
      
      // Get current publication to check if it exists
      const publication = await storage.getPublication(id);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      // Validate update data
      const validationResult = insertPublicationSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid publication data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Update publication
      const updatedData = validationResult.data;
      const updatedPublication = await storage.updatePublication(id, updatedData);
      
      res.json(updatedPublication);
    } catch (error) {
      console.error('Error updating publication:', error);
      res.status(500).json({ message: "Failed to update publication" });
    }
  });

  // Delete a publication (admin only)
  app.delete("/api/admin/publications/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }
      
      // Get current publication to check if it exists
      const publication = await storage.getPublication(id);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      // Check if there are opportunities using this publication
      const relatedOpportunities = await storage.getOpportunitiesByPublication(id);
      if (relatedOpportunities && relatedOpportunities.length > 0) {
        return res.status(409).json({
          message: "Cannot delete publication with associated opportunities",
          count: relatedOpportunities.length
        });
      }
      
      // Delete publication
      await storage.deletePublication(id);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting publication:', error);
      res.status(500).json({ message: "Failed to delete publication" });
    }
  });
  
  // Add a new opportunity (admin only)
  // Admin API to get all opportunities with publications
  app.get("/api/admin/opportunities", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const opportunities = await storage.getOpportunitiesWithPublications();
      res.json(opportunities);
    } catch (error) {
      console.error('Error fetching admin opportunities:', error);
      res.status(500).json({ message: 'Failed to fetch opportunities', error: error });
    }
  });

  app.post("/api/admin/opportunities", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Log the incoming data for debugging
      console.log("Opportunity creation request data:", JSON.stringify(req.body));
      
      // ---------- HOT-FIX: force pub ID to number ----------
      if (typeof req.body.publicationId === 'string') {
        req.body.publicationId = Number(req.body.publicationId || 0);
        console.log("HOT-FIX: Converted publicationId from string to number:", req.body.publicationId);
      }
      // ------------------------------------------------------
      
      const validationResult = insertOpportunitySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.log("Validation errors:", JSON.stringify(validationResult.error.errors));
        return res.status(400).json({ 
          message: "Invalid opportunity data", 
          errors: validationResult.error.errors 
        });
      }
      
      const opportunityData = validationResult.data;
      
      // Check if publication exists
      const publication = await storage.getPublication(opportunityData.publicationId);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      // Make sure tags is an array
      if (typeof opportunityData.tags === 'string') {
        opportunityData.tags = [opportunityData.tags];
      }
      
      // Ensure deadline is a valid date
      if (opportunityData.deadline && typeof opportunityData.deadline === 'string') {
        try {
          opportunityData.deadline = new Date(opportunityData.deadline);
        } catch (e) {
          console.error("Failed to parse deadline:", e);
        }
      }
      
      console.log("Validated opportunity data:", JSON.stringify(opportunityData));
      const newOpportunity = await storage.createOpportunity(opportunityData);
      console.log("Created opportunity:", JSON.stringify(newOpportunity));
      
      // Notify users in the matching industry
      if (opportunityData.industry) {
        try {
          // Get users who have the matching industry
          const matchingUsers = await storage.getUsersByIndustry(opportunityData.industry);
          
          if (matchingUsers.length > 0) {
            const userEmails = matchingUsers.map((user: User) => user.email);
            
            // Send email notifications
            await sendOpportunityNotification(userEmails, {
              title: newOpportunity.title,
              description: newOpportunity.description
            });
          }
        } catch (emailError) {
          console.error("Failed to send email notifications:", emailError);
          // Continue anyway, don't fail the opportunity creation
        }
      }
      
      // Return the created opportunity with publication data
      const opportunityWithPublication = await storage.getOpportunityWithPublication(newOpportunity.id);
      
      res.status(201).json(opportunityWithPublication || newOpportunity);
    } catch (error) {
      console.error("Failed to create opportunity:", error);
      res.status(500).json({ message: "Failed to create opportunity" });
    }
  });
  
  // Update opportunity status (admin only)
  app.patch("/api/admin/opportunities/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const schema = z.object({
        status: z.string().min(1)
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid status data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { status } = validationResult.data;
      
      const updatedOpportunity = await storage.updateOpportunityStatus(id, status);
      if (!updatedOpportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      res.json(updatedOpportunity);
    } catch (error) {
      res.status(500).json({ message: "Failed to update opportunity status" });
    }
  });
  
  // Get a specific pitch by ID (admin only)
  app.get("/api/admin/pitches/:pitchId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const pitchId = parseInt(req.params.pitchId);
      if (isNaN(pitchId)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const pitch = await storage.getPitchWithRelations(pitchId);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      res.json(pitch);
    } catch (error) {
      console.error("Error fetching pitch details:", error);
      res.status(500).json({ message: "Failed to fetch pitch details" });
    }
  });
  
  // Get all pitches (admin only)
  app.get("/api/admin/pitches", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log("Admin requesting all pitches");
      
      // Get admin info for logging
      const adminUser = (req as any).adminUser;
      console.log(`Admin user authenticated: ${adminUser?.username}`);
      
      // For testing - import sample data if no real pitches exist
      const { samplePitches } = await import('./data/pitches');
      
      try {
        // First try to get pitches with full relations
        console.log("Fetching pitches with relations");
        const pitchesWithRelations = await storage.getAllPitchesWithRelations();
        
        console.log(`Retrieved ${pitchesWithRelations.length} pitches with complete relations`);
        
        // Get raw pitch data to compare against relations data
        const rawPitches = await storage.getAllPitches();
        console.log(`Raw pitch count: ${rawPitches.length}. With relations: ${pitchesWithRelations.length}`);
        if (rawPitches.length > pitchesWithRelations.length) {
          console.log("Some pitches may be missing relations!");
          
          // Identify which pitches might be missing
          const pitchesWithRelationsIds = new Set(pitchesWithRelations.map(p => p.id));
          const missingRelationsPitches = rawPitches.filter(p => !pitchesWithRelationsIds.has(p.id));
          
          if (missingRelationsPitches.length > 0) {
            console.log(`Found ${missingRelationsPitches.length} pitches missing relations:`, 
              missingRelationsPitches.map(p => ({
                id: p.id,
                userId: p.userId,
                user_id: (p as any).user_id,
                opportunityId: p.opportunityId
              })));
          }
        }
        
        if (pitchesWithRelations.length > 0) {
          // Standardize the pitch format to ensure consistent user ID field
          const standardizedPitches = pitchesWithRelations.map(pitch => ({
            ...pitch,
            userId: pitch.userId || (pitch as any).user_id, // Ensure userId is always in camelCase
          }));
          
          // Add detailed logging for pitch user relations
          standardizedPitches.forEach(pitch => {
            if (!pitch.user) {
              console.log(`Pitch ${pitch.id} is missing user relation! User ID: ${pitch.userId}`);
            }
            if (!pitch.opportunity) {
              console.log(`Pitch ${pitch.id} is missing opportunity relation! Opportunity ID: ${pitch.opportunityId}`);
            }
          });
          
          // Log all pitch user IDs
          console.log("Pitch user IDs (with relations):", standardizedPitches.map(p => p.userId).join(", "));
          
          // Return standardized pitches
          return res.json(standardizedPitches);
        }
        
        // If no pitches with relations found, fall back to basic pitch data
        console.log("No pitches with relations found, falling back to basic data");
        const basicPitches = await storage.getAllPitches();
        
        if (basicPitches.length > 0) {
          // Standardize the pitch format
          const standardizedBasicPitches = basicPitches.map(pitch => ({
            ...pitch,
            userId: pitch.userId || (pitch as any).user_id, // Ensure userId is always in camelCase
          }));
          
          console.log(`Found ${standardizedBasicPitches.length} pitches with basic data`);
          // Log all pitch user IDs
          console.log("Pitch user IDs (basic):", standardizedBasicPitches.map(p => p.userId).join(", "));
          
          return res.json(standardizedBasicPitches);
        }
        
        // Last resort fallback to direct database query
        console.log("No pitches found, attempting direct query fallback");
        const { pitches } = await import("@shared/schema");
        const fallbackPitches = await getDb().select().from(pitches);
        
        // Standardize direct query results
        const standardizedFallbackPitches = fallbackPitches.map(pitch => {
          // Handle potential snake_case fields
          const userId = pitch.userId || (pitch as any).user_id;
          const opportunityId = pitch.opportunityId || (pitch as any).opportunity_id;
          
          return {
            ...pitch,
            userId: userId,
            opportunityId: opportunityId,
          };
        });
        
        console.log(`Fallback query found ${standardizedFallbackPitches.length} pitches`);
        return res.json(standardizedFallbackPitches);
      } catch (storageError) {
        console.error("Error fetching pitches with relations:", storageError);
        
        try {
          // Try basic pitches as fallback
          const basicPitches = await storage.getAllPitches();
          
          // Standardize basic pitches
          const standardizedBasicPitches = basicPitches.map(pitch => ({
            ...pitch,
            userId: pitch.userId || (pitch as any).user_id, // Ensure userId is always in camelCase
          }));
          
          console.log(`Fallback to basic pitches returned ${standardizedBasicPitches.length} results`);
          return res.json(standardizedBasicPitches);
        } catch (basicError) {
          // Last resort direct query
          console.error("Error with basic pitches, using direct query:", basicError);
          const { pitches } = await import("@shared/schema");
          const directPitches = await getDb().select().from(pitches);
          
          // Standardize direct query results
          const standardizedDirectPitches = directPitches.map(pitch => {
            const userId = pitch.userId || (pitch as any).user_id;
            return {
              ...pitch,
              userId: userId,
            };
          });
          
          console.log(`Direct query fallback found ${standardizedDirectPitches.length} pitches`);
            
          // Only use sample data when we have no pitches
          if (standardizedDirectPitches.length === 0) {
            console.log(`No pitches found in database, using ${samplePitches.length} sample pitches as fallback`);
            return res.json(samplePitches);
          }
          
          return res.json(standardizedDirectPitches);
        }
      }
    } catch (error) {
      console.error("Error fetching all pitches:", error);
      res.status(500).json({ message: "Failed to fetch pitches" });
    }
  });
  
  // Debug endpoint to check the latest pitch
  app.get("/api/debug/latest-pitch", async (req: Request, res: Response) => {
    try {
      const pitches = await storage.getAllPitches();
      
      if (pitches && pitches.length > 0) {
        // Sort pitches by ID descending to get the latest one
        const sortedPitches = [...pitches].sort((a, b) => b.id - a.id);
        const latestPitch = sortedPitches[0];
        
        console.log("Latest pitch:", {
          id: latestPitch.id,
          userId: latestPitch.userId,
          opportunityId: latestPitch.opportunityId,
          content: latestPitch.content ? latestPitch.content.substring(0, 50) + (latestPitch.content.length > 50 ? '...' : '') : '',
          createdAt: latestPitch.createdAt
        });
        
        res.json({
          message: "Latest pitch found",
          pitch: latestPitch,
          totalPitches: pitches.length
        });
      } else {
        res.json({ message: "No pitches found", totalPitches: 0 });
      }
    } catch (error) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({ message: "Error checking latest pitch" });
    }
  });
  
  // Create a new placement
  app.post("/api/admin/placements", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const {
        pitchId,
        userId,
        opportunityId,
        publicationId,
        articleTitle,
        articleUrl,
        amount,
        status = 'ready_for_billing',
        notes,
      } = req.body;

      // Create the placement
      const placement = await storage.createPlacement({
        pitchId,
        userId,
        opportunityId,
        publicationId,
        articleTitle,
        articleUrl,
        amount,
        status,
      });

      res.status(201).json(placement);
    } catch (error: any) {
      console.error("Failed to create placement:", error);
      res.status(500).json({ message: "Failed to create placement", error: error.message });
    }
  });
  
  // Update pitch status (admin only)
  app.patch("/api/admin/pitches/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const schema = z.object({
        status: z.string().min(1),
        // Optional fields for successful pitches
        articleTitle: z.string().optional(),
        articleUrl: z.string().optional()
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid status data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { status, articleTitle, articleUrl } = validationResult.data;
      
      const updatedPitch = await storage.updatePitchStatus(id, status);
      if (!updatedPitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      // If the pitch is marked as successful, create a placement
      console.log("Pitch status being set to:", status);
      if (status === 'successful' || status === 'Successful Coverage') {
        try {
          // Fetch the pitch with related data to get all necessary information
          const pitch = await storage.getPitch(id);
          
          if (!pitch) {
            console.error("Could not find pitch even though it was just updated");
            return res.status(404).json({ message: "Pitch not found" });
          }
          
          // Get the opportunity to get publication ID
          const opportunity = await storage.getOpportunity(pitch.opportunityId);
          if (!opportunity) {
            console.error("Associated opportunity not found");
            return res.status(404).json({ message: "Associated opportunity not found" });
          }
          
          // Get highest bid amount
          const highestBid = await storage.getHighestBidForOpportunity(opportunity.id);
          
          // Create a placement with payment intent ID from the pitch
          await storage.createPlacement({
            pitchId: pitch.id,
            userId: pitch.userId,
            opportunityId: pitch.opportunityId,
            publicationId: opportunity.publicationId,
            amount: highestBid || 0, // Default to 0 if no bids
            articleTitle: articleTitle || opportunity.title,
            articleUrl: articleUrl || '',
            status: 'ready_for_billing',
            // Transfer payment intent ID from the pitch to the placement (if exists)
            paymentIntentId: pitch.paymentIntentId ? pitch.paymentIntentId.toString() : undefined
          });
        } catch (placementError) {
          console.error("Error creating placement:", placementError);
          // Still return the updated pitch even if placement creation fails
        }
      }
      
      res.json(updatedPitch);
    } catch (error: any) {
      console.error("Failed to update pitch status:", error);
      res.status(500).json({ message: "Failed to update pitch status", error: error.message });
    }
  });

  // Update or add coverage link to a pitch (admin only)
  app.patch("/api/admin/pitches/:id/coverage", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const schema = z.object({
        url: z.string().url("Must be a valid URL").min(1),
        title: z.string().optional()
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid coverage link data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { url, title } = validationResult.data;
      
      // Fetch the pitch to ensure it exists
      const pitch = await storage.getPitch(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      // Update the pitch with article information
      const updatedPitch = await storage.updatePitchArticle(id, {
        url,
        title: title || url
      });
      
      if (!updatedPitch) {
        return res.status(500).json({ message: "Failed to update pitch coverage" });
      }
      
      res.json(updatedPitch);
    } catch (error: any) {
      console.error("Error updating pitch coverage:", error);
      res.status(500).json({ message: "Failed to update pitch coverage: " + error.message });
    }
  });

  // ============ ADMIN CURRENT USER ENDPOINT ============
  
  // Get current admin user
  app.get("/api/admin/current", requireAdminAuth, (req: Request, res: Response) => {
    // The admin user is added to the request by the requireAdminAuth middleware
    const adminUser = (req as any).adminUser;
    if (!adminUser) {
      return res.status(401).json({ message: "Not authenticated as admin" });
    }
    res.json(adminUser);
  });
  
  // This endpoint is retained for admin testing purposes only
  // PDFs are automatically regenerated when needed
  app.post("/api/admin/regenerate-agreements", requireAdminAuth, regenerateAgreementsPDF);
  
  // Add middleware to automatically check and regenerate PDFs when needed
  app.use('/api/user/:userId/agreement-pdf', async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!isNaN(userId)) {
        const user = await storage.getUser(userId);
        // Regenerate PDF if user exists but has no PDF or an outdated format
        if (user && (!user.agreementPdfUrl || !user.agreementPdfUrl.includes('_'))) {
          // Use the professional PDF generator
          const pdfContent = generateProfessionalPDF(user);
          // Generate a new PDF file path
          const pdfUrl = await createAgreementPDF(user.id, pdfContent);
          // Update the user record with the new PDF URL
          await getDb().update(users)
            .set({
              agreementPdfUrl: pdfUrl,
              agreementSignedAt: user.agreementSignedAt || new Date()
            })
            .where(eq(users.id, user.id));
            
          console.log(`Automatically regenerated PDF for user ${userId}`);
        }
      }
      next();
    } catch (error) {
      // Don't block the request if PDF regeneration fails
      console.error('Error in automatic PDF regeneration:', error);
      next();
    }
  });
  
  // Ensure user has a Stripe customer ID (admin only)
  app.post("/api/admin/users/:userId/ensure-stripe-customer", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If the user already has a customer ID, return it
      if (user.stripeCustomerId) {
        console.log(`User ${userId} already has Stripe customer ID: ${user.stripeCustomerId}`);
        return res.json({ 
          userId, 
          stripeCustomerId: user.stripeCustomerId,
          message: "User already has a Stripe customer ID"
        });
      }
      
      if (!user.email) {
        return res.status(400).json({ message: "User does not have an email address" });
      }
      
      // Create a new Stripe customer
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName || user.username,
          metadata: {
            userId: user.id.toString()
          }
        });
        
        console.log(`Created Stripe customer for user ${userId}: ${customer.id}`);
        
        // Update the user with the new customer ID
        const [updatedUser] = await getDb().update(users)
          .set({ stripeCustomerId: customer.id })
          .where(eq(users.id, userId))
          .returning();
        
        return res.status(201).json({ 
          userId, 
          stripeCustomerId: customer.id,
          message: "Created new Stripe customer ID for user"
        });
      } catch (stripeError: any) {
        console.error("Stripe customer creation failed:", stripeError);
        return res.status(500).json({ 
          message: `Failed to create Stripe customer: ${stripeError.message}`, 
          error: stripeError
        });
      }
    } catch (error: any) {
      console.error("Error ensuring Stripe customer:", error);
      res.status(500).json({ message: "Failed to ensure Stripe customer: " + error.message });
    }
  });

  // Get user activity statistics (admin only)
  app.get("/api/admin/user-activity", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get all users
      const users = await storage.getAllUsers();
      
      // Get current timestamp
      const now = new Date();
      
      // Calculate time thresholds
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // For a real implementation, we would check login timestamps,
      // but since we don't track that yet, we'll simulate it with registration dates
      // In a production environment, you would track user sessions
      
      // Get active users based on creation date (as a proxy for activity)
      const activeToday = users.filter(user => {
        return user.createdAt && new Date(user.createdAt) > oneDayAgo;
      }).length;
      
      const activeThisWeek = users.filter(user => {
        return user.createdAt && new Date(user.createdAt) > oneWeekAgo;
      }).length;
      
      // Return activity stats
      res.json({
        totalUsers: users.length,
        activeToday,
        activeThisWeek,
        // In a real implementation, add "currentlyOnline" from session data
        currentlyOnline: Math.min(3, Math.floor(users.length / 4)) // Simulated value for demonstration
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to get user activity statistics: " + error.message
      });
    }
  });
  
  // ============ PLACEMENTS MANAGEMENT ENDPOINTS ============
  
  // Get all placements with relations (admin only)
  app.get("/api/admin/placements", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const placements = await storage.getAllPlacements();
      res.json(placements);
    } catch (error: any) {
      console.error("Failed to fetch placements:", error);
      res.status(500).json({ message: "Failed to fetch placements", error: error.message });
    }
  });
  
  // Get a single placement with relations (admin only)
  app.get("/api/admin/placements/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      const placement = await storage.getPlacementWithRelations(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      res.json(placement);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch placement: " + error.message });
    }
  });
  
  // Update placement status (admin only)
  app.patch("/api/admin/placements/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      const schema = z.object({
        status: z.string().min(1)
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid status data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { status } = validationResult.data;
      
      const updatedPlacement = await storage.updatePlacementStatus(id, status);
      if (!updatedPlacement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      res.json(updatedPlacement);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update placement status: " + error.message });
    }
  });
  
  // Upload article for a placement (admin only)
  app.post("/api/admin/placements/:id/upload", requireAdminAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement
      const placement = await storage.getPlacement(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // Get file path if a file was uploaded
      const filePath = req.file ? `/uploads/${req.file.filename}` : null;
      
      // Update the placement with the article URL from request body if provided
      const articleUrl = req.body.articleUrl || placement.articleUrl;
      
      // Update the placement with the article URL and file path
      await storage.updatePlacementArticle(id, {
        articleUrl,
        articleFilePath: filePath || undefined
      });
      
      res.json({
        success: true,
        message: "Article uploaded successfully",
        filePath,
        articleUrl
      });
    } catch (error: any) {
      console.error("Failed to upload article:", error);
      res.status(500).json({ message: "Failed to upload article", error: error.message });
    }
  });

  // Process billing for a placement (admin only)
  app.post("/api/admin/placements/:id/bill", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement
      let placement = await storage.getPlacementWithRelations(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // Check for invalid user reference and fix it automatically
      if (!placement.user) {
        console.log(`Placement ${id} has missing user reference. Fixing automatically...`);
        
        // Find a valid user with email
        const validUsers = await getDb().execute<{id: number, email: string}[]>(
          sql`SELECT id, email FROM users WHERE email IS NOT NULL AND email != '' ORDER BY id ASC LIMIT 1`
        );
        
        if (!validUsers.rows || validUsers.rows.length === 0) {
          return res.status(500).json({ 
            message: "No valid users with email found. Cannot perform billing without a valid user."
          });
        }
        
        const validUserId = validUsers.rows[0].id;
        
        // Update the placement with a valid user ID
        await getDb().execute(
          sql`UPDATE placements SET "userId" = ${validUserId} WHERE id = ${id}`
        );
        
        console.log(`Fixed placement ${id}: Updated with valid user ID ${validUserId}`);
        
        // Refresh the placement data to get the new user
        placement = await storage.getPlacementWithRelations(id);
        
        if (!placement || !placement.user) {
          return res.status(500).json({ 
            message: "Failed to fix invalid user reference. Please try again or contact support." 
          });
        }
      }
      
      // Check if the placement is already paid
      if (placement.status === 'paid') {
        return res.status(400).json({ message: "This placement has already been paid" });
      }
      
      // Update article URL if provided
      if (req.body.articleUrl) {
        await storage.updatePlacementArticle(id, { articleUrl: req.body.articleUrl });
      }
      
      // First check if there's a payment intent already associated with the pitch
      // If yes, try to capture that payment intent instead of creating a new one
      const associatedPitch = placement.pitch;
      
      if (associatedPitch && associatedPitch.paymentIntentId) {
        console.log(`Found existing payment intent ${associatedPitch.paymentIntentId} for pitch ${associatedPitch.id}`);
        
        try {
          // Retrieve the payment intent to verify its state
          const paymentIntent = await stripe.paymentIntents.retrieve(associatedPitch.paymentIntentId);
          
          if (paymentIntent.status === 'requires_capture') {
            console.log(`Capturing existing payment intent ${paymentIntent.id}`);
            
            // Capture the authorized payment
            const capturedIntent = await stripe.paymentIntents.capture(paymentIntent.id);
            
            // Update the placement with payment info
            const updatedPlacement = await storage.updatePlacementPayment(
              id,
              capturedIntent.id,
              capturedIntent.id
            );
            
            // Update the status to paid
            const paidPlacement = await storage.updatePlacementStatus(id, 'paid');
            
            return res.json({
              success: true,
              placement: paidPlacement,
              paymentIntent: {
                id: capturedIntent.id,
                status: capturedIntent.status
              },
              paymentSource: 'captured_intent'
            });
          } else {
            console.log(`Payment intent ${paymentIntent.id} is in ${paymentIntent.status} state, creating new payment`);
            // Continue with creating new payment below
          }
        } catch (stripeError) {
          console.error("Error retrieving/capturing payment intent:", stripeError);
          // Continue with creating new payment below
        }
      }
      
      // Create a payment intent with Stripe
      // If user doesn't have a Stripe customer ID, create one automatically
      if (!placement.user.stripeCustomerId) {
        // Check if user has email address
        if (!placement.user.email) {
          // Try to update the user with an email address
          await getDb().execute(
            sql`UPDATE users SET email = username || '@example.com' WHERE id = ${placement.user.id} AND (email IS NULL OR email = '')`
          );
          
          // Refresh the user data
          placement = await storage.getPlacementWithRelations(id);
          
          // If still no email, we can't proceed
          if (!placement.user.email) {
            return res.status(400).json({ message: "User does not have an email address, cannot create Stripe customer" });
          }
        }
        
        try {
          // Create a new Stripe customer
          const customer = await stripe.customers.create({
            email: placement.user.email,
            name: placement.user.fullName || placement.user.username,
            metadata: {
              userId: placement.user.id.toString()
            }
          });
          
          console.log(`Created Stripe customer for user ${placement.user.id}: ${customer.id}`);
          
          // Update the user with the new customer ID
          const [updatedUser] = await getDb().update(users)
            .set({ stripeCustomerId: customer.id })
            .where(eq(users.id, placement.user.id))
            .returning();
          
          // Update the placement.user with the new customer ID for this transaction
          placement.user.stripeCustomerId = customer.id;
          console.log(`Updated user with Stripe customer ID: ${customer.id}`);
        } catch (stripeError: any) {
          console.error("Failed to create Stripe customer:", stripeError);
          return res.status(400).json({ 
            message: `Failed to create Stripe customer: ${stripeError.message}`, 
            error: stripeError 
          });
        }
      }
      
      try {
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(placement.amount * 100), // Convert to cents
          currency: 'usd',
          customer: placement.user.stripeCustomerId,
          description: `Payment for article in ${placement.publication.name}`,
          metadata: {
            placementId: placement.id.toString(),
            publicationName: placement.publication.name,
            articleTitle: placement.articleTitle || placement.opportunity.title
          },
          confirm: true, // Try to confirm immediately
          off_session: true // Since this is being done by admin, not user
        });
        
        // Update the placement with payment info
        const updatedPlacement = await storage.updatePlacementPayment(
          id,
          paymentIntent.id,
          paymentIntent.id
        );
        
        // Update the status to paid
        const paidPlacement = await storage.updatePlacementStatus(id, 'paid');
        
        res.json({
          success: true,
          placement: paidPlacement,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status
          },
          paymentSource: 'new_intent'
        });
      } catch (stripeError: any) {
        // Update placement to failed status
        await storage.updatePlacementStatus(id, 'failed');
        
        return res.status(400).json({
          message: `Payment failed: ${stripeError.message}`,
          error: stripeError
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to process billing: " + error.message });
    }
  });
  
  // Retry failed payment (admin only)
  app.post("/api/admin/placements/:id/retry-billing", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement
      let placement = await storage.getPlacementWithRelations(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // Check for invalid user reference and fix it automatically
      if (!placement.user) {
        console.log(`Placement ${id} has missing user reference during retry. Fixing automatically...`);
        
        // Find a valid user with email
        const validUsers = await getDb().execute<{id: number, email: string}[]>(
          sql`SELECT id, email FROM users WHERE email IS NOT NULL AND email != '' ORDER BY id ASC LIMIT 1`
        );
        
        if (!validUsers.rows || validUsers.rows.length === 0) {
          return res.status(500).json({ 
            message: "No valid users with email found. Cannot perform billing without a valid user."
          });
        }
        
        const validUserId = validUsers.rows[0].id;
        
        // Update the placement with a valid user ID
        await getDb().execute(
          sql`UPDATE placements SET "userId" = ${validUserId} WHERE id = ${id}`
        );
        
        console.log(`Fixed placement ${id} during retry: Updated with valid user ID ${validUserId}`);
        
        // Refresh the placement data to get the new user
        placement = await storage.getPlacementWithRelations(id);
        
        if (!placement || !placement.user) {
          return res.status(500).json({ 
            message: "Failed to fix invalid user reference during retry. Please try again or contact support." 
          });
        }
      }
      
      // Check if the placement is in failed status
      if (placement.status !== 'failed') {
        return res.status(400).json({ message: "Only failed payments can be retried" });
      }
      
      // Create a new payment intent with Stripe
      // If user doesn't have a Stripe customer ID, create one automatically
      if (!placement.user.stripeCustomerId) {
        // Check if user has email address
        if (!placement.user.email) {
          // Try to update the user with an email address
          await getDb().execute(
            sql`UPDATE users SET email = username || '@example.com' WHERE id = ${placement.user.id} AND (email IS NULL OR email = '')`
          );
          
          // Refresh the user data
          placement = await storage.getPlacementWithRelations(id);
          
          // If still no email, we can't proceed
          if (!placement.user.email) {
            return res.status(400).json({ message: "User does not have an email address, cannot create Stripe customer" });
          }
        }
        
        try {
          // Create a new Stripe customer
          const customer = await stripe.customers.create({
            email: placement.user.email,
            name: placement.user.fullName || placement.user.username,
            metadata: {
              userId: placement.user.id.toString()
            }
          });
          
          console.log(`Created Stripe customer for user ${placement.user.id}: ${customer.id}`);
          
          // Update the user with the new customer ID
          const [updatedUser] = await getDb().update(users)
            .set({ stripeCustomerId: customer.id })
            .where(eq(users.id, placement.user.id))
            .returning();
          
          // Update the placement.user with the new customer ID for this transaction
          placement.user.stripeCustomerId = customer.id;
          console.log(`Updated user with Stripe customer ID: ${customer.id}`);
        } catch (stripeError: any) {
          console.error("Failed to create Stripe customer:", stripeError);
          return res.status(400).json({ 
            message: `Failed to create Stripe customer: ${stripeError.message}`, 
            error: stripeError 
          });
        }
      }
      
      try {
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(placement.amount * 100), // Convert to cents
          currency: 'usd',
          customer: placement.user.stripeCustomerId,
          description: `Payment for article in ${placement.publication.name}`,
          metadata: {
            placementId: placement.id.toString(),
            publicationName: placement.publication.name,
            articleTitle: placement.articleTitle || placement.opportunity.title
          },
          confirm: true, // Try to confirm immediately
          off_session: true // Since this is being done by admin, not user
        });
        
        // Update the placement with payment info
        const updatedPlacement = await storage.updatePlacementPayment(
          id,
          paymentIntent.id,
          paymentIntent.id
        );
        
        // Update the status to paid
        const paidPlacement = await storage.updatePlacementStatus(id, 'paid');
        
        res.json({
          success: true,
          placement: paidPlacement,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status
          }
        });
      } catch (stripeError: any) {
        return res.status(400).json({
          message: `Retry payment failed: ${stripeError.message}`,
          error: stripeError
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retry billing: " + error.message });
    }
  });
  
  // Fix invalid user IDs in placements (admin only)
  app.post("/api/admin/fix-placement-users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get all valid users first, prioritizing those with emails for Stripe integration
      const allUsers = await getDb().execute<{id: number, email: string, username: string}[]>(
        sql`SELECT id, email, username FROM users ORDER BY 
            CASE WHEN email IS NOT NULL AND email != '' THEN 0 ELSE 1 END, 
            id ASC`
      );
      
      if (!allUsers.rows || allUsers.rows.length === 0) {
        return res.status(500).json({ 
          message: "Failed to fix placements - no valid users found in the system" 
        });
      }
      
      // Get the best user to use as default (one with email)
      const defaultUser = allUsers.rows[0];
      
      console.log(`Using default user ID ${defaultUser.id} for fixing placements`);
      
      // Find all placements with invalid user references - using snake_case column names
      const invalidUserPlacements = await getDb().execute<{id: number, user_id: number}[]>(
        sql`SELECT p.id, p.user_id 
            FROM placements p 
            LEFT JOIN users u ON p.user_id = u.id 
            WHERE u.id IS NULL`
      );
      
      // Stripe customer ID functionality removed as requested
      const needsStripeCustomerPlacements = { rows: [] };
      
      // Find all placements with valid users but missing emails - using snake_case column names
      const needsEmailPlacements = await getDb().execute<{id: number, user_id: number, username: string}[]>(
        sql`SELECT p.id, p.user_id, u.username
            FROM placements p 
            JOIN users u ON p.user_id = u.id 
            WHERE (u.email IS NULL OR u.email = '')`
      );
      
      const results = {
        invalidUsers: {
          count: invalidUserPlacements.rows?.length || 0,
          fixed: 0
        },
        missingEmails: {
          count: needsEmailPlacements.rows?.length || 0, 
          fixed: 0
        },
        missingStripeCustomers: {
          count: needsStripeCustomerPlacements.rows?.length || 0,
          fixed: 0
        },
        errors: 0,
        details: [] as {id: number, type: string, message: string}[]
      };
      
      // Fix invalid user references
      if (invalidUserPlacements.rows && invalidUserPlacements.rows.length > 0) {
        for (const placement of invalidUserPlacements.rows) {
          try {
            await getDb().execute(
              sql`UPDATE placements SET user_id = ${defaultUser.id} WHERE id = ${placement.id}`
            );
            
            results.invalidUsers.fixed++;
            results.details.push({
              id: placement.id,
              type: 'invalid_user_fixed',
              message: `Updated user_id from ${placement.user_id} to ${defaultUser.id}`
            });
          } catch (error) {
            results.errors++;
            results.details.push({
              id: placement.id,
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
      
      // Fix missing emails - make sure users have valid emails for Stripe
      if (needsEmailPlacements.rows && needsEmailPlacements.rows.length > 0) {
        for (const placement of needsEmailPlacements.rows) {
          try {
            // Generate a fallback email using username
            await getDb().execute(
              sql`UPDATE users SET email = ${placement.username + '@example.com'} 
                  WHERE id = ${placement.user_id} AND (email IS NULL OR email = '')`
            );
            
            results.missingEmails.fixed++;
            results.details.push({
              id: placement.id,
              type: 'email_fixed',
              message: `Added fallback email for user ${placement.user_id}`
            });
          } catch (error) {
            results.errors++;
            results.details.push({
              id: placement.id,
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
      
      // Create Stripe customers for users who need them
      if (needsStripeCustomerPlacements.rows && needsStripeCustomerPlacements.rows.length > 0) {
        for (const placement of needsStripeCustomerPlacements.rows) {
          try {
            // Create a Stripe customer
            const customer = await stripe.customers.create({
              email: placement.email,
              name: placement.username,
              metadata: {
                userId: placement.user_id.toString()
              }
            });
            
            // Update the user with the Stripe customer ID
            await getDb().execute(
              sql`UPDATE users SET "stripeCustomerId" = ${customer.id} WHERE id = ${placement.user_id}`
            );
            
            results.missingStripeCustomers.fixed++;
            results.details.push({
              id: placement.id,
              type: 'stripe_customer_created',
              message: `Created Stripe customer ${customer.id} for user ${placement.user_id}`
            });
          } catch (error) {
            results.errors++;
            results.details.push({
              id: placement.id,
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
      
      // Force refresh to clear any cached data
      if (results.invalidUsers.fixed > 0 || results.missingEmails.fixed > 0 || results.missingStripeCustomers.fixed > 0) {
        console.log("Refreshing database cache after fixing placements");
        // This will ensure future queries get fresh data
        await getDb().execute(sql`SELECT 1`);
      }
      
      res.json({
        status: 'success',
        results
      });
    } catch (error: any) {
      console.error("Failed to fix placement user IDs:", error);
      res.status(500).json({ 
        status: 'error',
        message: "Failed to fix placement user IDs", 
        error: error.message 
      });
    }
  });
  
  // Auto-fix middleware completely disabled as requested
  // No more automatic fixing of user references in placements
  // No more toast notifications will appear
  
  // Force sync of successful pitches to placements (admin only)
  // ============ ANNOTATION ENDPOINTS ============
  
  // Get all annotations for a document
  app.get("/api/annotations/:documentId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const documentId = req.params.documentId;
      const annotations = await storage.getAnnotations(documentId);
      
      res.json(annotations);
    } catch (error: any) {
      console.error("Error fetching annotations:", error);
      res.status(500).json({ message: "Failed to fetch annotations: " + error.message });
    }
  });
  
  // Create a new annotation
  app.post("/api/annotations", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { documentId, documentType, content, position, color } = req.body;
      
      if (!documentId || !documentType || !content || !position) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const annotation = await storage.createAnnotation({
        documentId,
        documentType,
        userId: req.user.id,
        content,
        position,
        color: color || "yellow"
      });
      
      res.status(201).json(annotation);
    } catch (error: any) {
      console.error("Error creating annotation:", error);
      res.status(500).json({ message: "Failed to create annotation: " + error.message });
    }
  });
  
  // Update an annotation
  app.patch("/api/annotations/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }
      
      const annotation = await storage.getAnnotation(id);
      if (!annotation) {
        return res.status(404).json({ message: "Annotation not found" });
      }
      
      // Only the creator can update their annotation
      if (annotation.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized: You can only update your own annotations" });
      }
      
      const updatedAnnotation = await storage.updateAnnotation(id, req.body);
      res.json(updatedAnnotation);
    } catch (error: any) {
      console.error("Error updating annotation:", error);
      res.status(500).json({ message: "Failed to update annotation: " + error.message });
    }
  });
  
  // Mark annotation as resolved
  app.post("/api/annotations/:id/resolve", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }
      
      const resolvedAnnotation = await storage.resolveAnnotation(id);
      res.json(resolvedAnnotation);
    } catch (error: any) {
      console.error("Error resolving annotation:", error);
      res.status(500).json({ message: "Failed to resolve annotation: " + error.message });
    }
  });
  
  // Get all comments for an annotation
  app.get("/api/annotations/:id/comments", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }
      
      const comments = await storage.getAnnotationComments(id);
      res.json(comments);
    } catch (error: any) {
      console.error("Error fetching annotation comments:", error);
      res.status(500).json({ message: "Failed to fetch comments: " + error.message });
    }
  });
  
  // Update a pitch (content only)
  app.patch("/api/pitches/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const pitch = await storage.getPitch(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      // Only the creator can update their pitch
      if (pitch.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized: You can only update your own pitches" });
      }
      
      // Only allow updates for pitches with 'pending' status
      if (pitch.status !== 'pending') {
        return res.status(400).json({ 
          message: "Cannot edit pitch: Only pitches with 'pending' status can be edited" 
        });
      }
      
      // Validate that we have content
      if (!req.body.content || req.body.content.trim() === '') {
        return res.status(400).json({ message: "Pitch content cannot be empty" });
      }
      
      // Only update the content field
      const updatedPitch = await storage.updatePitch(id, { content: req.body.content });
      res.json(updatedPitch);
    } catch (error: any) {
      console.error("Error updating pitch:", error);
      res.status(500).json({ message: "Failed to update pitch: " + error.message });
    }
  });
  
  // Submit a pitch (change status from pending to sent)
  app.patch("/api/pitches/:id/submit", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const pitch = await storage.getPitch(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      // Only the creator can submit their pitch
      if (pitch.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized: You can only submit your own pitches" });
      }
      
      // Allow submission for both 'pending' and 'draft' statuses
      if (pitch.status !== 'pending' && pitch.status !== 'draft') {
        return res.status(400).json({ 
          message: "Cannot submit pitch: Only pitches with 'pending' or 'draft' status can be submitted" 
        });
      }
      
      // Update the status to 'sent' (updatePitchStatus will also set isDraft to false)
      const updatedPitch = await storage.updatePitchStatus(id, 'sent');
      
      console.log(`Pitch ${id} submitted successfully. Status updated from ${pitch.status} to 'sent', isDraft set to false`);
      res.json(updatedPitch);
    } catch (error: any) {
      console.error("Error submitting pitch:", error);
      res.status(500).json({ message: "Failed to submit pitch: " + error.message });
    }
  });
  
  // ============ ADMIN BILLING ENDPOINTS ============
  
  // Helper function to check if a user is an admin
  function isAdmin(req: Request): boolean {
    return req.isAuthenticated() && req.user && 'role' in req.user && req.user.role === 'admin';
  }
  
  // Get all pitches with payment information for admin billing
  app.get("/api/admin/billing/pitches", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !isAdmin(req)) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      
      // Get all pitches with their relations
      const pitches = await storage.getAllPitchesWithRelations();
      
      // Filter and format the pitches for billing
      const billingPitches = pitches
        .filter(pitch => pitch.status === 'successful') // Only successful pitches are billable
        .map(pitch => ({
          id: pitch.id,
          userId: pitch.userId,
          opportunityId: pitch.opportunityId,
          paymentIntentId: pitch.paymentIntentId,
          bidAmount: pitch.bidAmount,
          authorizationExpiresAt: pitch.authorizationExpiresAt,
          billedAt: pitch.billedAt,
          stripeChargeId: pitch.stripeChargeId,
          billingError: pitch.billingError,
          status: pitch.status,
          createdAt: pitch.createdAt,
          user: {
            id: pitch.user.id,
            username: pitch.user.username,
            fullName: pitch.user.fullName,
            email: pitch.user.email,
            stripeCustomerId: pitch.user.stripeCustomerId
          },
          opportunity: {
            id: pitch.opportunity.id,
            title: pitch.opportunity.title,
            publication: pitch.publication ? {
              id: pitch.publication.id,
              name: pitch.publication.name
            } : null
          }
        }));
      
      res.json(billingPitches);
    } catch (error: any) {
      console.error("Error fetching billing pitches:", error);
      res.status(500).json({ message: "Failed to fetch billing data: " + error.message });
    }
  });
  
  // Get payment intent details for a specific pitch
  app.get("/api/admin/billing/pitch/:id/payment", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !isAdmin(req)) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      // Get the pitch with payment intent ID
      const pitch = await storage.getPitchWithRelations(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      if (!pitch.paymentIntentId) {
        return res.status(400).json({ message: "No payment intent associated with this pitch" });
      }
      
      // Get the payment intent details from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(pitch.paymentIntentId);
      
      res.json({
        pitchId: pitch.id,
        paymentIntentId: pitch.paymentIntentId,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents to dollars
          status: paymentIntent.status,
          capture_method: paymentIntent.capture_method,
          created: new Date(paymentIntent.created * 1000),
          customer: paymentIntent.customer,
          payment_method: paymentIntent.payment_method,
          // Include any additional important payment intent details
          charges: paymentIntent.charges?.data || []
        }
      });
    } catch (error: any) {
      console.error("Error fetching payment intent:", error);
      res.status(500).json({ message: "Failed to fetch payment details: " + error.message });
    }
  });
  
  // Capture payment for a pitch (charge the customer)
  app.post("/api/admin/billing/pitch/:id/capture", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !isAdmin(req)) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      // Get the pitch
      const pitch = await storage.getPitchWithRelations(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      if (!pitch.paymentIntentId) {
        return res.status(400).json({ message: "No payment intent associated with this pitch" });
      }
      
      // Check if it's already been captured
      if (pitch.billedAt) {
        return res.status(400).json({ message: "Payment has already been captured" });
      }
      
      try {
        // Capture the payment intent
        const paymentIntent = await stripe.paymentIntents.capture(pitch.paymentIntentId);
        
        // Update the pitch with billing info
        const updatedPitch = await storage.updatePitchBillingInfo(
          pitch.id,
          paymentIntent.id, // Using payment intent ID as charge ID for now
          new Date()
        );
        
        res.json({
          success: true,
          message: "Payment captured successfully",
          pitch: updatedPitch,
          paymentIntent: {
            id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            status: paymentIntent.status
          }
        });
      } catch (error) {
        // Record the error but don't fail the request
        const errorMessage = error instanceof Error ? error.message : 'Unknown error capturing payment';
        await storage.updatePitchBillingError(pitch.id, errorMessage);
        
        throw error;
      }
    } catch (error: any) {
      console.error("Error capturing payment:", error);
      res.status(500).json({ message: "Failed to capture payment: " + error.message });
    }
  });
  
  // Add comment to an annotation
  app.post("/api/annotations/:id/comments", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const annotationId = parseInt(req.params.id);
      if (isNaN(annotationId)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }
      
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      
      const comment = await storage.createAnnotationComment({
        annotationId,
        userId: req.user.id,
        content
      });
      
      res.status(201).json(comment);
    } catch (error: any) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment: " + error.message });
    }
  });

  app.post("/api/admin/sync-placements", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get all pitches
      const allPitches = await storage.getAllPitches();
      
      // Filter for successful pitches
      const successfulPitches = allPitches.filter(pitch => 
        pitch.status === 'successful' || pitch.status === 'Successful Coverage'
      );
      
      // Get all valid users for reference
      const allUsers = await storage.getAllUsers();
      const defaultUser = allUsers.length > 0 ? allUsers[0] : null;
      
      if (!defaultUser) {
        return res.status(500).json({ 
          message: "Failed to sync pitches to placements - no valid users found in the system" 
        });
      }
      
      type ResultDetail = {
        pitchId: number;
        status: string;
        placementId?: number;
        message?: string;
      };
      
      const results = {
        totalSuccessfulPitches: successfulPitches.length,
        existingPlacements: 0,
        newPlacements: 0,
        errors: 0,
        details: [] as ResultDetail[]
      };
      
      // For each successful pitch, check if there's a placement
      for (const pitch of successfulPitches) {
        try {
          // Check if there's already a placement for this pitch
          const placements = await storage.getAllPlacements();
          const existingPlacement = placements.find(p => p.pitchId === pitch.id);
          
          if (!existingPlacement) {
            // Get the opportunity to get publication ID
            const opportunity = await storage.getOpportunity(pitch.opportunityId);
            if (!opportunity) {
              results.errors++;
              results.details.push({
                pitchId: pitch.id,
                status: 'error',
                message: 'Associated opportunity not found'
              });
              continue;
            }
            
            // Get highest bid amount
            const highestBid = await storage.getHighestBidForOpportunity(opportunity.id);
            
            // Verify the user ID is valid
            let validUserId = pitch.userId;
            const user = await storage.getUser(pitch.userId);
            
            if (!user) {
              console.log(`User ID ${pitch.userId} not found for pitch ${pitch.id}. Using default user ID ${defaultUser.id}`);
              validUserId = defaultUser.id;
            } else if (!user.stripeCustomerId && user.email) {
              try {
                // Create a new Stripe customer
                const customer = await stripe.customers.create({
                  email: user.email,
                  name: user.fullName || user.username,
                  metadata: {
                    userId: user.id.toString()
                  }
                });
                
                console.log(`Created Stripe customer for user ${user.id}: ${customer.id}`);
                
                // Update the user with the new customer ID
                await getDb().update(users)
                  .set({ stripeCustomerId: customer.id })
                  .where(eq(users.id, user.id));
              } catch (stripeError: any) {
                console.error(`Failed to create Stripe customer for user ${user.id}:`, stripeError);
                // Continue anyway, we'll try again during billing
              }
            }
            
            // Create a placement with valid user ID
            const placement = await storage.createPlacement({
              pitchId: pitch.id,
              userId: validUserId,
              opportunityId: pitch.opportunityId,
              publicationId: opportunity.publicationId,
              amount: highestBid || 0, // Default to 0 if no bids
              articleTitle: opportunity.title,
              articleUrl: '',
              status: 'ready_for_billing'
            });
            
            results.newPlacements++;
            results.details.push({
              pitchId: pitch.id,
              status: 'created',
              placementId: placement.id
            });
          } else {
            results.existingPlacements++;
            results.details.push({
              pitchId: pitch.id,
              status: 'exists',
              placementId: existingPlacement.id
            });
          }
        } catch (error) {
          results.errors++;
          results.details.push({
            pitchId: pitch.id,
            status: 'error',
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to sync pitches to placements", 
        error: error.message 
      });
    }
  });

  // Get billing details for a placement (admin only)
  app.get("/api/admin/billing/:placementId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const placementId = parseInt(req.params.placementId);
      if (isNaN(placementId)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement with relations
      const placement = await storage.getPlacementWithRelations(placementId);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // SINGLE SOURCE OF TRUTH: Get the pitch row that generated the placement
      // and use its payment intent ID as the single source of truth
      const pitch = await storage.getPitch(placement.pitchId);
      
      if (!pitch?.paymentIntentId) {
        console.log(`No payment intent found for pitch ${placement.pitchId} associated with placement ${placementId}`);
        return res.status(400).json({ 
          message: "No payment intent found for this placement",
          placement,
          error: "missing_payment_intent"
        });
      }
      
      console.log(`Retrieving PI ${pitch.paymentIntentId} for placement ${placementId}`);
      
      // We've already verified that pitch.paymentIntentId exists above, so it's safe to use as string
      const paymentIntentId = pitch.paymentIntentId as string;
      
      // Get the payment intent from Stripe
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Calculate Stripe fee (typically 2.9% + 30 cents for US cards)
        const amount = paymentIntent.amount / 100; // Convert from cents to dollars
        const stripeFee = ((amount * 0.029) + 0.30).toFixed(2);
        const netAmount = (amount - parseFloat(stripeFee)).toFixed(2);
        
        // Get card details if available
        let lastFour = null;
        let cardBrand = null;
        
        if (paymentIntent.charges && paymentIntent.charges.data && paymentIntent.charges.data.length > 0) {
          const charge = paymentIntent.charges.data[0];
          if (charge.payment_method_details && charge.payment_method_details.card) {
            lastFour = charge.payment_method_details.card.last4;
            cardBrand = charge.payment_method_details.card.brand;
          }
        }
        
        // Check if the payment intent is still valid for capture
        const isExpired = paymentIntent.status !== 'requires_capture';
        
        return res.json({
          placement,
          pitch,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount,
            stripeFee,
            netAmount,
            lastFour,
            cardBrand,
            isExpired,
            isReadyForCapture: paymentIntent.status === 'requires_capture'
          }
        });
      } catch (err: any) {
        console.error("Error getting billing details:", err);
        
        // Handle Stripe resource_missing errors with a specific status code
        if (err?.code === 'resource_missing' || (err?.raw && err?.raw.code === 'resource_missing')) {
          return res.status(409).json({ 
            message: 'payment_intent_not_found_in_stripe', 
            pitchId: pitch.id,
            error: {
              code: 'resource_missing',
              message: err.message
            }
          });
        }
        
        // For other errors
        return res.status(500).json({ message: "Failed to get billing details: " + err.message });
      }
    } catch (error: any) {
      // Handle any other unexpected errors
      console.error("Unexpected error getting billing details:", error);
      return res.status(500).json({ message: "An unexpected error occurred: " + error.message });
    }
  });
  
  // Capture payment for a placement (admin only)
  app.post("/api/admin/billing/capture", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { placementId } = req.body;
      
      if (!placementId) {
        return res.status(400).json({ message: "Placement ID is required" });
      }
      
      // Get the placement
      const placement = await storage.getPlacementWithRelations(placementId);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // SINGLE SOURCE OF TRUTH: Get the pitch row that generated the placement
      // and use its payment intent ID as the single source of truth
      const pitch = await storage.getPitch(placement.pitchId);
      
      if (!pitch?.paymentIntentId) {
        console.log(`No payment intent found for pitch ${placement.pitchId} associated with placement ${placementId}`);
        return res.status(400).json({ 
          message: "No payment intent found for this placement",
          error: "missing_payment_intent"
        });
      }
      
      console.log(`Using PI ${pitch.paymentIntentId} for placement ${placementId} capture`);
      
      // Check if the placement is ready for billing
      if (placement.status !== 'ready_for_billing') {
        return res.status(400).json({ 
          message: `Placement is not ready for billing. Current status: ${placement.status}` 
        });
      }
      
      // We've already verified that pitch.paymentIntentId exists above, so it's safe to use as string
      const paymentIntentId = pitch.paymentIntentId as string;
      
      // Get the payment intent from Stripe using the pitch's payment intent ID and capture it
      let capturedPayment;
      let paymentIntent;
      
      try {
        // First retrieve the payment intent
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Check if it's ready for capture
        if (paymentIntent.status !== 'requires_capture') {
          return res.status(400).json({ 
            message: `Payment cannot be captured. Current status: ${paymentIntent.status}`,
            paymentIntentStatus: paymentIntent.status
          });
        }
        
        // Then capture the payment
        capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);
        
        // Update the placement status to paid
        const updatedPlacement = await storage.updatePlacementStatus(placementId, 'paid');
        
        // Calculate net amount
        const amount = capturedPayment.amount / 100; // Convert from cents to dollars
        const stripeFee = ((amount * 0.029) + 0.30).toFixed(2);
        const netAmount = (amount - parseFloat(stripeFee)).toFixed(2);
        
        // Log the successful capture for verification
        console.log(`Successfully captured payment intent ${paymentIntentId} for placement ${placementId}`);
        
        // Send success response
        return res.json({
          success: true,
          placement: updatedPlacement,
          paymentIntent: {
            id: capturedPayment.id,
            status: capturedPayment.status,
            amount,
            stripeFee,
            netAmount
          }
        });
        
      } catch (err: any) {
        // Handle Stripe resource_missing errors with a specific status code
        if (err?.code === 'resource_missing' || (err?.raw && err?.raw.code === 'resource_missing')) {
          return res.status(409).json({ 
            message: 'payment_intent_not_found_in_stripe', 
            pitchId: pitch.id,
            error: {
              code: 'resource_missing',
              message: err.message
            }
          });
        }
        
        // For other errors, re-throw to be caught by the outer try/catch
        throw err;
      }
      
    } catch (error: any) {
      console.error("Error capturing payment:", error);
      res.status(500).json({ message: "Failed to capture payment: " + error.message });
    }
  });

  // Send notification for a placement (admin only)
  app.post("/api/admin/placements/:id/notify", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement
      const placement = await storage.getPlacementWithRelations(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // Check if the notification was already sent
      if (placement.notificationSent) {
        return res.status(400).json({ message: "Notification already sent for this placement" });
      }
      
      // Check if the placement is paid
      if (placement.status !== 'paid') {
        return res.status(400).json({ message: "Only paid placements can send notifications" });
      }
      
      // Send email notification with SendGrid
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ message: "SendGrid API key not configured" });
      }
      
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        // Prepare the email
        const msg = {
          to: placement.user.email,
          from: 'admin@quotebid.com',
          subject: `🎉 Your Expertise Was Featured in ${placement.publication.name}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
              </div>
              <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 16px;">Congrats ${placement.user.fullName.split(' ')[0]}!</p>
                
                <p style="font-size: 16px; margin-top: 20px;">Your bid of $${placement.amount.toLocaleString()} secured your spot in this breaking story:</p>
                
                <p style="font-size: 16px; margin-top: 10px;">→ ${placement.articleTitle || placement.opportunity.title} – ${placement.publication.name}</p>
                
                ${placement.articleUrl ? `<p style="font-size: 16px; margin-top: 10px;">→ <a href="${placement.articleUrl}" style="color: #4a5568;">${placement.articleUrl}</a></p>` : ''}
                
                <p style="font-size: 16px; margin-top: 20px;">A receipt for $${placement.amount.toLocaleString()} has been charged to your card on file.</p>
                
                <p style="font-size: 16px; margin-top: 10px;">Thank you for trusting our marketplace!</p>
                
                <div style="margin-top: 30px; text-align: center;">
                  <p style="font-size: 14px; color: #718096;">QuoteBid - Connect with top publications</p>
                </div>
              </div>
            </div>
          `
        };
        
        // Send the email
        await sgMail.send(msg);
        
        // Update the placement notification status
        const updatedPlacement = await storage.updatePlacementNotification(id, true);
        
        res.json({
          success: true,
          placement: updatedPlacement,
          message: "Notification sent successfully"
        });
      } catch (emailError: any) {
        return res.status(400).json({
          message: `Failed to send notification: ${emailError.message}`,
          error: emailError
        });
      }
      
    } catch (error: any) {
      res.status(500).json({ message: "Failed to send notification: " + error.message });
    }
  });

  // Function to ensure all successful pitches have placements
  const syncSuccessfulPitchesToPlacements = async () => {
    try {
      console.log("Checking for successful pitches without placements...");
      
      // Get all pitches
      const allPitches = await storage.getAllPitches();
      
      // Filter for successful pitches
      const successfulPitches = allPitches.filter(pitch => 
        pitch.status === 'successful' || pitch.status === 'Successful Coverage'
      );
      
      console.log(`Found ${successfulPitches.length} successful pitches`);
      
      // Get all valid users for reference
      const allUsers = await storage.getAllUsers();
      const defaultUser = allUsers.length > 0 ? allUsers[0] : null;
      
      if (!defaultUser) {
        console.error("No valid users found in the system. Skipping sync.");
        return;
      }
      
      // For each successful pitch, check if there's a placement
      for (const pitch of successfulPitches) {
        // Check if there's already a placement for this pitch
        const placements = await storage.getAllPlacements();
        const existingPlacement = placements.find(p => p.pitchId === pitch.id);
        
        if (!existingPlacement) {
          console.log(`Creating placement for pitch ID ${pitch.id}`);
          
          // Get the opportunity to get publication ID
          const opportunity = await storage.getOpportunity(pitch.opportunityId);
          if (!opportunity) {
            console.error(`Associated opportunity not found for pitch ID ${pitch.id}`);
            continue;
          }
          
          // Get highest bid amount
          const highestBid = await storage.getHighestBidForOpportunity(opportunity.id);
          
          // Verify the user ID is valid
          let validUserId = pitch.userId;
          const user = await storage.getUser(pitch.userId);
          
          if (!user) {
            console.log(`User ID ${pitch.userId} not found for pitch ${pitch.id}. Using default user ID ${defaultUser.id}`);
            validUserId = defaultUser.id;
          } else if (!user.stripeCustomerId && user.email) {
            try {
              // Create a new Stripe customer
              const customer = await stripe.customers.create({
                email: user.email,
                name: user.fullName || user.username,
                metadata: {
                  userId: user.id.toString()
                }
              });
              
              console.log(`Created Stripe customer for user ${user.id}: ${customer.id}`);
              
              // Update the user with the new customer ID
              await getDb().update(users)
                .set({ stripeCustomerId: customer.id })
                .where(eq(users.id, user.id));
            } catch (stripeError: any) {
              console.error(`Failed to create Stripe customer for user ${user.id}:`, stripeError);
              // Continue anyway, we'll try again during billing
            }
          }
          
          // Create a placement with valid user ID and payment intent ID
          await storage.createPlacement({
            pitchId: pitch.id,
            userId: validUserId,
            opportunityId: pitch.opportunityId,
            publicationId: opportunity.publicationId,
            amount: highestBid || 0, // Default to 0 if no bids
            articleTitle: opportunity.title,
            articleUrl: '',
            status: 'ready_for_billing',
            // Include the payment intent ID from the pitch (if exists)
            paymentIntentId: pitch.paymentIntentId ? pitch.paymentIntentId.toString() : undefined
          });
          
          console.log(`Placement created for pitch ID ${pitch.id}`);
        } else {
          console.log(`Placement already exists for pitch ID ${pitch.id}`);
        }
      }
      
      console.log("Placement sync completed");
    } catch (error) {
      console.error("Error syncing placements:", error);
    }
  };
  
  // Run the sync on server startup
  syncSuccessfulPitchesToPlacements();

  const httpServer = createServer(app);
  
  // ============ STRIPE WEBHOOK HANDLER ============
  
  // This is your Stripe webhook secret for testing your endpoint locally.
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    
    let event;
    
    try {
      // Verify webhook signature
      if (endpointSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } else {
        // Fall back to parsing the request body if signature verification is not available
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      console.log(`⚠️ Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        // Payment is successful and the subscription is created
        const session = event.data.object;
        
        // Extract user ID from metadata
        const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
        if (!userId) {
          console.log(`⚠️ No user ID in session metadata:`, session.id);
          break;
        }
        
        // Update the user record
        try {
          // Get subscription ID from session
          const subscriptionId = session.subscription;
          if (subscriptionId) {
            // Fetch the subscription to get details
            const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
            
            // Determine when subscription will end (for billing period)
            const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
            
            // Update user with subscription information
            await getDb().update(users)
              .set({
                stripeSubscriptionId: subscriptionId as string,
                premiumStatus: 'active',
                premiumExpiry: currentPeriodEnd
              })
              .where(eq(users.id, userId));
              
            console.log(`✅ Updated user ${userId} with subscription ${subscriptionId}`);
          }
        } catch (error) {
          console.error(`Failed to update user after checkout completion:`, error);
        }
        break;
      }
      
      case 'invoice.paid': {
        // Continue access to the subscription
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;
        
        if (subscriptionId && customerId) {
          try {
            // Find user with this customer ID
            const [user] = await getDb().select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId as string));
              
            if (user) {
              // Get subscription details to update expiry
              const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
              const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
              
              // Update user status
              await getDb().update(users)
                .set({
                  premiumStatus: 'active',
                  premiumExpiry: currentPeriodEnd
                })
                .where(eq(users.id, user.id));
                
              console.log(`✅ User ${user.id} subscription renewed until ${currentPeriodEnd}`);
            }
          } catch (error) {
            console.error(`Failed to process invoice payment:`, error);
          }
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        // The payment failed or the customer does not have a valid payment method
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;
        
        if (subscriptionId && customerId) {
          try {
            // Find user with this customer ID
            const [user] = await getDb().select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId as string));
              
            if (user) {
              // Update user status
              await getDb().update(users)
                .set({
                  premiumStatus: 'payment_failed'
                })
                .where(eq(users.id, user.id));
                
              console.log(`⚠️ User ${user.id} payment failed for subscription ${subscriptionId}`);
            }
          } catch (error) {
            console.error(`Failed to process payment failure:`, error);
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        // Subscription canceled or expired
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        if (customerId) {
          try {
            // Find user with this customer ID
            const [user] = await getDb().select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId as string));
              
            if (user) {
              // Update user status
              await getDb().update(users)
                .set({
                  premiumStatus: 'canceled',
                  premiumExpiry: new Date() // Set to current date (expired)
                })
                .where(eq(users.id, user.id));
                
              console.log(`❌ User ${user.id} subscription canceled`);
            }
          } catch (error) {
            console.error(`Failed to process subscription deletion:`, error);
          }
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.json({received: true});
  });
  
  // Setup WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store clients with their associated document
  const clients = new Map<WebSocket, { userId: number; documentId: string }>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'join':
            // User joins a document for collaboration
            if (data.userId && data.documentId) {
              clients.set(ws, { userId: data.userId, documentId: data.documentId });
              console.log(`User ${data.userId} joined document ${data.documentId}`);
              
              // Fetch existing annotations for this document
              const annotations = await storage.getAnnotations(data.documentId);
              
              // Send existing annotations to the newly connected client
              ws.send(JSON.stringify({
                type: 'init',
                annotations
              }));
            }
            break;
            
          case 'create-annotation':
            // User creates a new annotation
            if (data.annotation) {
              // Save the annotation to the database
              const newAnnotation = await storage.createAnnotation(data.annotation);
              
              // Broadcast the new annotation to all clients viewing the same document
              const annotationData = {
                type: 'new-annotation',
                annotation: newAnnotation
              };
              
              // Broadcast to all clients viewing the same document
              for (const [client, clientData] of Array.from(clients.entries())) {
                if (clientData.documentId === data.annotation.documentId && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(annotationData));
                }
              }
            }
            break;
            
          case 'update-annotation':
            // User updates an existing annotation
            if (data.annotation && data.annotation.id) {
              // Update the annotation in the database
              const updatedAnnotation = await storage.updateAnnotation(data.annotation.id, data.annotation);
              
              // Broadcast the update to all clients viewing the same document
              const updateData = {
                type: 'update-annotation',
                annotation: updatedAnnotation
              };
              
              // Broadcast to all clients viewing the same document
              for (const [client, clientData] of Array.from(clients.entries())) {
                if (clientData.documentId === data.annotation.documentId && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(updateData));
                }
              }
            }
            break;
            
          case 'add-comment':
            // User adds a comment to an annotation
            if (data.comment) {
              // Save the comment to the database
              const newComment = await storage.createAnnotationComment(data.comment);
              
              // Get the annotation to find its document
              const annotation = await storage.getAnnotation(data.comment.annotationId);
              
              if (annotation) {
                // Broadcast the new comment to all clients viewing the same document
                const commentData = {
                  type: 'new-comment',
                  comment: newComment,
                  annotationId: data.comment.annotationId
                };
                
                // Broadcast to all clients viewing the same document
                for (const [client, clientData] of Array.from(clients.entries())) {
                  if (clientData.documentId === annotation.documentId && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(commentData));
                  }
                }
              }
            }
            break;
            
          case 'resolve-annotation':
            // User resolves an annotation
            if (data.annotationId) {
              // Update the annotation in the database
              const resolvedAnnotation = await storage.resolveAnnotation(data.annotationId);
              
              // Broadcast the resolution to all clients viewing the same document
              const resolveData = {
                type: 'resolve-annotation',
                annotationId: data.annotationId,
                resolved: true
              };
              
              // Broadcast to all clients viewing the same document
              for (const [client, clientData] of Array.from(clients.entries())) {
                if (clientData.documentId === resolvedAnnotation.documentId && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(resolveData));
                }
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove client from the clients map
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });
  });
  
  // Register /api/user route here
  app.get("/api/user", ensureAuth, (req, res) => {
    console.log('Authorization header:', req.headers['authorization']);
    console.log('req.user:', req.user);
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });
  
  return httpServer;
}
