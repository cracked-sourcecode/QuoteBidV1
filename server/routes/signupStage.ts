import 'dotenv/config';
import { Request, Response, Router } from 'express';
import { getDb } from '../db';
import { users, signupState } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import Stripe from 'stripe';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import { hashPassword } from '../utils/passwordUtils';

// Initialize Stripe client
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-03-31.basil',
  });
}

// Get Stripe instance when needed - lazy initialization
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    try {
      stripe = getStripeClient();
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw new Error('Payment system is not properly configured. Please contact support.');
    }
  }
  return stripe;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'avatar-' + uniqueSuffix + ext);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = Router();

// Allowed signup stages in order
const VALID_STAGES = ['payment', 'profile', 'ready', 'legacy'];

export async function startSignup(req: Request, res: Response) {
  const { email, username, phone, password, name, companyName, industry, hasAgreedToTerms } = req.body as {
    email: string;
    username: string;
    phone: string;
    password: string;
    name?: string;
    companyName?: string;
    industry?: string;
    hasAgreedToTerms: boolean;
  };

  if (!email || !username || !phone || !password || !hasAgreedToTerms) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate username format
  const usernameRegex = /^[a-z0-9]{4,30}$/;
  const normalizedUsername = username.toLowerCase().trim();
  if (!usernameRegex.test(normalizedUsername)) {
    return res.status(400).json({
      message: 'Username must be 4-30 characters, lowercase letters and numbers only',
      field: 'username'
    });
  }

  const db = getDb();
  // Check for existing user by email/username/phone
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`LOWER(${users.email}) = LOWER(${email}) OR LOWER(${users.username}) = ${normalizedUsername} OR ${users.phone_number} = ${phone}`)
    .limit(1);

  if (existing.length) {
    const userId = existing[0].id as number;
    const [state] = await db.select().from(signupState).where(eq(signupState.userId, userId));
    if (state && state.status !== 'completed') {
      await db.transaction(async (tx) => {
        await tx.delete(signupState).where(eq(signupState.userId, userId));
        await tx.delete(users).where(eq(users.id, userId));
      });
    } else {
      return res.status(400).json({ message: 'User already exists' });
    }
  }

  const hashed = await hashPassword(password);
  let newId: number | undefined;
  let newUser: any;
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(users).values({
      email,
      username: normalizedUsername,
      fullName: name || username,
      phone_number: phone,
      company_name: companyName,
      industry,
      password: hashed,
      signup_stage: 'payment',
      hasAgreedToTerms: true
    }).returning({ id: users.id, email: users.email, isAdmin: users.isAdmin });
    newUser = inserted[0];
    newId = newUser.id as number;
    await tx.insert(signupState).values({ userId: newId!, status: 'payment' });
  });

  // Generate a JWT token for the user to authenticate subsequent requests
  const role = newUser.isAdmin ? 'admin' : 'user';
  const { signUser } = await import('../lib/jwt');
  const token = signUser({ 
    id: newId!, 
    email: newUser.email, 
    role
  });

  // Welcome email will be sent when signup is completed, not at the start

  return res.status(201).json({ 
    userId: newId, 
    step: 'payment',
    token,
    user: {
      id: newId,
      email: newUser.email,
      role
    }
  });
}

router.post('/start', startSignup);

// Get the current signup stage for a user
router.get('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, decodeURIComponent(email)));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Determine which stage the user is in
    const stageInfo = determineSignupStage(user);
    
    return res.status(200).json(stageInfo);
  } catch (error) {
    console.error('Error getting signup stage:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Advance a user to the next signup stage
router.post('/:email/advance', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { action, paymentIntentId, subscriptionId } = req.body;
    
    console.log('[ADVANCE] Request for email:', email);
    console.log('[ADVANCE] Action:', action);
    console.log('[ADVANCE] Request body:', req.body);
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    if (!action || !VALID_STAGES.includes(action)) {
      return res.status(400).json({ message: 'Valid action is required' });
    }
    
    // Find user by email
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, decodeURIComponent(email)));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('[ADVANCE] Current user stage:', user.signup_stage);
    
    // Determine the next stage
    const currentStage = user.signup_stage || 'payment';
    const currentIndex = VALID_STAGES.indexOf(currentStage);
    const actionIndex = VALID_STAGES.indexOf(action);
    
    console.log('[ADVANCE] Current stage:', currentStage, 'index:', currentIndex);
    console.log('[ADVANCE] Action stage:', action, 'index:', actionIndex);
    
    // Only allow advancing to the next stage or staying on the same stage
    if (actionIndex < currentIndex) {
      return res.status(400).json({ 
        message: 'Cannot go back to a previous stage',
        stage: currentStage 
      });
    }
    
    // If we're completing the payment stage, update payment-related fields
    if (action === 'payment' && (paymentIntentId || subscriptionId)) {
      const updateData: any = {
        signup_stage: 'profile',
        hasCompletedPayment: true
      };
      
      if (subscriptionId) {
        updateData.stripeSubscriptionId = subscriptionId;
        updateData.subscription_status = 'active';
      }
      
      await getDb()
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id));
      
      console.log('[ADVANCE] Payment completed, user updated with subscription info');
      
      return res.status(200).json({
        stage: 'profile',
        nextStage: 'ready'
      });
    }
    
    // If we're completing the current stage, advance to the next one
    let nextStage = currentStage;
    if (action === currentStage && actionIndex < VALID_STAGES.length - 1) {
      nextStage = VALID_STAGES[actionIndex + 1];
    }
    
    console.log('[ADVANCE] Next stage will be:', nextStage);
    
    // Regular stage update
    await getDb()
      .update(users)
      .set({ signup_stage: nextStage })
      .where(eq(users.id, user.id));
    
    // Get the updated stage info
    const updatedStageInfo = {
      stage: nextStage,
      nextStage: actionIndex < VALID_STAGES.length - 1 ? VALID_STAGES[actionIndex + 1] : undefined
    };
    
    console.log('[ADVANCE] Returning:', updatedStageInfo);
    
    return res.status(200).json(updatedStageInfo);
  } catch (error) {
    console.error('Error advancing signup stage:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile information during signup
router.patch('/:email/profile', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const profileData = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, decodeURIComponent(email)));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Map incoming fields to database column names
    const fieldMap: Record<string, string> = {
      fullName: 'fullName',
      company_name: 'company_name',
      phone_number: 'phone_number',
      industry: 'industry',
      title: 'title',
      location: 'location',
      bio: 'bio',
      linkedin: 'linkedIn',
      website: 'website',
      twitter: 'twitter',
      instagram: 'instagram',
      doFollow: 'doFollowLink',
    };

    const updateData: Record<string, any> = {};
    for (const key of Object.keys(profileData)) {
      const dbField = fieldMap[key];
      if (dbField) {
        updateData[dbField] = profileData[key];
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: 'No valid profile fields provided',
        success: false
      });
    }

    // Mark profile as completed and update fields
    await getDb()
      .update(users)
      .set({ ...updateData, profileCompleted: true })
      .where(eq(users.id, user.id));
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating profile during signup:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
});

// Helper function to determine signup stage based on user data
function determineSignupStage(user: any) {
  if (user.signup_stage) {
    const currentStageIndex = VALID_STAGES.indexOf(user.signup_stage);
    return {
      stage: user.signup_stage,
      nextStage: currentStageIndex < VALID_STAGES.length - 1 
        ? VALID_STAGES[currentStageIndex + 1] 
        : undefined
    };
  }
  // Fallback logic for legacy users
  if (!user.hasCompletedPayment) {
    return { stage: 'payment', nextStage: 'profile' };
  } else if (!user.hasCompletedProfile) {
    return { stage: 'profile', nextStage: 'ready' };
  } else {
    return { stage: 'ready' };
  }
}

// Handle avatar uploads
router.post('/:email/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const file = req.file;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Find user by email
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, decodeURIComponent(email)));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Save the avatar path to the user record
    const avatarPath = `/uploads/avatars/${file.filename}`;
    
    await getDb()
      .update(users)
      .set({ avatar: avatarPath })
      .where(eq(users.id, user.id));
    
    return res.status(200).json({ success: true, path: avatarPath });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
});

// @claude-fix: Deprecated - use /api/stripe/subscription instead
// Create or retrieve subscription for the user
router.post('/get-or-create-subscription', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if Stripe is properly configured
    try {
      getStripe(); // This will throw if Stripe is not configured
    } catch (error) {
      console.error('Stripe configuration error:', error);
      return res.status(500).json({ 
        message: 'Payment system is temporarily unavailable. Please try again later or contact support.',
        error: 'stripe_config_error'
      });
    }
    
    // If user already has an active subscription
    if (user.stripeSubscriptionId) {
      try {
        // Retrieve the subscription from Stripe
        const subscription = await getStripe().subscriptions.retrieve(user.stripeSubscriptionId);
        
        // If subscription is still valid, return the payment intent client secret
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          return res.status(200).json({
            subscriptionId: subscription.id,
            status: subscription.status,
            active: true,
          });
        }
      } catch (stripeError) {
        console.error('Error retrieving subscription:', stripeError);
        // If the subscription isn't found, we'll create a new one below
      }
    }
    
    // Create a customer if the user doesn't have one
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      try {
        const customer = await getStripe().customers.create({
          email: user.email,
          name: user.fullName || user.username,
        });
        customerId = customer.id;
        
        // Update the user record with the customer ID
        await getDb()
          .update(users)
          .set({ stripeCustomerId: customerId })
          .where(eq(users.id, user.id));
      } catch (error) {
        console.error('Error creating Stripe customer:', error);
        return res.status(500).json({ 
          message: 'Failed to create payment profile. Please try again.',
          error: 'customer_creation_error'
        });
      }
    }
    
    // Create a new subscription
    // Use the monthly subscription price
    const priceId = process.env.STRIPE_PRICE_ID; // Monthly subscription price ID
    
    if (!priceId) {
      console.error('STRIPE_PRICE_ID is not configured');
      return res.status(500).json({ 
        message: 'Payment configuration is incomplete. Please contact support.',
        error: 'missing_price_id'
      });
    }
    
    try {
      // For subscriptions, we need to use a different approach
      // First create a SetupIntent to collect payment method
      const setupIntent = await getStripe().setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          subscription_price_id: priceId,
        }
      });
      
      // Create the subscription but don't activate it yet
      const subscription = await getStripe().subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription'
        },
        metadata: {
          setup_intent_id: setupIntent.id
        }
      });
      
      // Update the user record with the subscription ID
      await getDb()
        .update(users)
        .set({ 
          stripeSubscriptionId: subscription.id,
          subscription_status: subscription.status,
        })
        .where(eq(users.id, user.id));
      
      // Return the setup intent client secret for the payment form
      return res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: setupIntent.client_secret,
        status: subscription.status,
        type: 'setup' // Let the frontend know this is a setup intent
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      
      // Check for specific Stripe errors
      if (error.type === 'StripeInvalidRequestError') {
        if (error.message.includes('price')) {
          return res.status(500).json({ 
            message: 'Invalid subscription configuration. Please contact support.',
            error: 'invalid_price'
          });
        }
      }
      
      return res.status(500).json({ 
        message: 'Failed to create subscription. Please try again.',
        error: 'subscription_creation_error',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in get-or-create-subscription:', error);
    return res.status(500).json({ 
      message: 'An unexpected error occurred. Please try again.',
      error: 'unexpected_error'
    });
  }
});

// Complete signup and generate JWT token
router.post('/:email/complete', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, decodeURIComponent(email)));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update the user's signup stage to 'ready'
    await getDb()
      .update(users)
      .set({
        signup_stage: 'ready',
        profileCompleted: true
      })
      .where(eq(users.id, user.id));
    
    // Send welcome email to new user
    try {
      const { sendWelcomeEmail } = await import('../lib/email');
      await sendWelcomeEmail(user.email, user.username, user.fullName || user.username);
      console.log('✅ Welcome email sent to new user:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send welcome email to:', user.email, emailError);
      // Don't fail the signup if email fails - just log the error
    }
    
    // Generate a JWT token for the user
    const role = user.isAdmin ? 'admin' : 'user';
    const { signUser } = await import('../lib/jwt');
    const token = signUser({ 
      id: user.id, 
      email: user.email, 
      role
    });
    
    console.log('[COMPLETE] JWT generated, length:', token?.length);
    console.log('[COMPLETE] User ID:', user.id, 'Email:', user.email);
    
    // No need to call req.login; JWT is returned for authentication

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role
      }
    });
  } catch (error) {
    console.error('Error completing signup:', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
});

// Helper to convert data URL to Buffer
function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const matches = dataUrl.match(/^data:.+\/([a-zA-Z0-9+]+);base64,(.*)$/);
  if (!matches) return null;
  return Buffer.from(matches[2], 'base64');
}

// Function to generate agreement PDF
async function generateAgreementPDF(fullName: string, signature: string, signedAt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Add content to PDF
    doc.fontSize(20).text('Agreement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Signed by: ${fullName}`);
    doc.text(`Date: ${new Date(signedAt).toLocaleString()}`);
    doc.moveDown();
    doc.text('Signature:');
    const signatureBuffer = dataUrlToBuffer(signature);
    if (signatureBuffer) {
      doc.image(signatureBuffer, {
        fit: [300, 100],
        align: 'center'
      });
    } else {
      doc.text('[Signature not available]');
    }
    doc.moveDown();
    doc.text('Terms and Conditions:');
    doc.fontSize(10).text(`
      1. By signing this agreement, you agree to our terms of service.
      2. You understand that this is a legally binding document.
      3. You confirm that all information provided is accurate.
    `);

    doc.end();
  });
}

// Update signup stage (not used by wizard, kept for backward compatibility)
router.patch('/stage', async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { stage } = req.body;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!stage) return res.status(400).json({ message: 'Stage required' });
  await getDb().update(users).set({ signup_stage: stage }).where(eq(users.id, userId));
  res.json({ success: true });
});

export default router;