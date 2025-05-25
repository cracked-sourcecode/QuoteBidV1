import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getDb } from '../../db';
import router from '../createSubscription';

// @claude-fix: Mock dependencies
jest.mock('stripe');
jest.mock('../../db');

const mockStripe = {
  products: {
    retrieve: jest.fn(),
  },
  customers: {
    create: jest.fn(),
  },
  paymentMethods: {
    attach: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
  },
};

(Stripe as unknown as jest.Mock).mockImplementation(() => mockStripe);

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
};

(getDb as jest.Mock).mockReturnValue(mockDb);

describe('POST /api/stripe/subscription', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    req = {
      body: {
        email: 'test@example.com',
        paymentMethodId: 'pm_test123',
      },
    };
    
    res = {
      json: jsonMock,
      status: statusMock,
    };
    
    jest.clearAllMocks();
  });

  it('should create a subscription with payment intent and return client secret', async () => {
    // @claude-fix: Mock user lookup
    mockDb.where.mockResolvedValue([{
      id: 1,
      email: 'test@example.com',
      stripeCustomerId: 'cus_test123',
    }]);

    // Mock product retrieval
    mockStripe.products.retrieve.mockResolvedValue({
      id: 'prod_SGqepEtdqqQYcW',
      default_price: {
        id: 'price_test123',
      },
    });

    // Mock subscription creation with expanded invoice
    const mockPaymentIntent = {
      id: 'pi_test123',
      client_secret: 'pi_test123_secret_test',
    };

    mockStripe.subscriptions.create.mockResolvedValue({
      id: 'sub_test123',
      status: 'incomplete',
      latest_invoice: {
        id: 'inv_test123',
        payment_intent: mockPaymentIntent,
      },
    });

    // Find the route handler - Express router structure
    const layer = router.stack.find(
      (layer: any) => layer.route?.path === '/subscription' && layer.route?.methods?.post
    );
    const routeHandler = layer?.route?.stack[0]?.handle;

    // Execute the handler
    if (routeHandler) {
      await routeHandler(req as Request, res as Response, () => {});
    } else {
      throw new Error('Route handler not found');
    }

    // @claude-fix: Assert Stripe subscriptions.create was called once
    expect(mockStripe.subscriptions.create).toHaveBeenCalledTimes(1);
    expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
      customer: 'cus_test123',
      items: [{ price: 'price_test123' }],
      payment_behavior: 'default_incomplete',
      default_payment_method: 'pm_test123',
      expand: ['latest_invoice.payment_intent'],
    });

    // Assert response
    expect(jsonMock).toHaveBeenCalledWith({
      subscriptionId: 'sub_test123',
      clientSecret: 'pi_test123_secret_test',
    });
  });

  it('should create a new customer if user does not have stripeCustomerId', async () => {
    // Mock user without Stripe customer
    mockDb.where.mockResolvedValue([{
      id: 1,
      email: 'test@example.com',
      stripeCustomerId: null,
      fullName: 'Test User',
    }]);

    // Mock customer creation
    mockStripe.customers.create.mockResolvedValue({
      id: 'cus_new123',
    });

    // Mock product and subscription
    mockStripe.products.retrieve.mockResolvedValue({
      id: 'prod_SGqepEtdqqQYcW',
      default_price: { id: 'price_test123' },
    });

    mockStripe.subscriptions.create.mockResolvedValue({
      id: 'sub_test123',
      status: 'incomplete',
      latest_invoice: {
        payment_intent: {
          client_secret: 'pi_test123_secret_test',
        },
      },
    });

    const layer = router.stack.find(
      (layer: any) => layer.route?.path === '/subscription' && layer.route?.methods?.post
    );
    const routeHandler = layer?.route?.stack[0]?.handle;

    if (routeHandler) {
      await routeHandler(req as Request, res as Response, () => {});
    } else {
      throw new Error('Route handler not found');
    }

    // Assert customer was created
    expect(mockStripe.customers.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test User',
      metadata: { userId: '1' },
    });

    // Assert payment method was attached
    expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_test123', {
      customer: 'cus_new123',
    });
  });

  it('should return error if email is missing', async () => {
    req.body = {};

    const layer = router.stack.find(
      (layer: any) => layer.route?.path === '/subscription' && layer.route?.methods?.post
    );
    const routeHandler = layer?.route?.stack[0]?.handle;

    if (routeHandler) {
      await routeHandler(req as Request, res as Response, () => {});
    } else {
      throw new Error('Route handler not found');
    }

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'Email is required' });
  });

  it('should handle missing payment intent in subscription', async () => {
    mockDb.where.mockResolvedValue([{
      id: 1,
      email: 'test@example.com',
      stripeCustomerId: 'cus_test123',
    }]);

    mockStripe.products.retrieve.mockResolvedValue({
      id: 'prod_SGqepEtdqqQYcW',
      default_price: { id: 'price_test123' },
    });

    // Mock subscription without payment intent
    mockStripe.subscriptions.create.mockResolvedValue({
      id: 'sub_test123',
      status: 'incomplete',
      latest_invoice: {
        id: 'inv_test123',
        // No payment_intent
      },
    });

    const layer = router.stack.find(
      (layer: any) => layer.route?.path === '/subscription' && layer.route?.methods?.post
    );
    const routeHandler = layer?.route?.stack[0]?.handle;

    if (routeHandler) {
      await routeHandler(req as Request, res as Response, () => {});
    } else {
      throw new Error('Route handler not found');
    }

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Failed to create subscription',
      error: 'Failed to create payment intent for subscription',
    });
  });
}); 