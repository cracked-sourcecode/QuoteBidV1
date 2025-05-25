import { Request, Response, Router } from 'express';
import Stripe from 'stripe';
import { getDb } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// @claude-fix: Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

// @claude-fix: IMPORTANT - Set up your Stripe price:
// 1. Go to Stripe Dashboard > Products
// 2. Find product "QuoteBid Platform Access" (prod_SGqepEtdqqQYcW)
// 3. Add a price (e.g., $99.99/month)
// 4. Copy the price ID (starts with price_)
// 5. Add to your .env file: STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE

// @claude-fix: Helper function to get or create customer
async function getOrCreateCustomer(email: string, paymentMethodId?: string): Promise<string> {
  // First, check if user exists in our DB
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email));
    
  if (!user) {
    throw new Error('User not found');
  }
  
  // If user already has a Stripe customer ID, use it
  if (user.stripeCustomerId) {
    // If a new payment method is provided, attach it to the customer
    if (paymentMethodId) {
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: user.stripeCustomerId,
        });
      } catch (error) {
        console.error('Error attaching payment method:', error);
      }
    }
    return user.stripeCustomerId;
  }
  
  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.fullName || user.username,
    metadata: {
      userId: user.id.toString(),
    },
  });
  
  // Attach payment method if provided
  if (paymentMethodId) {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });
  }
  
  // Update user record with Stripe customer ID
  await getDb()
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, user.id));
    
  return customer.id;
}

// @claude-fix: POST /api/stripe/subscription endpoint
router.post('/subscription', async (req: Request, res: Response) => {
  try {
    const { email, paymentMethodId } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // 0) Look up (or create) customer
    const customerId = await getOrCreateCustomer(email, paymentMethodId);
    
    // 1) Get the price ID - first try environment variable, then look for active prices
    // @claude-fix: Use environment variable for price ID with fallback to active prices
    let priceId = process.env.STRIPE_PRICE_ID;
    
    if (!priceId) {
      // If no environment variable, try to find an active price for the product
      const prices = await stripe.prices.list({
        product: 'prod_SGqepEtdqqQYcW',
        active: true,
        limit: 1,
      });
      
      if (prices.data.length === 0) {
        throw new Error('No active prices found for product. Please configure STRIPE_PRICE_ID in environment variables or create a price in Stripe dashboard.');
      }
      
      priceId = prices.data[0].id;
      console.warn(`Using price ${priceId} for product. Consider setting STRIPE_PRICE_ID environment variable.`);
    }
    
    // 2) Create the subscription in `default_incomplete` mode
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      default_payment_method: paymentMethodId, // so renewals auto-bill
      expand: ['latest_invoice.payment_intent'],
    });
    
    // Ensure we have the payment intent
    // Type assertion needed because Stripe types don't include expanded fields
    const invoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent?: Stripe.PaymentIntent | string | null;
    };
    
    if (!invoice || typeof invoice === 'string' || !invoice.payment_intent || typeof invoice.payment_intent === 'string') {
      throw new Error('Failed to create payment intent for subscription');
    }
    
    const paymentIntent = invoice.payment_intent;
    
    // Update user with subscription info
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId));
      
    if (user) {
      await getDb()
        .update(users)
        .set({
          stripeSubscriptionId: subscription.id,
          subscription_status: subscription.status,
        })
        .where(eq(users.id, user.id));
    }
    
    // 3) Return the client_secret so front-end confirms the PaymentIntent
    res.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
    
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    
    // @claude-fix: Provide more helpful error messages
    let statusCode = 500;
    let errorMessage = 'Failed to create subscription';
    
    if (error.message.includes('STRIPE_PRICE_ID')) {
      statusCode = 500;
      errorMessage = 'Stripe configuration error: Price ID not set. Please contact support.';
    } else if (error.message.includes('No active prices')) {
      statusCode = 500;
      errorMessage = 'Product configuration error: No active prices found. Please contact support.';
    } else if (error.type === 'StripeCardError') {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.type === 'StripeInvalidRequestError') {
      statusCode = 400;
      errorMessage = 'Invalid request. Please check your payment details.';
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: error.message 
    });
  }
});

export default router; 