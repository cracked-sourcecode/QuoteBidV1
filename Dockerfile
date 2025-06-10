# QuoteBid Pricing Engine v2 - Docker Build
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Development dependencies for building
FROM base AS build-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build the application
FROM build-deps AS builder
WORKDIR /app
COPY . .

# Build the server and worker
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5050

# Create a non-root user
RUN addgroup --system --gid 1001 quotebid
RUN adduser --system --uid 1001 quotebid

# Copy built application and dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/emails ./emails
COPY --from=builder /app/package*.json ./

# Change ownership to quotebid user
RUN chown -R quotebid:quotebid /app
USER quotebid

# Expose port
EXPOSE 5050

# Default command (can be overridden for worker)
CMD ["npm", "start"] 