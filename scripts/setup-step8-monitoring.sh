#!/bin/bash

###############################################################################
# QuoteBid Pricing Engine v2 - Step 8 Monitoring Setup
# 
# This script sets up comprehensive monitoring, alerting, and operational
# procedures for the 24-hour post-deploy phase.
#
# Usage: ./setup-step8-monitoring.sh [--dry-run]
###############################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DRY_RUN=${1:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running in dry-run mode
if [[ "$DRY_RUN" == "--dry-run" ]]; then
    log_warning "Running in DRY-RUN mode - no changes will be made"
    DRY_RUN=true
else
    DRY_RUN=false
fi

###############################################################################
# Environment Validation
###############################################################################

log_info "Validating environment for Step 8 setup..."

# Check required environment variables
REQUIRED_VARS=("DATABASE_URL" "GRAFANA_URL" "GRAFANA_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        log_error "$var environment variable is required"
        exit 1
    fi
done

# Check required commands
REQUIRED_COMMANDS=("curl" "jq" "psql" "node" "docker")
for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
        log_error "$cmd command is required but not installed"
        exit 1
    fi
done

# Check project structure
REQUIRED_FILES=(
    "monitoring/grafana-dashboard-pricing-v2.json"
    "monitoring/sql-queries-v2.sql"
    "scripts/weekly-calibration.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
        log_error "Required file not found: $file"
        exit 1
    fi
done

log_success "Environment validation passed"

###############################################################################
# 1. Grafana Dashboard Setup
###############################################################################

log_info "Setting up Grafana dashboards and alerts..."

setup_grafana() {
    local dashboard_file="$PROJECT_ROOT/monitoring/grafana-dashboard-pricing-v2.json"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would import dashboard: $dashboard_file"
        return 0
    fi
    
    # Import the main dashboard
    log_info "Importing Pricing Engine v2 dashboard..."
    local response=$(curl -s -X POST "$GRAFANA_URL/api/dashboards/db" \
        -H "Authorization: Bearer $GRAFANA_API_KEY" \
        -H "Content-Type: application/json" \
        -d @"$dashboard_file")
    
    if echo "$response" | jq -e '.status == "success"' >/dev/null; then
        log_success "Dashboard imported successfully"
    else
        log_error "Failed to import dashboard: $response"
        return 1
    fi
    
    # Set up alert rules
    log_info "Creating alert rules..."
    
    # High drift rate alert
    local drift_alert='{
        "title": "Pricing v2 - High Drift Rate",
        "uid": "pricing-v2-drift-alert",
        "condition": "A",
        "data": [{
            "refId": "A",
            "queryType": "",
            "model": {
                "expr": "sum(rate(pricing_drift_applied_total[1h])) > 8",
                "intervalMs": 60000,
                "maxDataPoints": 43200
            }
        }],
        "noDataState": "NoData",
        "execErrState": "Alerting",
        "annotations": {
            "description": "Pricing engine drift rate exceeded 8/hour threshold",
            "runbook_url": "https://docs.quotebid.com/pricing-v2-troubleshooting"
        },
        "labels": {
            "team": "pricing",
            "severity": "warning"
        }
    }'
    
    curl -s -X POST "$GRAFANA_URL/api/v1/provisioning/alert-rules" \
        -H "Authorization: Bearer $GRAFANA_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$drift_alert" >/dev/null
    
    # Price delta alert
    local delta_alert='{
        "title": "Pricing v2 - Price Delta Out of Range",
        "uid": "pricing-v2-delta-alert",
        "condition": "A",
        "data": [{
            "refId": "A",
            "queryType": "",
            "model": {
                "expr": "avg(pricing_price_delta_avg) < 1 OR avg(pricing_price_delta_avg) > 15",
                "intervalMs": 60000,
                "maxDataPoints": 43200
            }
        }],
        "noDataState": "NoData",
        "execErrState": "Alerting",
        "annotations": {
            "description": "Average price delta outside healthy $1-$15 range",
            "runbook_url": "https://docs.quotebid.com/pricing-v2-troubleshooting"
        },
        "labels": {
            "team": "pricing",
            "severity": "warning"
        }
    }'
    
    curl -s -X POST "$GRAFANA_URL/api/v1/provisioning/alert-rules" \
        -H "Authorization: Bearer $GRAFANA_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$delta_alert" >/dev/null
    
    log_success "Alert rules created"
}

setup_grafana

###############################################################################
# 2. Database Health Monitoring
###############################################################################

log_info "Setting up database health monitoring..."

setup_health_monitoring() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would create health monitoring views and functions"
        return 0
    fi
    
    # Create health monitoring views
    log_info "Creating database health monitoring views..."
    
    psql "$DATABASE_URL" <<EOF
-- Create health metrics view for easy monitoring
CREATE OR REPLACE VIEW pricing_health_metrics AS
WITH drift_metrics AS (
    SELECT 
        COUNT(*) FILTER (WHERE "lastDriftAt"::timestamp >= NOW() - INTERVAL '1 hour') as drift_last_hour,
        COUNT(*) FILTER (WHERE "lastDriftAt"::timestamp >= NOW() - INTERVAL '24 hours') as drift_last_24h
    FROM opportunities 
    WHERE "lastDriftAt" IS NOT NULL
),
price_metrics AS (
    SELECT 
        AVG(ABS(price - LAG(price) OVER (PARTITION BY opportunity_id ORDER BY updated_at))) as avg_price_delta,
        COUNT(*) as price_changes_24h
    FROM opportunities 
    WHERE updated_at >= NOW() - INTERVAL '24 hours'
),
conversion_metrics AS (
    SELECT 
        CASE 
            WHEN SUM(pitches) > 0 THEN (SUM(clicks) * 100.0 / SUM(pitches))
            ELSE 0 
        END as conversion_rate_24h
    FROM opportunities 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
),
ceiling_metrics AS (
    SELECT 
        COUNT(*) FILTER (WHERE meta->>'ceilingClamped' = 'true') as ceiling_hits,
        COUNT(*) as total_opportunities,
        CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE meta->>'ceilingClamped' = 'true') * 100.0 / COUNT(*))
            ELSE 0 
        END as ceiling_hit_percentage
    FROM opportunities 
    WHERE updated_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
    NOW() as measurement_time,
    dm.drift_last_hour,
    dm.drift_last_24h,
    ROUND(pm.avg_price_delta::numeric, 2) as avg_price_delta,
    pm.price_changes_24h,
    ROUND(cm.conversion_rate_24h::numeric, 2) as conversion_rate_24h,
    cem.ceiling_hits,
    cem.total_opportunities,
    ROUND(cem.ceiling_hit_percentage::numeric, 2) as ceiling_hit_percentage
FROM drift_metrics dm, price_metrics pm, conversion_metrics cm, ceiling_metrics cem;

-- Create function to check health status
CREATE OR REPLACE FUNCTION check_pricing_health()
RETURNS TABLE (
    metric text,
    current_value numeric,
    status text,
    threshold_min numeric,
    threshold_max numeric
) AS \$\$
BEGIN
    RETURN QUERY
    WITH health_check AS (
        SELECT * FROM pricing_health_metrics LIMIT 1
    )
    SELECT 
        'drift_rate'::text,
        hc.drift_last_hour::numeric,
        CASE 
            WHEN hc.drift_last_hour <= 6 THEN 'HEALTHY'
            WHEN hc.drift_last_hour <= 8 THEN 'WARNING' 
            ELSE 'CRITICAL'
        END::text,
        0::numeric,
        6::numeric
    FROM health_check hc
    
    UNION ALL
    
    SELECT 
        'price_delta'::text,
        hc.avg_price_delta,
        CASE 
            WHEN hc.avg_price_delta BETWEEN 1 AND 15 THEN 'HEALTHY'
            WHEN hc.avg_price_delta BETWEEN 0.75 AND 18.75 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::text,
        1::numeric,
        15::numeric
    FROM health_check hc
    
    UNION ALL
    
    SELECT 
        'conversion_rate'::text,
        hc.conversion_rate_24h,
        CASE 
            WHEN hc.conversion_rate_24h >= 10 THEN 'HEALTHY'
            WHEN hc.conversion_rate_24h >= 7.5 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::text,
        10::numeric,
        100::numeric
    FROM health_check hc
    
    UNION ALL
    
    SELECT 
        'ceiling_hits'::text,
        hc.ceiling_hit_percentage,
        CASE 
            WHEN hc.ceiling_hit_percentage < 2 THEN 'HEALTHY'
            WHEN hc.ceiling_hit_percentage < 2.5 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::text,
        0::numeric,
        2::numeric
    FROM health_check hc;
END;
\$\$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON pricing_health_metrics TO public;
GRANT EXECUTE ON FUNCTION check_pricing_health() TO public;
EOF

    log_success "Database health monitoring views created"
}

setup_health_monitoring

###############################################################################
# 3. Cron Job Setup
###############################################################################

log_info "Setting up cron jobs..."

setup_cron_jobs() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would setup cron jobs for weekly calibration and daily health checks"
        return 0
    fi
    
    # Create directory for cron scripts
    sudo mkdir -p /opt/quotebid/scripts
    sudo mkdir -p /var/log/quotebid
    
    # Copy scripts
    sudo cp "$PROJECT_ROOT/scripts/weekly-calibration.js" /opt/quotebid/scripts/
    sudo chmod +x /opt/quotebid/scripts/weekly-calibration.js
    
    # Create daily health check script
    cat > /tmp/daily-health-check.sh <<'EOF'
#!/bin/bash

LOG_FILE="/var/log/quotebid/health-check-$(date +%Y%m%d).log"
ALERT_FILE="/var/log/quotebid/health-alerts.log"

{
    echo "🏥 QuoteBid Pricing Engine v2 - Daily Health Check"
    echo "Date: $(date)"
    echo "=========================="
    
    # Run health check SQL
    psql "$DATABASE_URL" -c "SELECT * FROM check_pricing_health();" -t
    
    # Check for any critical status
    CRITICAL_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM check_pricing_health() WHERE status = 'CRITICAL';")
    WARNING_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM check_pricing_health() WHERE status = 'WARNING';")
    
    echo ""
    echo "Summary: $CRITICAL_COUNT critical, $WARNING_COUNT warning alerts"
    
    if [[ "$CRITICAL_COUNT" -gt 0 ]]; then
        echo "🚨 CRITICAL ISSUES DETECTED" | tee -a "$ALERT_FILE"
        # Send Slack notification if configured
        if [[ -n "$SLACK_WEBHOOK" ]]; then
            curl -X POST -H 'Content-type: application/json' \
                --data '{"text":"🚨 QuoteBid Pricing v2 CRITICAL health issues detected. Check logs for details."}' \
                "$SLACK_WEBHOOK"
        fi
    elif [[ "$WARNING_COUNT" -gt 0 ]]; then
        echo "⚠️ Warning conditions detected"
    else
        echo "✅ All systems healthy"
    fi
    
} >> "$LOG_FILE" 2>&1
EOF
    
    sudo mv /tmp/daily-health-check.sh /opt/quotebid/scripts/
    sudo chmod +x /opt/quotebid/scripts/daily-health-check.sh
    
    # Create crontab entries
    log_info "Installing cron jobs..."
    
    # Weekly calibration: Every Sunday at 2 AM
    (crontab -l 2>/dev/null; echo "0 2 * * 0 /usr/bin/node /opt/quotebid/scripts/weekly-calibration.js >> /var/log/quotebid/calibration.log 2>&1") | crontab -
    
    # Daily health check: Every day at 9 AM
    (crontab -l 2>/dev/null; echo "0 9 * * * /opt/quotebid/scripts/daily-health-check.sh") | crontab -
    
    # Hourly health check: Every hour during business hours
    (crontab -l 2>/dev/null; echo "0 8-18 * * 1-5 psql \$DATABASE_URL -c \"SELECT * FROM check_pricing_health() WHERE status != 'HEALTHY';\" >> /var/log/quotebid/hourly-health.log") | crontab -
    
    log_success "Cron jobs installed"
}

setup_cron_jobs

###############################################################################
# 4. API Health Endpoints
###############################################################################

log_info "Setting up API health endpoints..."

setup_health_endpoints() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would add health endpoints to the API"
        return 0
    fi
    
    # Check if health endpoint exists
    if curl -s "$API_URL/health" >/dev/null 2>&1; then
        log_success "Health endpoint already exists"
    else
        log_warning "Health endpoint not found - manual setup required"
        echo "Add the following endpoint to your API:"
        echo ""
        echo "GET /admin/health-metrics"
        echo "  Returns: pricing_health_metrics view data"
        echo ""
        echo "GET /admin/health-status"  
        echo "  Returns: check_pricing_health() function results"
    fi
}

# Only setup health endpoints if API_URL is configured
if [[ -n "$API_URL" ]]; then
    setup_health_endpoints
fi

###############################################################################
# 5. Log Rotation Setup
###############################################################################

log_info "Setting up log rotation..."

setup_log_rotation() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would setup log rotation for QuoteBid logs"
        return 0
    fi
    
    # Create logrotate configuration
    sudo tee /etc/logrotate.d/quotebid <<EOF
/var/log/quotebid/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        # Restart any services that need log file handles refreshed
        systemctl reload rsyslog 2>/dev/null || true
    endscript
}
EOF
    
    log_success "Log rotation configured"
}

setup_log_rotation

###############################################################################
# 6. Monitoring Verification
###############################################################################

log_info "Verifying monitoring setup..."

verify_setup() {
    local errors=0
    
    # Check Grafana dashboard
    if [[ "$DRY_RUN" != "true" ]]; then
        log_info "Checking Grafana dashboard accessibility..."
        if curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
           "$GRAFANA_URL/api/search?query=QuoteBid%20Pricing%20Engine%20v2" | jq -e '. | length > 0' >/dev/null; then
            log_success "Grafana dashboard accessible"
        else
            log_error "Grafana dashboard not found"
            ((errors++))
        fi
    fi
    
    # Check database health functions
    log_info "Testing database health functions..."
    if [[ "$DRY_RUN" != "true" ]]; then
        if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM check_pricing_health();" >/dev/null 2>&1; then
            log_success "Database health functions working"
        else
            log_error "Database health functions failed"
            ((errors++))
        fi
    fi
    
    # Check cron jobs
    log_info "Verifying cron jobs..."
    if crontab -l | grep -q "weekly-calibration.js"; then
        log_success "Weekly calibration cron job installed"
    else
        log_error "Weekly calibration cron job missing"
        ((errors++))
    fi
    
    if crontab -l | grep -q "daily-health-check.sh"; then
        log_success "Daily health check cron job installed"
    else
        log_error "Daily health check cron job missing"
        ((errors++))
    fi
    
    # Check log directories
    if [[ -d "/var/log/quotebid" ]]; then
        log_success "Log directory created"
    else
        log_error "Log directory missing"
        ((errors++))
    fi
    
    return $errors
}

if verify_setup; then
    log_success "All monitoring components verified successfully"
else
    log_error "Some verification checks failed - review output above"
    exit 1
fi

###############################################################################
# 7. Generate Summary Report
###############################################################################

log_info "Generating setup summary..."

cat <<EOF

================================================================================
🚀 STEP 8 MONITORING SETUP COMPLETE
================================================================================

📊 COMPONENTS INSTALLED:
   ✅ Grafana dashboard: QuoteBid Pricing Engine v2 - Post-Deploy Monitoring
   ✅ Alert rules: High drift rate, price delta out of range
   ✅ Database health views: pricing_health_metrics, check_pricing_health()
   ✅ Cron jobs: Weekly calibration (Sundays 2 AM), Daily health (9 AM)
   ✅ Log rotation: 30-day retention with compression
   ✅ Health monitoring scripts in /opt/quotebid/scripts/

📋 NEXT STEPS:
   1. 🔍 Access Grafana dashboard: $GRAFANA_URL
   2. 🔧 Configure Slack webhook for critical alerts (set SLACK_WEBHOOK env var)
   3. 📊 Test health endpoints: /admin/health-metrics, /admin/health-status
   4. 🧪 Run dry-run calibration: node scripts/weekly-calibration.js --dry-run
   5. 📧 Set up email notifications for daily health reports

🎯 24-HOUR MONITORING CHECKLIST:
   □ Monitor Grafana dashboard for KPI trends
   □ Check for alert notifications
   □ Review daily health check logs in /var/log/quotebid/
   □ Validate pricing behavior matches expectations
   □ Be prepared for weight tuning via Admin UI

🚨 EMERGENCY CONTACTS:
   • Grafana: $GRAFANA_URL
   • Health Logs: /var/log/quotebid/
   • Rollback: kubectl set image deployment/pricing-worker worker=...legacy
   • Documentation: ./STEP-8-POST-DEPLOY-MONITORING.md

================================================================================
EOF

if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    log_warning "This was a DRY-RUN. Re-run without --dry-run to apply changes."
fi

log_success "Step 8 monitoring setup completed successfully! 🎉" 