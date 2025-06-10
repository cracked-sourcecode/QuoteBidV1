# Step 8: 24-Hour Post-Deploy Tuning & Monitoring

**Goal:** Fine-tune weights and confirm long-run stability after the v2 canary has processed a full day of live data.

**Audience:** Product + DevOps + Data analysts

---

## 8-A: Key Dashboards & Monitoring

### Critical KPIs & Health Bands

| Metric | Source | Healthy Band | Alert Threshold |
|--------|--------|--------------|----------------|
| **Drift Count** | Grafana `engine_drift_applied` | ≤ 6 / hr | > 8 / hr |
| **Avg Price Delta** | `engine_price_delta_avg` | $1 – $15 | Outside $0.75-$18.75 |
| **Pitch-to-Click Rate** | SQL: `SUM(pitches)/SUM(clicks)` | ≥ 10% | < 7.5% |
| **Time-to-Floor** | SQL: Dead opp decay | < 24h | > 30h |
| **Ceiling Hits** | `meta.ceilingClamped=true` | < 2% opps | > 2.5% |

### Grafana Dashboard Setup

```bash
# Import the v2 monitoring dashboard
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @monitoring/grafana-dashboard-pricing-v2.json

# Set up alerting rules (±25% outside healthy bands)
curl -X POST http://grafana:3000/api/alert-rules \
  -H "Content-Type: application/json" \
  -d '{
    "title": "High Drift Rate Alert",
    "condition": "A",
    "data": [
      {
        "refId": "A",
        "queryType": "",
        "model": {
          "expr": "sum(rate(pricing_drift_applied_total[1h])) > 8"
        }
      }
    ],
    "noDataState": "NoData",
    "execErrState": "Alerting"
  }'
```

### SQL Monitoring Queries

Run these queries hourly to validate KPI health:

```sql
-- Quick health check (run every hour)
WITH health_metrics AS (
  SELECT 
    'drift_rate' as metric,
    COUNT(*) as hourly_value,
    CASE WHEN COUNT(*) <= 6 THEN '✅ HEALTHY' ELSE '🚨 ALERT' END as status
  FROM opportunities 
  WHERE "lastDriftAt"::timestamp >= NOW() - INTERVAL '1 hour'
  
  UNION ALL
  
  SELECT 
    'conversion_rate' as metric,
    (SUM(clicks) * 100.0 / NULLIF(SUM(pitches), 0)) as hourly_value,
    CASE 
      WHEN (SUM(clicks) * 100.0 / NULLIF(SUM(pitches), 0)) >= 10 
      THEN '✅ HEALTHY' 
      ELSE '🚨 ALERT' 
    END as status
  FROM opportunities 
  WHERE created_at >= NOW() - INTERVAL '24 hours'
)
SELECT * FROM health_metrics;
```

---

## 8-B: Weight-Tuning Cheat Sheet

### Interactive Admin Interface

Access the new tuning interface at:
- **URL:** `/admin/pricing` 
- **Tab:** "Tuning Guide"
- **Real-time guidance** based on current weight values and symptoms

### Common Symptoms & Adjustments

| Symptom | Weight to Adjust | Direction | Example | 
|---------|------------------|-----------|---------|
| **Prices overshoot on bursts** | `pitchVelocityBoost` | ↓ Decrease | 0.2 → 0.1 |
| **Vanity clicks inflate price** | `conversionPenalty` | ↓ More negative | -0.4 → -0.6 |
| **Outlet fatigue insufficient** | `outletLoadPenalty` | ↓ More negative | -0.2 → -0.4 |
| **Dead opps decay slowly** | `hoursRemaining` weight | ↓ More negative | -0.6 → -0.8 |
| **Drift too chatty** | `ambient.triggerMins` | ↑ Increase | 7 → 10 mins |

### Quick Tuning Process

1. **Identify Symptom** → Use health dashboard or user reports
2. **Adjust Weight** → Via Admin UI "Weight Configuration" tab
3. **Save Changes** → Worker picks up automatically (next 2-min cycle)
4. **Monitor Impact** → Check "24h Health Monitor" tab for 30-60 minutes
5. **Iterate** → Fine-tune based on observed behavior

---

## 8-C: Weekly Calibration Task

### Automated Outlet Price Recalibration

Set up the weekly cron job to recalibrate outlet average prices:

```bash
# Add to crontab (runs every Sunday at 2 AM)
0 2 * * 0 /usr/bin/node /path/to/scripts/weekly-calibration.js

# Test run (dry-run mode)
cd /path/to/quotebid
node scripts/weekly-calibration.js --dry-run

# Manual execution
node scripts/weekly-calibration.js
```

### What It Does

- **Analyzes** last 30 days of winning bid data per outlet
- **Calculates** realistic price floors and ceilings based on market data
- **Updates** outlet configuration automatically
- **Generates** detailed calibration report
- **Maintains** pricing engine accuracy as markets evolve

---

## 8-D: Exit Criteria (Canary → Production)

### 24-Hour Health Requirements

**All criteria must be met for 24+ consecutive hours:**

- ✅ **Drift Count:** ≤ 6/hr consistently
- ✅ **Price Delta:** Within $1-$15 range
- ✅ **Conversion Rate:** ≥ 10% maintained  
- ✅ **Time-to-Floor:** < 24h for dead opportunities
- ✅ **Ceiling Hits:** < 2% of opportunities
- ✅ **Error Rate:** < 1% in worker logs
- ✅ **GPT Latency:** < 5 second average

### Additional Requirements

- ✅ **PM Sign-off:** Product Manager approval of price curves & Admin UX
- ✅ **No Error Spikes:** Worker logs clean for 24h period
- ✅ **User Feedback:** No significant complaints about pricing behavior
- ✅ **Performance:** No degradation in response times or throughput

### Promotion Process

When all criteria are met:

```bash
# 1. Retag Docker image for production
docker tag registry.example.com/quote/worker:v2-canary registry.example.com/quote/worker:prod
docker push registry.example.com/quote/worker:prod

# 2. Update production deployment
kubectl set image deployment/pricing-worker worker=registry.example.com/quote/worker:prod

# 3. Merge canary branch to main
git checkout main
git merge pricing-engine-install-v2
git push origin main

# 4. Clean up canary resources
docker rmi registry.example.com/quote/worker:v2-canary
git branch -d pricing-engine-install-v2
```

---

## 8-E: Rollback Procedures

### Emergency Rollback Criteria

**Immediate rollback if ANY condition occurs:**

- 🚨 **KPI Deviation:** >50% outside healthy band for >30 minutes
- 🚨 **Error Spike:** >5% error rate in worker logs
- 🚨 **Performance:** >10 second average GPT latency
- 🚨 **System Instability:** Worker crashes or memory leaks
- 🚨 **User Impact:** Multiple complaints about pricing anomalies

### Rollback Process

**1. Immediate Actions (< 5 minutes):**

```bash
# Revert worker to legacy tag
kubectl set image deployment/pricing-worker worker=registry.example.com/quote/worker:legacy

# Verify rollback
kubectl get pods -l app=pricing-worker
kubectl logs -f deployment/pricing-worker

# Check health
curl http://pricing-worker:8080/health
```

**2. Incident Response (< 15 minutes):**

```bash
# Open incident channel
slack-cli send "#incidents" "🚨 PRICING ENGINE V2 ROLLBACK INITIATED
• Time: $(date)
• Cause: [MANUAL DESCRIPTION]
• Status: Legacy engine restored
• ETA: Investigating root cause"

# Capture rollback evidence
kubectl describe deployment pricing-worker > /tmp/rollback-evidence.txt
kubectl logs deployment/pricing-worker --previous > /tmp/v2-logs.txt
```

**3. Post-Rollback Validation (< 30 minutes):**

```sql
-- Verify legacy engine is active
SELECT 
  engine_version,
  COUNT(*) as recent_ticks,
  MAX(created_at) as last_tick
FROM pricing_logs 
WHERE created_at >= NOW() - INTERVAL '15 minutes'
GROUP BY engine_version;

-- Check for pricing anomalies
SELECT 
  id, 
  title, 
  price, 
  updated_at 
FROM opportunities 
WHERE updated_at >= NOW() - INTERVAL '30 minutes'
  AND (price < 10 OR price > 1000)
ORDER BY updated_at DESC;
```

### Post-Incident Analysis

1. **Root Cause Investigation:** Analyze logs, metrics, and user reports
2. **Fix Development:** Address the identified issues in v2 codebase  
3. **Testing:** Comprehensive testing in staging environment
4. **Re-deployment Planning:** Schedule new canary deployment when fixes are ready

---

## 8-F: Operational Playbooks

### Daily Health Check (Automated)

```bash
#!/bin/bash
# daily-health-check.sh - Run at 9 AM daily

echo "🏥 QuoteBid Pricing Engine v2 - Daily Health Check"
echo "Date: $(date)"
echo ""

# Check critical KPIs
psql $DATABASE_URL -f monitoring/sql-queries-v2.sql > /tmp/health-report.txt

# Check for alerts
curl -s "http://grafana:3000/api/alerts" | jq '.[] | select(.state != "ok")' > /tmp/active-alerts.json

# Email report to team
if [ -s /tmp/active-alerts.json ]; then
  echo "🚨 ALERTS DETECTED - Review required" | mail -s "Pricing v2 Health Alert" team@quotebid.com
else
  echo "✅ All systems healthy" | mail -s "Pricing v2 Daily Health ✅" team@quotebid.com
fi
```

### Weekly Review Checklist

**Every Monday 10 AM - PM/DevOps/Data Team Review:**

- [ ] Review previous week's KPI trends in Grafana
- [ ] Analyze outlet calibration report from Sunday run
- [ ] Check for any user-reported pricing issues
- [ ] Review error logs and performance metrics
- [ ] Plan any weight adjustments based on observations
- [ ] Update documentation with lessons learned

### Monthly Deep Dive

**First Monday of each month - Full team review:**

- [ ] Comprehensive KPI analysis (month-over-month)
- [ ] User satisfaction survey results
- [ ] Performance benchmarking vs. legacy engine
- [ ] Market conditions impact assessment
- [ ] Planning for v3 features and improvements
- [ ] Database optimization and cleanup

---

## 8-G: Success Metrics & KPIs

### Primary Success Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| **System Stability** | >99.5% uptime | Worker availability |
| **Price Accuracy** | 95% in target bands | KPI monitoring |
| **User Satisfaction** | >8/10 rating | Weekly surveys |
| **Performance** | <3s avg latency | GPT response times |
| **Market Efficiency** | 15% improvement | Conversion rates |

### Long-term Goals (3-month horizon)

- **Reduced Manual Intervention:** <2 weight adjustments per month
- **Improved Market Response:** Real-time adaptation to demand shifts  
- **Enhanced Predictability:** Stable pricing patterns users can rely on
- **Cost Optimization:** 20% reduction in GPT API costs through efficiency
- **Market Expansion:** Support for new outlet types and pricing models

---

## Conclusion

Step 8 establishes comprehensive monitoring, tuning, and operational procedures for the Pricing Engine v2. The combination of real-time dashboards, automated health checks, guided tuning interfaces, and clear rollback procedures ensures reliable operation while enabling continuous optimization.

**Key Success Factors:**
- **Proactive Monitoring:** Grafana dashboards and SQL queries catch issues early
- **Guided Tuning:** Admin interface provides real-time adjustment guidance  
- **Automated Calibration:** Weekly outlet price updates maintain market accuracy
- **Clear Procedures:** Well-defined exit criteria and rollback processes minimize risk
- **Team Alignment:** Regular reviews and shared responsibility ensure long-term success

🚀 **The Pricing Engine v2 is now production-ready with full operational support!** 