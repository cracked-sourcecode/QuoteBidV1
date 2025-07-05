/**
 * QuoteBid Pricing Worker
 * 
 * Runs every TICK_INTERVAL_MS to:
 * 1. Fetch live opportunities from database
 * 2. Build pricing snapshots with current metrics  
 * 3. Compute new prices using deterministic engine
 * 4. Apply gatekeeper rules for GPT decisions
 * 5. Update database and audit price changes
 */

// Ensure we don't accidentally start a WebSocket server
process.env.PRICING_WORKER = 'true';

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql, gt, and, gte } from "drizzle-orm";
import { 
  isAfter, 
  subMinutes,
  differenceInHours 
} from "date-fns";
import { 
  opportunities, 
  price_snapshots, 
  variable_registry, 
  pricing_config,
  pitches,
  savedOpportunities,
  emailClicks,
  events,
  type Opportunity
} from "../../shared/schema";
import { 
  computePrice, 
  type PricingSnapshot, 
  type PricingConfig 
} from "../../lib/pricing/pricingEngine";
import { canUpdate } from "../../lib/pricing/cooldown";
import { shouldSkipGPT } from "./gatekeeper";
import { queueForGPT } from "./gptPricingAgent";
// Import real WebSocket server functions instead of stubs
import { priceUpdates, systemEvents } from "../wsServer";
// Import database initialization for web push notifications
import { initializeDatabase } from "../../server/db";

// Load environment variables
config();

// Initialize database for web push notifications
try {
  initializeDatabase();
  console.log("✅ Database initialized for web push notifications");
} catch (error) {
  console.log("⚠️ Database initialization for web push notifications failed:", error);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonSql = neon(connectionString);
const db = drizzle(neonSql);

// Global state
let cachedWeights: Record<string, number> = {};
let cachedConfig: any = {};
let cachedConfigTime: Date = new Date(0);
let cachedWeightsTime: Date = new Date(0);
let lastReload: number = 0;
let isRunning = false;
let currentInterval: NodeJS.Timeout | null = null; // Track current interval
let currentTickInterval: number = 300000; // Track current tick interval

/**
 * Load variable weights from database once on startup
 */
async function loadWeights(): Promise<Record<string, number>> {
  console.log("📊 Loading variable weights from database...");
  
  const rows = await db.select().from(variable_registry);
  const weights = Object.fromEntries(
    rows.map(r => [r.var_name, Number(r.weight)])
  );
  
  // Update cached weights time
  if (rows.length > 0) {
    const latestUpdate = rows.reduce((latest, row) => {
      const rowTime = new Date(row.updated_at!);
      return rowTime > latest ? rowTime : latest;
    }, new Date(0));
    cachedWeightsTime = latestUpdate;
  }
  
  console.log("✅ Loaded weights:", weights);
  return weights;
}

/**
 * Load pricing configuration from database
 */
async function loadPricingConfig(): Promise<any> {
  console.log("⚙️ Loading pricing config from database...");
  
  const rows = await db.select().from(pricing_config);
  const config = Object.fromEntries(
    rows.map(r => [r.key, r.value])
  );
  
  // Update cached config time
  if (rows.length > 0) {
    const latestUpdate = rows.reduce((latest, row) => {
      const rowTime = new Date(row.updated_at!);
      return rowTime > latest ? rowTime : latest;
    }, new Date(0));
    cachedConfigTime = latestUpdate;
  }
  
  console.log("✅ Loaded config:", config);
  return config;
}

/**
 * Reload weights and config from database (hot-reload)
 */
async function reloadWeightsAndConfig(): Promise<boolean> {
  console.log("🔄 Hot-reloading pricing configuration from admin changes...");
  
  try {
    const oldWeights = { ...cachedWeights };
    const oldConfig = { ...cachedConfig };
    
    cachedWeights = await loadWeights();
    cachedConfig = await loadPricingConfig();
    
    let needsIntervalRestart = false;
    
    // Log what changed
    const weightChanges = Object.keys(cachedWeights).filter(
      key => oldWeights[key] !== cachedWeights[key]
    );
    if (weightChanges.length > 0) {
      console.log('⚖️  Variable weights updated:', weightChanges.map(
        key => `${key}: ${oldWeights[key]} → ${cachedWeights[key]}`
      ).join(', '));
    }
    
    if (oldConfig.priceStep !== cachedConfig.priceStep) {
      console.log(`💰 Price step updated: $${oldConfig.priceStep} → $${cachedConfig.priceStep}`);
    }
    
    if (oldConfig.tickIntervalMs !== cachedConfig.tickIntervalMs) {
      const newInterval = cachedConfig.tickIntervalMs || 300000;
      console.log(`⏰ Tick interval updated: ${oldConfig.tickIntervalMs}ms → ${newInterval}ms`);
      if (newInterval !== currentTickInterval) {
        needsIntervalRestart = true;
        currentTickInterval = newInterval;
      }
    }
    
    if (oldConfig['ambient.cooldownMins'] !== cachedConfig['ambient.cooldownMins']) {
      const oldCooldown = Number(oldConfig['ambient.cooldownMins']) || 5;
      const newCooldown = Number(cachedConfig['ambient.cooldownMins']) || 5;
      console.log(`⏳ Pricing cooldown updated: ${oldCooldown} min → ${newCooldown} min`);
    }
    
    console.log("✅ Pricing engine successfully synced with admin configuration");
    return needsIntervalRestart;
  } catch (error) {
    console.error("❌ Hot-reload failed:", error);
    throw error;
  }
}

/**
 * Build pricing configuration object
 */
function buildPricingConfig(weights: Record<string, number>, config: any): PricingConfig {
  const pricingConfig = {
    weights: {
      pitches: weights.pitches || 1.0,
      clicks: weights.clicks || 0.3,
      saves: weights.saves || 0.2,
      drafts: weights.drafts || 0.1,
      emailClickBoost: Number(config.emailClickBoost) || 0.05,
      outlet_avg_price: weights.outlet_avg_price || -1.0,
      successRateOutlet: weights.successRateOutlet || -0.5,
      hoursRemaining: weights.hoursRemaining || -0.6,
      baselineDecay: weights.baselineDecay || 0.05, // Default 5% constant downward pressure
    },
    priceStep: Number(config.priceStep) || 5,
    elasticity: 1.0, // Default for now, can be made configurable
    floor: 50, // Minimum safety floor (aligned with tests and MD spec)
    ceil: 500, // Maximum safety ceiling (aligned with tests and MD spec)  
  };
  
  return pricingConfig;
}

/**
 * Fetch live opportunities with metrics
 */
async function fetchLiveOpportunities(): Promise<Array<Opportunity & {
  pitchCount: number;
  clickCount: number; 
  saveCount: number;
  draftCount: number;
}>> {
  // Get current time and create end-of-today threshold
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999); // End of today
  
  const liveOpps = await db
    .select()
    .from(opportunities)
    .where(
      and(
        eq(opportunities.status, "open"),
        // Use end-of-day comparison: opportunity is live if deadline is today or later
        // We need to check if the opportunity deadline (stored as beginning of day) 
        // should still be considered active (until end of that day)
        sql`DATE(${opportunities.deadline}) >= DATE(${now})`
      )
    );
  
  console.log(`🔍 Found ${liveOpps.length} potentially active opportunities`);
  
  // Filter opportunities that are actually still active (haven't passed end of deadline day)
  const activeOpps = liveOpps.filter(opp => {
    if (!opp.deadline) return false;
    
    const deadlineDate = new Date(opp.deadline);
    deadlineDate.setHours(23, 59, 59, 999); // Set to end of deadline day
    
    const isActive = now <= deadlineDate;
    
    if (!isActive) {
      console.log(`⏰ OPP ${opp.id} excluded - deadline ${deadlineDate.toISOString()} has passed`);
    }
    
    return isActive;
  });
  
  console.log(`✅ ${activeOpps.length} opportunities are actually active after end-of-day filtering`);
  
  // Get metrics for each opportunity
  const oppsWithMetrics = await Promise.all(
    activeOpps.map(async (opp) => {
      const now = new Date();
      
      // Count submitted pitches for this opportunity (excludes drafts)
      const pitchCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pitches)
        .where(and(
          eq(pitches.opportunityId, opp.id),
          eq(pitches.isDraft, false)
        ));
      
      const pitchCount = Number(pitchCountResult[0]?.count || 0);
      
      // Count drafts for this opportunity (separate from submitted pitches)
      const draftCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pitches)
        .where(and(
          eq(pitches.opportunityId, opp.id),
          eq(pitches.isDraft, true)
        ));
      
      const draftCount = Number(draftCountResult[0]?.count || 0);
      
      // Count saves for this opportunity
      const saveCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(savedOpportunities)
        .where(eq(savedOpportunities.opportunityId, opp.id));
      
      const saveCount = Number(saveCountResult[0]?.count || 0);
      
      // NEW: recent clicks from events table
      const clickCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(and(
          eq(events.opportunityId, opp.id),
          sql`${events.type} IN ('opp_click', 'email_click')`,
          gte(events.createdAt, subMinutes(now, 60)) // last 60 min
        ));
      const clickCount = Number(clickCountResult[0]?.count || 0);
      
      return {
        ...opp,
        pitchCount,
        clickCount,        // ✅ Now using real click data!
        saveCount,         // ✅ Now tracking actual saves!
        draftCount,        // ✅ Now tracking actual drafts!
      };
    })
  );
  
  return oppsWithMetrics;
}

/**
 * Count email clicks in the last hour for pricing emails only
 */
async function emailClicksLastHour(oppId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(emailClicks)
    .where(
      and(
        eq(emailClicks.opportunityId, oppId),
        gte(emailClicks.clickedAt, subMinutes(new Date(), 60))
      )
    );
  
  return Number(result[0]?.count || 0);
}

/**
 * Build pricing snapshot for an opportunity
 */
async function buildPricingSnapshot(
  opp: Opportunity & {
    pitchCount: number;
    clickCount: number;
    saveCount: number; 
    draftCount: number;
  }
): Promise<PricingSnapshot> {
  const now = new Date();
  const deadline = new Date(opp.deadline!);
  const hoursRemaining = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
  
  // Get email clicks in the last hour
  const emailClicks1h = await emailClicksLastHour(opp.id);
  
  return {
    opportunityId: opp.id.toString(),
    tier: opp.tier === "Tier 1" ? 1 : opp.tier === "Tier 2" ? 2 : 3,
    current_price: Number(opp.current_price) || (opp.tier === "Tier 1" ? 250 : opp.tier === "Tier 2" ? 175 : 125),
    pitches: opp.pitchCount,
    clicks: opp.clickCount,
    saves: opp.saveCount,
    drafts: opp.draftCount,
    emailClicks1h,
    hoursRemaining,
    outlet_avg_price: undefined, // TODO: Add outlet metrics
    successRateOutlet: undefined, // TODO: Add outlet metrics
    inventory_level: Number(opp.inventory_level) || 0,
    category: opp.category || undefined,
  };
}

/**
 * Update opportunity price in database
 */
async function updateOpportunityPrice(
  opportunityId: number,
  newPrice: number,
  snapshot: PricingSnapshot,
  source: "worker" | "gpt" = "worker"
): Promise<void> {
  const oldPrice = snapshot.current_price;
  const trend = Math.sign(newPrice - oldPrice);
  
  // Update the opportunity's current price and variable snapshot
  await db
    .update(opportunities)
    .set({
      current_price: newPrice.toString(),
      variable_snapshot: snapshot as any,
      last_price_update: new Date(),
    })
    .where(eq(opportunities.id, opportunityId));
  
  // Insert price snapshot for audit trail
  await db
    .insert(price_snapshots)
    .values({
      opportunity_id: opportunityId,
      suggested_price: newPrice.toString(),
      snapshot_payload: snapshot as any,
    });
  
  // Emit real-time price update
  try {
    priceUpdates.priceChanged({
      id: opportunityId,
      oldPrice,
      newPrice,
      trend,
      timestamp: new Date().toISOString(),
      source
    });
  } catch (wsError) {
    console.warn("⚠️ WebSocket emission failed:", wsError);
    // Don't fail the price update if WebSocket fails
  }
}

/**
 * Close expired opportunities and record their final prices
 */
async function closeExpiredOpportunities(): Promise<void> {
  try {
    console.log("🕐 Checking for expired opportunities to close...");
    
    // Get all opportunities that are still 'open' but past their deadline
    const expiredOpps = await db
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.status, 'open'),
          sql`${opportunities.deadline} < NOW()`
        )
      );
    
    if (expiredOpps.length === 0) {
      console.log("✅ No expired opportunities found");
      return;
    }
    
    console.log(`🔄 Found ${expiredOpps.length} expired opportunities to close`);
    
    for (const opp of expiredOpps) {
      try {
        // Get the current market price for this opportunity
        const currentPrice = opp.current_price || opp.minimumBid || 225;
        const closedAt = new Date();
        
        console.log(`⏰ Auto-closing expired opportunity ${opp.id}: "${opp.title}" at final price $${currentPrice}`);
        
        // Update the opportunity status and record final price
        await db
          .update(opportunities)
          .set({
            status: 'closed',
            closedAt,
            lastPrice: String(currentPrice)
          })
          .where(eq(opportunities.id, opp.id));
          
        console.log(`✅ Successfully auto-closed opportunity ${opp.id} with final price $${currentPrice}`);
        
      } catch (error) {
        console.error(`❌ Failed to auto-close opportunity ${opp.id}:`, error);
      }
    }
    
    console.log(`🎉 Completed auto-closure of ${expiredOpps.length} expired opportunities`);
    
  } catch (error) {
    console.error("❌ Error in closeExpiredOpportunities:", error);
  }
}

/**
 * Process a single pricing tick
 */
async function processPricingTick(): Promise<void> {
  console.log("\n🔄 Starting pricing tick...");
  
  try {
    // CRITICAL: First check for and close any expired opportunities
    await closeExpiredOpportunities();
    
    const liveOpps = await fetchLiveOpportunities();
    const pricingConfig = buildPricingConfig(cachedWeights, cachedConfig);
    
    // Get cooldown setting from database config (default to 5 minutes if not set)
    const cooldownMinutes = Number(cachedConfig['ambient.cooldownMins']) || 5;
    
    let updatedCount = 0;
    let skippedCount = 0;
    const gptBatch: PricingSnapshot[] = [];
    
    for (const opp of liveOpps) {
      // CRITICAL: Skip any opportunity that is not "open" - this prevents pricing updates on closed opportunities
      if (opp.status !== "open") {
        console.log(`⏭️  Skipping OPP ${opp.id} - Status: "${opp.status}" (not open)`);
        continue;
      }
      
      if (!canUpdate(opp.last_price_update, cooldownMinutes)) {
        console.log(`⏳  OPP ${opp.id} skipped – in cool-down (${cooldownMinutes} min)`);
        continue;
      }
      
      const snapshot = await buildPricingSnapshot(opp);
      const newPrice = computePrice(snapshot, pricingConfig);
      const currentPrice = snapshot.current_price;
      const priceDelta = newPrice - currentPrice;
      
      if (newPrice !== currentPrice) {
        // Check gatekeeper rule
        if (shouldSkipGPT(priceDelta, snapshot.hoursRemaining, pricingConfig.priceStep)) {
          // Apply price change directly
          await updateOpportunityPrice(opp.id, newPrice, snapshot, "worker");
          updatedCount++;
          
          // Calculate band for logging
          const anchor = snapshot.outlet_avg_price ?? (snapshot.tier === 1 ? 250 : snapshot.tier === 2 ? 175 : 125);
          const bandFloor = Math.max(pricingConfig.floor, 0.6 * anchor);
          const bandCeil = Math.min(pricingConfig.ceil, 2.0 * anchor);
          
          const direction = priceDelta > 0 ? "▲" : "▼";
          console.log(`💰 OPP ${opp.id} → $${newPrice} (${direction}$${Math.abs(priceDelta)}) (band ${bandFloor}-${bandCeil}) [direct]`);
        } else {
          // Queue for GPT decision
          gptBatch.push({
            ...snapshot,
            current_price: newPrice, // Include the suggested new price
          });
          skippedCount++;
          console.log(`🤖 OPP ${opp.id} → $${newPrice} (queued for GPT)`);
        }
      }
    }
    
    // Send batch to GPT if we have any
    if (gptBatch.length > 0) {
      await queueForGPT(gptBatch, pricingConfig.priceStep);
    }
    
    console.log(`✅ Tick complete: ${updatedCount} updated, ${skippedCount} queued for GPT, ${liveOpps.length - updatedCount - skippedCount} unchanged`);
    
  } catch (error) {
    console.error("❌ Error in pricing tick:", error);
    throw error; // Re-throw to trigger worker restart
  }
}

/**
 * Initialize the worker
 */
async function initializeWorker(): Promise<void> {
  console.log("🚀 Initializing QuoteBid Pricing Worker...");
  
  // Load cached data
  cachedWeights = await loadWeights();
  cachedConfig = await loadPricingConfig();
  currentTickInterval = cachedConfig.tickIntervalMs || 300000; // Set initial tick interval
  
  console.log("✅ Worker initialized successfully");
}

/**
 * Start the pricing tick loop with current interval
 */
function startTickLoop(): void {
  // Clear any existing interval
  if (currentInterval) {
    clearInterval(currentInterval);
  }
  
  console.log(`⏰ Starting worker loop with ${currentTickInterval}ms intervals`);
  
  // Start the main loop
  currentInterval = setInterval(async () => {
    try {
      // Hot-reload check every 30 seconds for admin responsiveness
      if (Date.now() - lastReload > 30_000) { // 30 sec
        // Check both config and variable registry for updates
        const [latestConfigResult, latestWeightsResult] = await Promise.all([
          db.select({ ts: sql<Date>`MAX(updated_at)` }).from(pricing_config),
          db.select({ ts: sql<Date>`MAX(updated_at)` }).from(variable_registry)
        ]);
        
        const latestConfig = latestConfigResult[0]?.ts;
        const latestWeights = latestWeightsResult[0]?.ts;
        
        const configNeedsReload = latestConfig && new Date(latestConfig) > cachedConfigTime;
        const weightsNeedReload = latestWeights && new Date(latestWeights) > cachedWeightsTime;
        
        if (configNeedsReload || weightsNeedReload) {
          console.log(`🔄 Admin changes detected - reloading pricing configuration...`);
          const needsIntervalRestart = await reloadWeightsAndConfig();
          lastReload = Date.now();
          console.log(`✅ Pricing engine synced with admin changes`);
          if (needsIntervalRestart) {
            console.log(`⏰ Tick interval changed - restarting worker loop...`);
            startTickLoop(); // Restart the loop with new interval
            return; // Exit current iteration
          }
        } else {
          lastReload = Date.now(); // Update check time even if no reload needed
        }
      }
      
      await processPricingTick();
    } catch (error) {
      console.error("💥 Fatal error in pricing tick:", error);
      if (currentInterval) {
        clearInterval(currentInterval);
      }
      process.exit(1); // Exit so PM2/supervisor can restart
    }
  }, currentTickInterval);
}

/**
 * Main worker loop
 */
async function startWorker(): Promise<void> {
  if (isRunning) {
    console.log("⚠️ Worker already running");
    return;
  }
  
  isRunning = true;
  
  try {
    await initializeWorker();
    
    // Check for --once flag for single-run testing
    const isOnceMode = process.argv.includes("--once");
    
    if (isOnceMode) {
      console.log("🔧 Running in --once mode");
      await processPricingTick();
      console.log("✅ Single tick completed, exiting");
      process.exit(0);
    }
    
    // Start the tick loop
    startTickLoop();
    
    console.log("🔄 Worker loop started successfully");
    
    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("🛑 Received SIGINT, shutting down gracefully...");
      if (currentInterval) {
        clearInterval(currentInterval);
      }
      isRunning = false;
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully...");
      if (currentInterval) {
        clearInterval(currentInterval);
      }
      isRunning = false;
      process.exit(0);
    });
    
  } catch (error) {
    console.error("💥 Failed to start worker:", error);
    isRunning = false;
    process.exit(1);
  }
}

// Start the worker if this file is run directly
const currentModuleUrl = import.meta.url;
const mainModuleUrl = `file://${process.argv[1]}`;

// Handle URL encoding differences
const isMainModule = currentModuleUrl === mainModuleUrl || 
                    currentModuleUrl === encodeURI(mainModuleUrl) ||
                    decodeURI(currentModuleUrl) === mainModuleUrl;

if (isMainModule) {
  console.log("✅ Running as main module, starting worker...");
  startWorker().catch((error) => {
    console.error(" Unhandled error:", error);
    process.exit(1);
  });
}

export { startWorker, processPricingTick }; 