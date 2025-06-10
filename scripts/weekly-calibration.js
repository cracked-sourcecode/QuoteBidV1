#!/usr/bin/env node

/**
 * QuoteBid Pricing Engine v2 - Weekly Outlet Calibration
 * 
 * This script runs weekly to recalibrate outlet average prices based on
 * actual winning bid data from the last 30 days. Helps keep price floors
 * and ceilings realistic as market conditions change.
 * 
 * Schedule: Run every Sunday at 2 AM
 * Crontab: 0 2 * * 0 /path/to/node /path/to/weekly-calibration.js
 * 
 * Step 8-C: Weekly Calibration Task
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { opportunities, pitches, configTable } from '../server/db/schema.js';
import { sql, eq, and, gte, inArray } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = neon(DATABASE_URL);
const db = drizzle(client);

// Configuration constants
const MINIMUM_SAMPLE_SIZE = 3; // Minimum winning bids to recalibrate
const DAYS_LOOKBACK = 30;
const DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * Get winning bid data for outlet calibration
 */
async function getWinningBidData() {
  console.log('📊 Fetching 30-day winning bid data...');
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DAYS_LOOKBACK);
  
  const query = sql`
    WITH recent_wins AS (
      SELECT 
        o.outlet,
        o.price as winning_price,
        o.created_at,
        COUNT(*) OVER (PARTITION BY o.outlet) as outlet_win_count
      FROM ${opportunities} o
      WHERE o.created_at >= ${thirtyDaysAgo}
        AND EXISTS (
          SELECT 1 FROM ${pitches} p 
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
      MAX(winning_price) as max_price,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY winning_price) as q25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY winning_price) as q75
    FROM recent_wins
    WHERE outlet_win_count >= ${MINIMUM_SAMPLE_SIZE}
    GROUP BY outlet
    ORDER BY outlet
  `;
  
  const results = await db.execute(query);
  console.log(`✅ Found ${results.length} outlets with sufficient winning bid data`);
  
  return results;
}

/**
 * Calculate recommended price parameters for an outlet
 */
function calculatePriceParameters(data) {
  const {
    avg_winning_price,
    price_stddev,
    min_price,
    max_price,
    q25,
    q75,
    wins_count
  } = data;
  
  // Conservative floor: 75% of Q1 or min, whichever is higher
  const recommendedFloor = Math.max(
    Math.round(q25 * 0.75),
    Math.round(min_price * 0.9),
    10 // Absolute minimum
  );
  
  // Conservative ceiling: 125% of Q3 or max, whichever is lower
  const recommendedCeiling = Math.min(
    Math.round(q75 * 1.25),
    Math.round(max_price * 1.1),
    10000 // Absolute maximum
  );
  
  // Confidence score based on sample size and variance
  const sampleConfidence = Math.min(wins_count / 10, 1); // More confident with more samples
  const varianceConfidence = price_stddev ? Math.max(0, 1 - (price_stddev / avg_winning_price)) : 0.5;
  const confidenceScore = (sampleConfidence + varianceConfidence) / 2;
  
  return {
    currentAvg: Math.round(avg_winning_price),
    recommendedFloor,
    recommendedCeiling,
    confidenceScore,
    sampleSize: wins_count,
    priceRange: max_price - min_price,
    volatility: price_stddev / avg_winning_price || 0
  };
}

/**
 * Update outlet configuration in database
 */
async function updateOutletConfig(outlet, params) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would update ${outlet}:`, params);
    return;
  }
  
  try {
    // Update outlet-specific config keys
    await db.insert(configTable)
      .values([
        {
          key: `outlet.${outlet}.avgPrice`,
          value: params.currentAvg.toString(),
          updated_at: new Date()
        },
        {
          key: `outlet.${outlet}.recommendedFloor`,
          value: params.recommendedFloor.toString(),
          updated_at: new Date()
        },
        {
          key: `outlet.${outlet}.recommendedCeiling`,
          value: params.recommendedCeiling.toString(),
          updated_at: new Date()
        },
        {
          key: `outlet.${outlet}.confidenceScore`,
          value: params.confidenceScore.toFixed(3),
          updated_at: new Date()
        },
        {
          key: `outlet.${outlet}.lastCalibration`,
          value: new Date().toISOString(),
          updated_at: new Date()
        }
      ])
      .onConflictDoUpdate({
        target: configTable.key,
        set: {
          value: sql`EXCLUDED.value`,
          updated_at: sql`EXCLUDED.updated_at`
        }
      });
      
    console.log(`✅ Updated calibration for ${outlet}`);
  } catch (error) {
    console.error(`❌ Failed to update ${outlet}:`, error.message);
  }
}

/**
 * Generate calibration report
 */
function generateReport(calibrations) {
  console.log('\n' + '='.repeat(80));
  console.log('📈 WEEKLY OUTLET CALIBRATION REPORT');
  console.log('='.repeat(80));
  console.log(`📅 Date: ${new Date().toLocaleDateString()}`);
  console.log(`🔄 Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log(`📊 Outlets Processed: ${calibrations.length}`);
  console.log(`📊 Sample Period: Last ${DAYS_LOOKBACK} days`);
  console.log(`📊 Minimum Sample Size: ${MINIMUM_SAMPLE_SIZE} winning bids`);
  console.log('');
  
  // Summary statistics
  const avgConfidence = calibrations.reduce((sum, c) => sum + c.params.confidenceScore, 0) / calibrations.length;
  const highConfidenceCount = calibrations.filter(c => c.params.confidenceScore > 0.7).length;
  const lowSampleCount = calibrations.filter(c => c.params.sampleSize < 5).length;
  
  console.log('📊 SUMMARY STATISTICS:');
  console.log(`   Average Confidence Score: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`   High Confidence Outlets (>70%): ${highConfidenceCount}`);
  console.log(`   Low Sample Outlets (<5 wins): ${lowSampleCount}`);
  console.log('');
  
  // Detailed outlet breakdown
  console.log('📋 OUTLET CALIBRATION DETAILS:');
  console.log('─'.repeat(120));
  console.log('Outlet'.padEnd(25) + 
              'Avg Price'.padEnd(12) + 
              'Floor'.padEnd(8) + 
              'Ceiling'.padEnd(10) + 
              'Samples'.padEnd(10) + 
              'Confidence'.padEnd(12) + 
              'Volatility'.padEnd(12) + 
              'Status');
  console.log('─'.repeat(120));
  
  calibrations.forEach(({ outlet, data, params }) => {
    const status = params.confidenceScore > 0.7 ? '✅ High' : 
                   params.confidenceScore > 0.4 ? '⚠️  Med' : '❌ Low';
    
    console.log(
      outlet.padEnd(25) +
      `$${params.currentAvg}`.padEnd(12) +
      `$${params.recommendedFloor}`.padEnd(8) +
      `$${params.recommendedCeiling}`.padEnd(10) +
      params.sampleSize.toString().padEnd(10) +
      `${(params.confidenceScore * 100).toFixed(1)}%`.padEnd(12) +
      `${(params.volatility * 100).toFixed(1)}%`.padEnd(12) +
      status
    );
  });
  
  console.log('─'.repeat(120));
  console.log('');
  
  // Recommendations
  console.log('💡 RECOMMENDATIONS:');
  if (lowSampleCount > 0) {
    console.log(`   • ${lowSampleCount} outlets have low sample sizes - monitor for 2-3 more weeks`);
  }
  if (calibrations.some(c => c.params.volatility > 0.5)) {
    console.log('   • High volatility detected - consider market conditions or data quality');
  }
  if (avgConfidence < 0.6) {
    console.log('   • Overall confidence below 60% - consider increasing sample period');
  }
  console.log('   • Review Grafana pricing dashboards for impact validation');
  console.log('   • Monitor next 24-48h for any pricing anomalies');
  console.log('');
  
  // Health check SQL for manual verification
  console.log('🔍 VALIDATION QUERY (run manually to verify):');
  console.log('```sql');
  console.log(`SELECT 
    key, 
    value, 
    updated_at 
  FROM config 
  WHERE key LIKE 'outlet.%.avgPrice' 
    AND updated_at >= NOW() - INTERVAL '1 hour'
  ORDER BY key;`);
  console.log('```');
  console.log('');
}

/**
 * Main calibration process
 */
async function runCalibration() {
  console.log('🚀 Starting QuoteBid Weekly Outlet Calibration...');
  console.log(`   Mode: ${DRY_RUN ? '🧪 DRY RUN' : '🔴 LIVE UPDATE'}`);
  console.log(`   Date: ${new Date().toISOString()}`);
  console.log('');
  
  try {
    // Get winning bid data
    const winningBids = await getWinningBidData();
    
    if (winningBids.length === 0) {
      console.log('⚠️  No outlets have sufficient winning bid data for calibration');
      console.log('   This may indicate:');
      console.log('   • Low platform activity in past 30 days');
      console.log('   • Pitch acceptance tracking issues');
      console.log('   • Need to lower minimum sample size threshold');
      return;
    }
    
    // Process each outlet
    const calibrations = [];
    
    for (const data of winningBids) {
      const outlet = data.outlet;
      const params = calculatePriceParameters(data);
      
      calibrations.push({
        outlet,
        data,
        params
      });
      
      // Update configuration
      await updateOutletConfig(outlet, params);
    }
    
    // Generate report
    generateReport(calibrations);
    
    // Update last calibration timestamp
    if (!DRY_RUN) {
      await db.insert(configTable)
        .values({
          key: 'system.lastOutletCalibration',
          value: new Date().toISOString(),
          updated_at: new Date()
        })
        .onConflictDoUpdate({
          target: configTable.key,
          set: {
            value: sql`EXCLUDED.value`,
            updated_at: sql`EXCLUDED.updated_at`
          }
        });
    }
    
    console.log('✅ Weekly outlet calibration completed successfully');
    console.log('📊 Next steps:');
    console.log('   1. Review pricing engine logs for any errors');
    console.log('   2. Check Grafana dashboards for impact on KPIs');
    console.log('   3. Monitor first 24h for pricing anomalies');
    console.log('   4. Adjust weights if needed via Admin UI');
    
  } catch (error) {
    console.error('❌ Calibration failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--dry-run')) {
  process.env.DRY_RUN = 'true';
}

if (process.argv.includes('--help')) {
  console.log(`
QuoteBid Pricing Engine v2 - Weekly Outlet Calibration

USAGE:
  node weekly-calibration.js [OPTIONS]

OPTIONS:
  --dry-run    Preview changes without updating database
  --help       Show this help message

ENVIRONMENT:
  DATABASE_URL       Required: PostgreSQL connection string
  DRY_RUN=true      Optional: Enable dry-run mode

SCHEDULE:
  Recommended: Every Sunday at 2 AM
  Crontab: 0 2 * * 0 /path/to/node /path/to/weekly-calibration.js

MONITORING:
  • Check logs for successful completion
  • Verify Grafana pricing dashboards
  • Monitor 24h KPIs for anomalies
  • Review Admin UI health status
  `);
  process.exit(0);
}

// Run the calibration
runCalibration().catch(console.error); 