# Pricing Engine v2 - Canary Deployment Guide

**Version**: 2.0.0-canary  
**Branch**: `pricing-engine-install-v2`  
**Date**: January 2025  

## Overview

This guide covers the canary deployment of QuoteBid's Pricing Engine v2 without merging to main. The canary deployment allows running v2 in production while maintaining the ability to rollback instantly.

## Prerequisites ✅

- [x] Steps 1-6 completed successfully
- [x] QA testing passed (see `QA-Run-v2.md`)
- [x] V2 telemetry working (meta fields populated)
- [x] All commits on `pricing-engine-install-v2` branch
- [x] Docker and registry access configured

## Step 7-A: Build & Push Canary Image

### Automated Deployment
```bash
# Run the automated deployment script
./scripts/deploy-canary.sh [YOUR_REGISTRY_URL]

# Example:
./scripts/deploy-canary.sh registry.example.com
```

### Manual Deployment
```bash
# Ensure you're on the correct branch
git checkout pricing-engine-install-v2

# Build the Docker image
docker build -t registry.example.com/quote/worker:v2-canary .

# Push to registry
docker push registry.example.com/quote/worker:v2-canary
```

## Step 7-B: Deploy Worker Only

### PM2 Deployment (Single VM)
```bash
# Stop current worker
pm2 delete updatePrices

# Deploy v2 canary
ENGINE_VERSION=v2-canary \
  WORKER_IMAGE=registry.example.com/quote/worker:v2-canary \
  pm2 start ecosystem.config.cjs --only updatePrices

# Monitor deployment
pm2 logs updatePrices
pm2 monit
```

### Kubernetes Deployment
```bash
# Update worker deployment only
kubectl set image deployment/quote-worker \
  worker=registry.example.com/quote/worker:v2-canary --record

# Monitor rollout
kubectl rollout status deployment/quote-worker
kubectl logs -f deployment/quote-worker
```

**Important**: No UI or API pods are restarted during this deployment.

## Step 7-C: Smoke Testing

### Automated Smoke Test
```bash
# Run smoke test against production
./scripts/smoke-test-v2.sh https://your-production-api.com

# Or against local/staging
./scripts/smoke-test-v2.sh http://localhost:5050
```

### Manual Smoke Test
1. **Select Low-Stakes Opportunity**: Choose an opportunity with moderate price
2. **Record Baseline**: Note current price and meta fields
3. **Generate Activity**: 
   - Add 1 click: `POST /api/opportunities/{id}/click`
   - Add 1 pitch: `POST /api/opportunities/{id}/pitch`
4. **Wait One Cycle**: Wait for pricing worker cycle (typically 2-5 minutes)
5. **Validate Results**:
   - ✅ Meta populated with v2 telemetry
   - ✅ Price change ≤ $30
   - ✅ No hard clamps ($50/$500 boundaries)

### Expected Behavior
```json
{
  \"id\": 123,
  \"current_price\": \"275.00\",
  \"meta\": {
    \"score\": 3.47,
    \"driftApplied\": false,
    \"lastCalculated\": \"2025-01-09T20:30:15.123Z\",
    \"conversionPenalty\": -0.4,
    \"pitchVelocityBoost\": 0.2,
    \"outletLoadPenalty\": -0.2
  }
}
```

## Step 7-D: Rollback (If Needed)

### PM2 Rollback
```bash
# Stop v2 worker
pm2 delete updatePrices

# Restart with legacy engine
pm2 start ecosystem.config.cjs --only updatePrices
```

### Kubernetes Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/quote-worker

# Verify rollback
kubectl rollout status deployment/quote-worker
```

## Step 7-E: Admin UI V2 Controls

The admin pricing page now includes V2 weight configuration:

### New Controls Available
- **Vanity-click penalty** (`conversionPenalty`): -1.0 to 0.0
- **Velocity boost** (`pitchVelocityBoost`): 0.0 to 1.0
- **Outlet-overload penalty** (`outletLoadPenalty`): -1.0 to 0.0

### Access Admin UI
```
https://your-domain.com/admin/pricing
```

### Hot-Reload Testing
1. Change any v2 weight value
2. Click \"Save Changes\"
3. Wait for next pricing cycle
4. Verify changes applied in opportunity metadata

## Step 7-F: Monitoring & Next Steps

### 24-Hour Monitoring Checklist
- [ ] Worker process stable (no crashes)
- [ ] Price changes within expected bounds
- [ ] Meta telemetry consistently populated
- [ ] No performance degradation
- [ ] Admin UI controls working properly

### Monitoring Commands
```bash
# PM2 monitoring
pm2 monit
pm2 logs updatePrices --lines 100

# Kubernetes monitoring
kubectl get pods -l app=quote-worker
kubectl logs -f deployment/quote-worker
kubectl top pods -l app=quote-worker
```

### Key Metrics to Watch
- **Worker Uptime**: Should be 100%
- **Price Update Frequency**: Every 2-5 minutes
- **Meta Population Rate**: 100% of opportunities
- **Price Delta Distribution**: Most changes < $30
- **Error Rate**: 0% unhandled exceptions

## Success Criteria

### ✅ Deployment Successful When:
1. Worker deploys without errors
2. Smoke test passes completely
3. V2 telemetry populating correctly
4. Admin UI controls working
5. No legacy clamps observed
6. Price changes within expected bands

### ⚠️ Rollback Triggers:
- Worker crashes or high error rate
- Meta telemetry stops populating
- Price changes > $30 frequently
- Performance degradation
- Admin UI not responding

## Post-Deployment

### After 24 Hours of Stable Operation:

1. **Merge to Main**:
   ```bash
   git checkout main
   git merge pricing-engine-install-v2
   git push origin main
   ```

2. **Retag Production Image**:
   ```bash
   docker tag registry.example.com/quote/worker:v2-canary registry.example.com/quote/worker:prod
   docker push registry.example.com/quote/worker:prod
   ```

3. **Proceed to Step 8**: Post-deploy tuning and optimization

## Troubleshooting

### Common Issues

**Meta Not Populating**
- Check worker logs for errors
- Verify v2 engine function is being called
- Ensure database columns exist

**Price Changes Too Large**
- Review v2 weight configurations
- Check for data quality issues
- Verify signal calculations

**Worker Crashes**
- Check memory usage
- Review error logs
- Verify database connections

### Support Contacts

- **Engineering**: Check worker logs and database
- **Product**: Verify business logic and weights
- **DevOps**: Monitor infrastructure and deployments

## Files Created/Modified

### New Files
- `Dockerfile` - Container build configuration
- `ecosystem.config.cjs` - PM2 process management
- `scripts/deploy-canary.sh` - Automated deployment
- `scripts/smoke-test-v2.sh` - Automated testing
- `DEPLOYMENT-GUIDE-V2.md` - This guide

### Modified Files
- `client/src/pages/admin/pricing.tsx` - V2 admin controls
- `lib/pricing/pricingEngine.ts` - V2 engine with metadata
- `server/jobs/updatePrices.ts` - V2 engine integration

---

**🎯 Canary Deployment Complete!**

Your Pricing Engine v2 is now running in production alongside the existing system. Monitor for 24 hours before proceeding to full deployment. 