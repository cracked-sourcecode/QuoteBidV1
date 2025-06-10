# Step 8: 24-Hour Post-Deploy Monitoring - README

## Overview

This is the **final step** of the Pricing Engine v2 rollout! Step 8 establishes comprehensive monitoring, tuning, and operational procedures for the 24-hour post-deploy validation phase. The goal is to fine-tune weights and confirm long-run stability after the v2 canary has processed a full day of live data.

## 🎯 Quick Start

```bash
# 1. Set environment variables
export DATABASE_URL="postgresql://..."
export GRAFANA_URL="http://localhost:3000"
export GRAFANA_API_KEY="your-api-key"
export SLACK_WEBHOOK="https://hooks.slack.com/..." # Optional

# 2. Run the setup script
./scripts/setup-step8-monitoring.sh

# 3. Test the setup
node scripts/weekly-calibration.js --dry-run

# 4. Access monitoring dashboard
open $GRAFANA_URL
```

## 📊 Components Installed

### 1. Grafana Dashboard & Alerts
- **Dashboard:** QuoteBid Pricing Engine v2 - Post-Deploy Monitoring
- **Metrics:** Drift count, price delta, conversion rates, ceiling hits
- **Alerts:** Automated notifications when KPIs exceed healthy bands
- **Location:** `monitoring/grafana-dashboard-pricing-v2.json`

### 2. Database Health Monitoring
- **View:** `pricing_health_metrics` - Real-time KPI summary
- **Function:** `check_pricing_health()` - Health status validation
- **Queries:** Hourly health checks via SQL
- **Location:** `monitoring/sql-queries-v2.sql`

### 3. Weekly Outlet Calibration
- **Script:** `scripts/weekly-calibration.js`
- **Schedule:** Every Sunday at 2 AM (automated cron job)
- **Purpose:** Recalibrate outlet average prices based on 30-day winning bid data
- **Reports:** Detailed calibration reports with confidence scores

### 4. Admin UI Integration
- **Enhanced:** `/admin/pricing` page with Step 8 features
- **New Sections:**
  - 24-Hour Health Monitor
  - Weight Tuning Guide  
  - Real-time KPI status
  - Interactive weight adjustment guidance

### 5. Operational Scripts
- **Daily Health Check:** `/opt/quotebid/scripts/daily-health-check.sh`
- **Log Rotation:** 30-day retention with compression
- **Cron Jobs:** Automated monitoring and calibration

## 🔧 Configuration

### Required Environment Variables

```bash
# Database
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Monitoring
export GRAFANA_URL="http://grafana.example.com:3000"
export GRAFANA_API_KEY="your-grafana-api-key"

# Optional: Notifications
export SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
export API_URL="http://localhost:3000" # For health endpoint checks
```

### KPI Health Bands

| Metric | Healthy Band | Warning Threshold | Critical Threshold |
|--------|--------------|-------------------|-------------------|
| **Drift Count** | ≤ 6/hr | > 6/hr | > 8/hr |
| **Price Delta** | $1-$15 | Outside $0.75-$18.75 | Outside $0.50-$22.50 |
| **Conversion Rate** | ≥ 10% | < 10% | < 7.5% |
| **Ceiling Hits** | < 2% | > 2% | > 2.5% |

## 📈 Daily Operations

### Morning Health Check (9 AM Automated)

The system automatically runs a comprehensive health check every morning:

```bash
# View today's health report
tail -f /var/log/quotebid/health-check-$(date +%Y%m%d).log

# Check for any alerts
cat /var/log/quotebid/health-alerts.log
```

### Real-time Monitoring

Access the Grafana dashboard for real-time monitoring:
- **URL:** `$GRAFANA_URL/d/pricing-v2-monitoring`
- **Key Panels:** KPI Overview, Price Trends, Drift Analysis, Performance Metrics
- **Refresh:** 30-second auto-refresh

### Manual Health Checks

```sql
-- Quick health status
SELECT * FROM check_pricing_health();

-- Detailed metrics
SELECT * FROM pricing_health_metrics;

-- Recent pricing activity
SELECT id, title, price, meta, updated_at 
FROM opportunities 
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 10;
```

## ⚙️ Weight Tuning

### Interactive Admin Interface

1. Navigate to `/admin/pricing`
2. Click "Tuning Guide" tab
3. Review current health status
4. Follow guided recommendations for weight adjustments
5. Save changes (auto-applied to worker within 2 minutes)

### Common Tuning Scenarios

| Symptom | Action | Weight | Direction | Example |
|---------|--------|--------|-----------|---------|
| Prices spike on small bursts | Reduce velocity sensitivity | `pitchVelocityBoost` | ↓ | 0.2 → 0.1 |
| Vanity clicks drive up prices | Increase conversion penalty | `conversionPenalty` | ↓ | -0.4 → -0.6 |
| Outlets not responding to load | Increase load penalty | `outletLoadPenalty` | ↓ | -0.2 → -0.4 |
| Dead opportunities decay slowly | Increase decay rate | Hours remaining weight | ↓ | -0.6 → -0.8 |
| Too much drift chatter | Increase trigger threshold | `ambient.triggerMins` | ↑ | 7 → 10 |

### Manual Weight Updates

```sql
-- Update weight via SQL (hot-reload enabled)
UPDATE config 
SET value = '-0.6', updated_at = NOW() 
WHERE key = 'conversionPenalty';

-- Verify change applied
SELECT key, value, updated_at 
FROM config 
WHERE key IN ('conversionPenalty', 'pitchVelocityBoost', 'outletLoadPenalty');
```

## 📅 Weekly Operations

### Sunday: Automated Outlet Calibration (2 AM)

The system automatically recalibrates outlet pricing parameters every Sunday:

```bash
# Check last calibration report
tail -n 100 /var/log/quotebid/calibration.log

# Run manual calibration (dry-run)
node scripts/weekly-calibration.js --dry-run

# Run manual calibration (live)
node scripts/weekly-calibration.js
```

### Monday: Team Review Checklist

**Every Monday 10 AM - PM/DevOps/Data Team Review:**

- [ ] Review previous week's KPI trends in Grafana
- [ ] Analyze outlet calibration report from Sunday
- [ ] Check for any user-reported pricing issues  
- [ ] Review error logs and performance metrics
- [ ] Plan any weight adjustments based on observations
- [ ] Update documentation with lessons learned

## 🚨 Emergency Procedures

### Rollback Criteria

**Immediate rollback if ANY condition occurs:**
- KPI deviation >50% outside healthy band for >30 minutes
- Error spike >5% in worker logs
- GPT latency >10 seconds average
- Worker crashes or memory leaks
- Multiple user complaints about pricing anomalies

### Rollback Process

```bash
# 1. Immediate rollback (< 5 minutes)
kubectl set image deployment/pricing-worker worker=registry.example.com/quote/worker:legacy

# 2. Verify rollback
kubectl get pods -l app=pricing-worker
kubectl logs -f deployment/pricing-worker

# 3. Health check
curl http://pricing-worker:8080/health

# 4. Notify team
slack-cli send "#incidents" "🚨 PRICING ENGINE V2 ROLLBACK INITIATED"
```

### Post-Incident Analysis

1. **Root Cause Investigation:** Analyze logs, metrics, and user reports
2. **Fix Development:** Address identified issues in v2 codebase
3. **Testing:** Comprehensive testing in staging environment
4. **Re-deployment Planning:** Schedule new canary when fixes are ready

## ✅ Exit Criteria (Canary → Production)

### 24-Hour Health Requirements

**All criteria must be met for 24+ consecutive hours:**
- ✅ Drift Count: ≤ 6/hr consistently
- ✅ Price Delta: Within $1-$15 range
- ✅ Conversion Rate: ≥ 10% maintained
- ✅ Time-to-Floor: < 24h for dead opportunities
- ✅ Ceiling Hits: < 2% of opportunities
- ✅ Error Rate: < 1% in worker logs
- ✅ GPT Latency: < 5 second average

### Additional Requirements
- ✅ PM Sign-off: Product Manager approval
- ✅ No Error Spikes: Clean worker logs for 24h
- ✅ User Feedback: No significant pricing complaints
- ✅ Performance: No degradation in response times

### Production Promotion

When all criteria are met:

```bash
# 1. Retag Docker image
docker tag registry.example.com/quote/worker:v2-canary registry.example.com/quote/worker:prod
docker push registry.example.com/quote/worker:prod

# 2. Update production
kubectl set image deployment/pricing-worker worker=registry.example.com/quote/worker:prod

# 3. Merge to main
git checkout main
git merge pricing-engine-install-v2
git push origin main

# 4. Cleanup
docker rmi registry.example.com/quote/worker:v2-canary
git branch -d pricing-engine-install-v2
```

## 📞 Support & Troubleshooting

### Log Locations
- **Health Checks:** `/var/log/quotebid/health-check-YYYYMMDD.log`
- **Calibration:** `/var/log/quotebid/calibration.log`
- **Alerts:** `/var/log/quotebid/health-alerts.log`
- **Hourly Health:** `/var/log/quotebid/hourly-health.log`

### Key Dashboards
- **Grafana:** `$GRAFANA_URL/d/pricing-v2-monitoring`
- **Admin UI:** `/admin/pricing` (Health Monitor tab)
- **Database:** `pricing_health_metrics` view

### Emergency Contacts
- **Pricing Team:** #pricing-alerts Slack channel
- **DevOps:** #incidents Slack channel  
- **Documentation:** `./STEP-8-POST-DEPLOY-MONITORING.md`

### Common Issues

**Q: Drift count is high (>8/hr)**
- Check recent price changes in opportunities table
- Review pitch velocity patterns
- Consider increasing `ambient.triggerMins` to reduce sensitivity
- Verify GPT API performance isn't causing delays

**Q: Price delta is outside healthy range**
- Check for market volatility or unusual activity
- Review outlet load distribution
- Verify weight configurations haven't been corrupted
- Check for outlier opportunities skewing averages

**Q: Conversion rate is dropping**
- Analyze pitch-to-click patterns by outlet
- Check if pricing is becoming too aggressive
- Review vanity click detection accuracy
- Consider adjusting `conversionPenalty` weight

## 🏁 Success!

Congratulations! You've successfully completed the Pricing Engine v2 rollout. The system now includes:

- ✅ **Modern Pricing Algorithm:** AI-powered dynamic pricing with market signals
- ✅ **Real-time Telemetry:** Comprehensive metadata and drift tracking
- ✅ **Advanced Admin Controls:** Interactive weight tuning with hot-reload
- ✅ **Production Infrastructure:** Docker deployment with canary releases  
- ✅ **Comprehensive Monitoring:** Grafana dashboards and automated health checks
- ✅ **Operational Excellence:** Automated calibration, alerting, and rollback procedures

The Pricing Engine v2 is now ready for long-term production use with full operational support! 🚀

---

**Next Steps:** Monitor the system for 24-48 hours, fine-tune weights as needed, and prepare for the production promotion once all exit criteria are met. 