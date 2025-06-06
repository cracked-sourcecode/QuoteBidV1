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

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql, gt, and } from "drizzle-orm";
import { 
  opportunities, 
  price_snapshots, 
  variable_registry, 
  pricing_config,
  pitches,
  savedOpportunities,
  type Opportunity
} from "../../shared/schema";
import { 
  computePrice, 
  type PricingSnapshot, 
  type PricingConfig 
} from "../../lib/pricing/pricingEngine";
import { shouldSkipGPT } from "./gatekeeper";
import { queueForGPT } from "./gptPricingAgent";
import { priceUpdates, systemEvents } from "../wsServer";

// Load environment variables
config();

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
let lastReload: number = 0;
let isRunning = false;

/**
 * Load variable weights from database once on startup
 */
async function loadWeights(): Promise<Record<string, number>> {
  console.log("📊 Loading variable weights from database...");
  
  const rows = await db.select().from(variable_registry);
  const weights = Object.fromEntries(
    rows.map(r => [r.var_name, Number(r.weight)])
  );
  
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
async function reloadWeightsAndConfig(): Promise<void> {
  console.log("🔄 Hot-reloading pricing configuration...");
  
  try {
    cachedWeights = await loadWeights();
    cachedConfig = await loadPricingConfig();
    console.log("✅ Hot-reload completed successfully");
  } catch (error) {
    console.error("❌ Hot-reload failed:", error);
    throw error;
  }
}

/**
 * Build pricing configuration object
 */
function buildPricingConfig(weights: Record<string, number>, config: any): PricingConfig {
  return {
    weights: {
      pitches: weights.pitches || 1.0,
      clicks: weights.clicks || 0.3,
      saves: weights.saves || 0.2,
      drafts: weights.drafts || 0.1,
      outlet_avg_price: weights.outlet_avg_price || -1.0,
      successRateOutlet: weights.successRateOutlet || -0.5,
      hoursRemaining: weights.hoursRemaining || -1.2,
    },
    priceStep: config.priceStep?.dollars || 5,
    elasticity: 1.0, // Default for now, can be made configurable
    floor: 50,
    ceil: 500,
  };
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
  console.log("🔍 Fetching live opportunities...");
  
  // For now, let's use a simpler query and calculate metrics separately
  // This can be optimized later with proper JOINs
  const liveOpps = await db
    .select()
    .from(opportunities)
    .where(
      and(
        eq(opportunities.status, "open"),
        gt(opportunities.deadline, new Date())
      )
    );
  
  console.log(`📋 Found ${liveOpps.length} live opportunities`);
  
  // Get metrics for each opportunity
  const oppsWithMetrics = await Promise.all(
    liveOpps.map(async (opp) => {
      // Count pitches for this opportunity
      const pitchCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pitches)
        .where(eq(pitches.opportunityId, opp.id));
      
      const pitchCount = Number(pitchCountResult[0]?.count || 0);
      
      // Count saves for this opportunity
      const saveCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(savedOpportunities)
        .where(eq(savedOpportunities.opportunityId, opp.id));
      
      const saveCount = Number(saveCountResult[0]?.count || 0);
      
      // For now, set other metrics to 0 - these can be implemented later
      // when we have click/save/draft tracking in place
      return {
        ...opp,
        pitchCount,
        clickCount: 0, // TODO: Implement click tracking
        saveCount,     // ✅ Now tracking actual saves!
        draftCount: 0, // TODO: Implement draft tracking
      };
    })
  );
  
  return oppsWithMetrics;
}

/**
 * Build pricing snapshot for an opportunity
 */
function buildPricingSnapshot(
  opp: Opportunity & {
    pitchCount: number;
    clickCount: number;
    saveCount: number; 
    draftCount: number;
  }
): PricingSnapshot {
  const now = new Date();
  const deadline = new Date(opp.deadline!);
  const hoursRemaining = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
  
  return {
    opportunityId: opp.id.toString(),
    tier: opp.tier === "Tier 1" ? 1 : opp.tier === "Tier 2" ? 2 : 3,
    current_price: Number(opp.current_price) || (opp.tier === "Tier 1" ? 250 : opp.tier === "Tier 2" ? 175 : 125),
    pitches: opp.pitchCount,
    clicks: opp.clickCount,
    saves: opp.saveCount,
    drafts: opp.draftCount,
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
 * Process a single pricing tick
 */
async function processPricingTick(): Promise<void> {
  console.log("\n🔄 Starting pricing tick...");
  
  try {
    const liveOpps = await fetchLiveOpportunities();
    const pricingConfig = buildPricingConfig(cachedWeights, cachedConfig);
    
    let updatedCount = 0;
    let skippedCount = 0;
    const gptBatch: PricingSnapshot[] = [];
    
    for (const opp of liveOpps) {
      const snapshot = buildPricingSnapshot(opp);
      const newPrice = computePrice(snapshot, pricingConfig);
      const currentPrice = snapshot.current_price;
      const priceDelta = newPrice - currentPrice;
      
      if (newPrice !== currentPrice) {
        // Check gatekeeper rule
        if (shouldSkipGPT(priceDelta, snapshot.hoursRemaining, pricingConfig.priceStep)) {
          // Apply price change directly
          await updateOpportunityPrice(opp.id, newPrice, snapshot, "worker");
          updatedCount++;
          
          const direction = priceDelta > 0 ? "▲" : "▼";
          console.log(`💰 OPP ${opp.id} → $${newPrice} (${direction}$${Math.abs(priceDelta)}) [direct]`);
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
      await queueForGPT(gptBatch);
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
  
  console.log("✅ Worker initialized successfully");
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
    
    // Get tick interval from config
    const tickInterval = cachedConfig.tickIntervalMs || 60000; // Default 60 seconds
    console.log(`⏰ Starting worker loop with ${tickInterval}ms intervals`);
    
    // Check for --once flag for single-run testing
    const isOnceMode = process.argv.includes("--once");
    
    if (isOnceMode) {
      console.log("🔧 Running in --once mode");
      await processPricingTick();
      console.log("✅ Single tick completed, exiting");
      process.exit(0);
    }
    
    // Start the main loop
    const interval = setInterval(async () => {
      try {
        // Hot-reload check every 5 minutes
        if (Date.now() - lastReload > 300_000) { // 5 min
          const latestResult = await db
            .select({ ts: sql<Date>`MAX(updated_at)` })
            .from(pricing_config);
          
          const latest = latestResult[0]?.ts;
          if (latest && latest > cachedConfigTime) {
            await reloadWeightsAndConfig();
            lastReload = Date.now();
          } else {
            lastReload = Date.now(); // Update check time even if no reload needed
          }
        }
        
        await processPricingTick();
      } catch (error) {
        console.error("💥 Fatal error in pricing tick:", error);
        clearInterval(interval);
        process.exit(1); // Exit so PM2/supervisor can restart
      }
    }, tickInterval);
    
    console.log("🔄 Worker loop started successfully");
    
    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("🛑 Received SIGINT, shutting down gracefully...");
      clearInterval(interval);
      isRunning = false;
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully...");
      clearInterval(interval);
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
    console.error("💥 Unhandled error:", error);
    process.exit(1);
  });
}

export { startWorker, processPricingTick }; 