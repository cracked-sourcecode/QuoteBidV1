#!/bin/bash

# QuoteBid Pricing Engine v2 - Canary Deployment Script
# Usage: ./scripts/deploy-canary.sh [REGISTRY_URL]

set -e

# Configuration
REGISTRY_URL=${1:-"registry.example.com"}
IMAGE_NAME="quote/worker"
CANARY_TAG="v2-canary"
FULL_IMAGE="${REGISTRY_URL}/${IMAGE_NAME}:${CANARY_TAG}"

echo "🚀 Starting Pricing Engine v2 Canary Deployment"
echo "================================================"
echo "Registry: ${REGISTRY_URL}"
echo "Image: ${IMAGE_NAME}:${CANARY_TAG}"
echo ""

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "pricing-engine-install-v2" ]; then
    echo "❌ Error: Must be on 'pricing-engine-install-v2' branch"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

echo "✅ Confirmed on branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: Uncommitted changes detected"
    echo "Do you want to continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# Step 7-A: Build & Push Docker Image
echo ""
echo "📦 Step 7-A: Building Docker image..."
echo "======================================"

# Build the image
echo "Building: $FULL_IMAGE"
docker build -t "$FULL_IMAGE" .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Push the image
echo ""
echo "📤 Pushing image to registry..."
docker push "$FULL_IMAGE"

if [ $? -eq 0 ]; then
    echo "✅ Docker push successful"
else
    echo "❌ Docker push failed"
    exit 1
fi

# Step 7-B: PM2 Deployment Instructions
echo ""
echo "🔧 Step 7-B: Deployment Instructions"
echo "===================================="
echo ""
echo "To deploy the canary worker with PM2:"
echo ""
echo "1. Stop the current worker:"
echo "   pm2 delete updatePrices"
echo ""
echo "2. Start the v2 canary worker:"
echo "   ENGINE_VERSION=v2-canary \\"
echo "     WORKER_IMAGE=${FULL_IMAGE} \\"
echo "     pm2 start ecosystem.config.cjs --only updatePrices"
echo ""
echo "3. Monitor the worker:"
echo "   pm2 logs updatePrices"
echo "   pm2 monit"
echo ""

# Step 7-D: Rollback Instructions
echo "🔄 Step 7-D: Rollback Instructions (if needed)"
echo "=============================================="
echo ""
echo "To rollback to legacy engine:"
echo ""
echo "1. Stop the v2 worker:"
echo "   pm2 delete updatePrices"
echo ""
echo "2. Restart with legacy engine:"
echo "   pm2 start ecosystem.config.cjs --only updatePrices"
echo ""

echo "🎯 Canary deployment prepared successfully!"
echo ""
echo "Next steps:"
echo "- Execute the PM2 commands above on your production server"
echo "- Run Step 7-C smoke tests"
echo "- Monitor for 24 hours before merging to main"
echo ""
echo "Image ready: $FULL_IMAGE" 