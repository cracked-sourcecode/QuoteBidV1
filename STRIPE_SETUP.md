# Stripe Setup Guide for QuoteBid

## Required Environment Variables

You need to set up Stripe API keys in two places:

### 1. Client-side (Frontend) - `/client/.env`

Create a file called `.env` in the `client` directory with:

```
VITE_STRIPE_PUBLIC_KEY=pk_test_YOUR_STRIPE_PUBLIC_KEY_HERE
```

### 2. Server-side (Backend) - `/server/.env` or root `.env`

Create a file called `.env` in the `server` directory (or root directory) with:

```
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_PRICE_ID=price_YOUR_STRIPE_PRICE_ID_HERE
```

## Getting Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Make sure you're in **Test Mode** (toggle in the top right)
3. Copy your keys:
   - **Publishable key** (starts with `pk_test_`) → Use for `VITE_STRIPE_PUBLIC_KEY`
   - **Secret key** (starts with `sk_test_`) → Use for `STRIPE_SECRET_KEY`

## Creating a Price ID

1. Go to [Stripe Products](https://dashboard.stripe.com/test/products)
2. Create a new product for "QuoteBid Membership"
3. Add a recurring price of $99.99/month
4. Copy the Price ID (starts with `price_`) → Use for `STRIPE_PRICE_ID`

## Test Card Numbers

For testing payments, use these card numbers:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

Use any future expiry date and any 3-digit CVC.

## Troubleshooting

If you see "Missing required Stripe key" errors:
1. Make sure you've created both `.env` files
2. Restart your development servers after adding the keys
3. Check that the keys are correctly prefixed (`pk_test_` and `sk_test_`) 