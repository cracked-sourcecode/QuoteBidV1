#!/bin/bash

# QuoteBid Pricing Engine v2 - Smoke Test Script
# Usage: ./scripts/smoke-test-v2.sh [API_URL]

set -e

API_URL=${1:-"http://localhost:5050"}
TIMEOUT=30

echo "🔬 Pricing Engine v2 Smoke Test"
echo "==============================="
echo "API URL: $API_URL"
echo "Test Duration: Up to $TIMEOUT seconds"
echo ""

# Helper function to make API calls
make_api_call() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="$3"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            --max-time $TIMEOUT
    else
        curl -s -X "$method" "$API_URL$endpoint" \
            --max-time $TIMEOUT
    fi
}

# Step 7-C: Smoke Test (Production Scoped)
echo "🎯 Step 7-C: Smoke Test Execution"
echo "=================================="
echo ""

# 1. Get current opportunities
echo "1. Fetching current opportunities..."
OPPORTUNITIES=$(make_api_call "/api/opportunities")

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch opportunities"
    exit 1
fi

echo "✅ Successfully fetched opportunities"

# Extract a low-stakes opportunity (lowest price)
OPP_ID=$(echo "$OPPORTUNITIES" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
OPP_PRICE=$(echo "$OPPORTUNITIES" | grep -A5 '"id":'$OPP_ID | grep -o '"current_price":"[^"]*"' | grep -o '[0-9.]*')

if [ -z "$OPP_ID" ] || [ -z "$OPP_PRICE" ]; then
    echo "❌ Could not extract opportunity data"
    exit 1
fi

echo "📊 Selected Opportunity: ID $OPP_ID (Current Price: \$$OPP_PRICE)"
echo ""

# 2. Record baseline metadata
echo "2. Recording baseline metadata..."
BASELINE_RESPONSE=$(make_api_call "/api/opportunities/$OPP_ID")
BASELINE_META=$(echo "$BASELINE_RESPONSE" | grep -o '"meta":[^,}]*')

echo "📝 Baseline Meta: $BASELINE_META"
echo "📝 Baseline Price: \$$OPP_PRICE"
echo ""

# 3. Force one click
echo "3. Simulating user click..."
CLICK_RESPONSE=$(make_api_call "/api/opportunities/$OPP_ID/click" "POST" '{"userId": 999}')

if [ $? -eq 0 ]; then
    echo "✅ Click simulation successful"
else
    echo "⚠️  Click simulation failed (may not affect test)"
fi
echo ""

# 4. Force one pitch
echo "4. Simulating user pitch..."
PITCH_DATA='{"userId": 999, "content": "V2 Engine Smoke Test Pitch - Safe to ignore"}'
PITCH_RESPONSE=$(make_api_call "/api/opportunities/$OPP_ID/pitch" "POST" "$PITCH_DATA")

if [ $? -eq 0 ]; then
    echo "✅ Pitch simulation successful"
else
    echo "⚠️  Pitch simulation failed (may not affect test)"
fi
echo ""

# 5. Wait for one pricing cycle (configurable, default 2 minutes)
WAIT_TIME=${PRICING_CYCLE_MINUTES:-2}
echo "5. Waiting for pricing cycle ($WAIT_TIME minutes)..."
echo "   ⏳ This allows the v2 engine to process the interactions..."

for i in $(seq 1 $WAIT_TIME); do
    echo "   ⏱️  Waiting... ($i/$WAIT_TIME minutes)"
    sleep 60
done
echo ""

# 6. Check post-cycle state
echo "6. Checking post-cycle state..."
POST_RESPONSE=$(make_api_call "/api/opportunities/$OPP_ID")
POST_PRICE=$(echo "$POST_RESPONSE" | grep -o '"current_price":"[^"]*"' | grep -o '[0-9.]*')
POST_META=$(echo "$POST_RESPONSE" | grep -o '"meta":[^,}]*')

echo "📊 Post-Cycle Price: \$$POST_PRICE"
echo "📊 Post-Cycle Meta: $POST_META"
echo ""

# 7. Validate results
echo "7. Validating v2 engine behavior..."
echo "=================================="

# Check if meta populated
if [[ "$POST_META" != *"null"* ]] && [[ -n "$POST_META" ]]; then
    echo "✅ Meta populated (v2 telemetry working)"
else
    echo "❌ Meta not populated (v2 telemetry issue)"
fi

# Check price change delta
PRICE_DELTA=$(echo "$POST_PRICE - $OPP_PRICE" | bc -l 2>/dev/null || echo "0")
PRICE_DELTA_ABS=$(echo "$PRICE_DELTA" | tr -d '-')

if (( $(echo "$PRICE_DELTA_ABS <= 30" | bc -l) )); then
    echo "✅ Price delta ≤ \$30 (Δ\$$PRICE_DELTA)"
else
    echo "❌ Price delta > \$30 (Δ\$$PRICE_DELTA)"
fi

# Check for old clamps (should not hit $50/$500)
if (( $(echo "$POST_PRICE > 50 && $POST_PRICE < 500" | bc -l) )); then
    echo "✅ Price within expected range (no hard clamps)"
else
    echo "⚠️  Price at boundary - check for legacy clamps"
fi

echo ""
echo "🎯 Smoke Test Complete!"
echo "======================="
echo "Summary:"
echo "- Opportunity ID: $OPP_ID"
echo "- Price Change: \$$OPP_PRICE → \$$POST_PRICE (Δ\$$PRICE_DELTA)"
echo "- Meta Status: $(if [[ "$POST_META" != *"null"* ]]; then echo "✅ Populated"; else echo "❌ Not Populated"; fi)"
echo ""
echo "If all checks passed, the v2 canary deployment is working correctly."
echo "Monitor for 24 hours before proceeding to main branch merge." 