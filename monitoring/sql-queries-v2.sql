-- =====================================
-- QuoteBid Pricing Engine v2 Monitoring Queries
-- Post-Deploy 24-Hour Monitoring
-- =====================================

-- 8-A: Key Dashboard Metrics
-- =====================================

-- 1. Drift Count per Hour (Target: ≤6/hr)
-- Monitors how often the engine applies price drift adjustments
SELECT 
    DATE_TRUNC('hour', "lastDriftAt"::timestamp) as hour,
    COUNT(*) as drift_applications,
    COUNT(*) * 1.0 / 1 as drift_per_hour -- Already hourly
FROM opportunities 
WHERE "lastDriftAt" IS NOT NULL 
    AND "lastDriftAt"::timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', "lastDriftAt"::timestamp)
ORDER BY hour DESC;

-- 2. Average Price Delta per Tick (Target: $1-$15)
-- Tracks the average price change magnitude
WITH price_changes AS (
    SELECT 
        opportunity_id,
        LAG(price) OVER (PARTITION BY opportunity_id ORDER BY created_at) as prev_price,
        price,
        created_at
    FROM price_history 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    AVG(ABS(price - prev_price)) as avg_price_delta,
    MIN(ABS(price - prev_price)) as min_delta,
    MAX(ABS(price - prev_price)) as max_delta,
    COUNT(*) as price_changes
FROM price_changes 
WHERE prev_price IS NOT NULL
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- 3. Pitch-to-Click Conversion Rate (Target: ≥10%)
-- Measures engagement quality to detect vanity activity
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    SUM(pitches) as total_pitches,
    SUM(clicks) as total_clicks,
    CASE 
        WHEN SUM(pitches) > 0 THEN (SUM(clicks) * 100.0 / SUM(pitches))
        ELSE 0 
    END as conversion_rate_percent
FROM opportunity_metrics 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- 4. Time-to-Floor on Dead Opportunities (Target: <24h)
-- Tracks how quickly dead opportunities decay to minimum price
WITH dead_opps AS (
    SELECT 
        o.id,
        o.title,
        o.created_at as opp_created,
        MIN(ph.created_at) as first_floor_hit,
        EXTRACT(EPOCH FROM (MIN(ph.created_at) - o.created_at))/3600 as hours_to_floor
    FROM opportunities o
    JOIN price_history ph ON o.id = ph.opportunity_id 
    WHERE o.created_at >= NOW() - INTERVAL '7 days'
        AND ph.price <= 15 -- Floor threshold
        AND o.pitches = 0 -- Dead opportunities (no pitches)
    GROUP BY o.id, o.title, o.created_at
    HAVING MIN(ph.created_at) IS NOT NULL
)
SELECT 
    DATE_TRUNC('day', opp_created) as day,
    COUNT(*) as dead_opportunities,
    AVG(hours_to_floor) as avg_hours_to_floor,
    MAX(hours_to_floor) as max_hours_to_floor,
    COUNT(CASE WHEN hours_to_floor > 24 THEN 1 END) as over_24h_count
FROM dead_opps
GROUP BY DATE_TRUNC('day', opp_created)
ORDER BY day DESC;

-- 5. Elastic Ceiling Hits (Target: <2% of opportunities)
-- Monitors opportunities hitting the price ceiling
WITH ceiling_analysis AS (
    SELECT 
        o.id,
        o.title,
        o.price,
        CASE WHEN o.meta->>'ceilingClamped' = 'true' THEN 1 ELSE 0 END as hit_ceiling,
        DATE_TRUNC('hour', o.updated_at) as hour
    FROM opportunities o
    WHERE o.updated_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
    hour,
    COUNT(*) as total_opportunities,
    SUM(hit_ceiling) as ceiling_hits,
    (SUM(hit_ceiling) * 100.0 / COUNT(*)) as ceiling_hit_percentage
FROM ceiling_analysis
GROUP BY hour
ORDER BY hour DESC;

-- =====================================
-- 8-B: Weight Tuning Analysis Queries
-- =====================================

-- Opportunities with High Pitch Velocity (for pitchVelocityBoost tuning)
SELECT 
    o.id,
    o.title,
    o.pitches,
    o.price,
    o.meta->>'pitchVelocity' as pitch_velocity,
    o.meta->>'driftApplied' as drift_applied,
    EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600 as hours_since_created
FROM opportunities o
WHERE o.created_at >= NOW() - INTERVAL '24 hours'
    AND o.pitches > 5 -- High activity
    AND CAST(o.meta->>'pitchVelocity' AS FLOAT) > 2.0 -- High velocity
ORDER BY CAST(o.meta->>'pitchVelocity' AS FLOAT) DESC;

-- Vanity Click Detection (for conversionPenalty tuning)
SELECT 
    o.id,
    o.title,
    o.clicks,
    o.saves,
    CASE 
        WHEN o.clicks > 0 THEN (o.saves * 100.0 / o.clicks)
        ELSE 0 
    END as save_rate_percent,
    o.price,
    o.meta->>'conversionScore' as conversion_score
FROM opportunities o
WHERE o.created_at >= NOW() - INTERVAL '24 hours'
    AND o.clicks > 3 -- Significant click activity
    AND (o.saves * 100.0 / NULLIF(o.clicks, 0)) < 10 -- Low save rate
ORDER BY save_rate_percent ASC;

-- Outlet Load Analysis (for outletLoadPenalty tuning)
SELECT 
    o.outlet,
    COUNT(*) as active_opportunities,
    AVG(o.price) as avg_price,
    SUM(o.pitches) as total_pitches,
    AVG(CAST(o.meta->>'outletLoadScore' AS FLOAT)) as avg_outlet_load_score
FROM opportunities o
WHERE o.created_at >= NOW() - INTERVAL '24 hours'
    AND o.deadline > NOW() -- Still active
GROUP BY o.outlet
HAVING COUNT(*) > 3 -- Outlets with multiple opportunities
ORDER BY active_opportunities DESC;

-- =====================================
-- 8-C: Weekly Calibration Data
-- =====================================

-- Outlet Average Price Recalibration (30-day rolling)
-- This query prepares data for the weekly calibration cron job
WITH recent_wins AS (
    SELECT 
        o.outlet,
        o.price as winning_price,
        o.created_at
    FROM opportunities o
    WHERE o.created_at >= NOW() - INTERVAL '30 days'
        AND EXISTS (
            SELECT 1 FROM pitches p 
            WHERE p.opportunity_id = o.id 
            AND p.status = 'accepted'
        )
)
SELECT 
    outlet,
    COUNT(*) as wins_count,
    AVG(winning_price) as avg_winning_price,
    STDDEV(winning_price) as price_stddev,
    MIN(winning_price) as min_price,
    MAX(winning_price) as max_price
FROM recent_wins
GROUP BY outlet
HAVING COUNT(*) >= 3 -- Minimum sample size
ORDER BY outlet;

-- =====================================
-- 8-D: Exit Criteria Health Check
-- =====================================

-- Comprehensive 24-hour health summary for canary → prod decision
WITH metrics_24h AS (
    -- Drift rate
    SELECT 
        'drift_rate' as metric,
        COUNT(*) as hourly_count,
        CASE WHEN COUNT(*) <= 6 THEN 'HEALTHY' ELSE 'ALERT' END as status
    FROM opportunities 
    WHERE "lastDriftAt"::timestamp >= NOW() - INTERVAL '1 hour'
    
    UNION ALL
    
    -- Price delta
    SELECT 
        'price_delta' as metric,
        AVG(ABS(price - LAG(price) OVER (ORDER BY updated_at))) as value,
        CASE 
            WHEN AVG(ABS(price - LAG(price) OVER (ORDER BY updated_at))) BETWEEN 1 AND 15 
            THEN 'HEALTHY' 
            ELSE 'ALERT' 
        END as status
    FROM opportunities 
    WHERE updated_at >= NOW() - INTERVAL '24 hours'
    
    UNION ALL
    
    -- Conversion rate
    SELECT 
        'conversion_rate' as metric,
        (SUM(clicks) * 100.0 / NULLIF(SUM(pitches), 0)) as value,
        CASE 
            WHEN (SUM(clicks) * 100.0 / NULLIF(SUM(pitches), 0)) >= 10 
            THEN 'HEALTHY' 
            ELSE 'ALERT' 
        END as status
    FROM opportunities 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
    metric,
    ROUND(hourly_count::numeric, 2) as value,
    status,
    CASE 
        WHEN status = 'HEALTHY' THEN '✅'
        ELSE '🚨'
    END as indicator
FROM metrics_24h;

-- Error Rate Analysis
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_events,
    COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as error_count,
    (COUNT(CASE WHEN level = 'ERROR' THEN 1 END) * 100.0 / COUNT(*)) as error_rate_percent
FROM system_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND component = 'pricing-worker'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC; 