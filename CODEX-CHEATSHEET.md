# QuoteBid V1 Local Development Cheat Sheet for Codex

## Required Node Version
This project requires Node.js version 20.x
```bash
# Check your Node version
node -v

# If needed, install and use Node 20 via nvm
nvm install 20
nvm use 20
```

## Environment Setup (.env)
Create a `.env` file in the project root with these variables:

```
# HTTP port
PORT=5050

# Database connection
DATABASE_URL=postgresql://neondb_owner:npg_7IqSJmvyUZ2d@ep-black-truth-a5i2qahj.us-east-2.aws.neon.tech/neondb?sslmode=require

# Stripe test keys (use your own test keys)
STRIPE_PUBLIC=pk_test_•••
STRIPE_SECRET=sk_test_•••

# Other required variables
NODE_ENV=development
SESSION_SECRET=local_development_secret
JWT_SECRET=quotebid_secret
```

You can use the provided script to generate a basic .env file:
```bash
node write-env.mjs
```

## Installation

```bash
# Install dependencies (in project root)
npm install

# Alternative with pnpm if available
pnpm i
```

## Database Setup

```bash
# Run migrations
npm run db:push

# Alternative with pnpm
pnpm drizzle:push
```

## Starting Development Servers

```bash
# Start the full stack development server
npm run dev

# Alternative: Start backend and frontend separately
# Backend API server
npm run dev:server  # runs on http://localhost:5050

# Frontend Vite server (in a separate terminal)
npm run dev:client  # runs on http://localhost:5173
```

## Project Structure Overview
- `/client` - React frontend (Vite)
- `/server` - Express.js backend
- `/shared` - Shared types and utilities
- `/src` - Additional source code
- `/migrations` - Database migrations
- `/uploads` - User uploaded files

## Stripe Webhook (Optional)
```bash
stripe listen --forward-to http://localhost:5050/api/stripe/webhook
```

## Testing
```bash
npm test
```

## Common Issues

### Missing agents.md File
Codex sometimes searches for this file. Create it with:
```bash
mkdir -p docs && touch docs/agents.md
```

### Port Conflicts
If port 5050 or 5173 is already in use, modify the PORT variable in .env 