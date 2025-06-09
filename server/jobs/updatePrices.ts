/**
 * QuoteBid Pricing Engine v2 - Update Prices Job
 * 
 * Processes live opportunities and updates prices using the new pricing engine
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
import { computePrice } from "../../lib/pricing/pricingEngine";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonSql = neon(connectionString);
const db = drizzle(neonSql);

/**
 * Build signals for pricing calculation
 */
function buildSignals(opp: Opportunity & { pitchCount: number; clickCount: number; saveCount: number; draftCount: number }, now: number) {
  const deadline = new Date(opp.deadline!);
  const hoursRemaining = Math.max(0, (deadline.getTime() - now) / (1000 * 60 * 60));
  
  // Ensure tier is properly typed as 1 | 2 | 3
  let tier: 1 | 2 | 3 = 1;
  if (opp.tier === "Tier 1") tier = 1;
  else if (opp.tier === "Tier 2") tier = 2;
  else if (opp.tier === "Tier 3") tier = 3;
  
  return {
    opportunityId: opp.id.toString(),
    tier,
    current_price: Number(opp.current_price) || 100,
    pitches: opp.pitchCount,
    clicks: opp.clickCount,
    saves: opp.saveCount,
    drafts: opp.draftCount,
    hoursRemaining,
    clicksLast10m: 0, // Placeholder - will wire in Step 2
    pitchesLast10m: 0, // Placeholder - will wire in Step 2  
    conversionRate: 0, // Placeholder - will wire in Step 2
    outletLoad: 0, // Placeholder - will wire in Step 2
    lastInteractionMins: 0, // Placeholder - will wire in Step 2
    outlet_avg_price: undefined, // TODO: Add outlet metrics
    successRateOutlet: undefined, // TODO: Add outlet metrics
    inventory_level: Number(opp.inventory_level) || 0,
    category: opp.category || undefined,
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
      
      return {
        ...opp,
        pitchCount,
        clickCount: 0, // Placeholder - will wire in Step 2
        saveCount,
        draftCount: 0, // Placeholder - will wire in Step 2
      };
    })
  );
  
  return oppsWithMetrics;
}

/**
 * Main update prices function
 */
export async function updatePrices(): Promise<void> {
  console.log("🔄 Starting price update job with v2 engine...");
  
  try {
    const liveOpps = await fetchLiveOpportunities();
    let updatedCount = 0;
    
    for (const opp of liveOpps) {
      const signals = buildSignals(opp, Date.now());
      
      const price = computePrice(signals, {
        weights: {
          pitches: 1.0,
          clicks: 0.3,
          saves: 0.2,
          drafts: 0.1,
          outlet_avg_price: -1.0,
          successRateOutlet: -0.5,
          hoursRemaining: -1.2,
        },
        priceStep: 5,
        elasticity: 1.0,
        floor: 50,
        ceil: 500,
      });
      
      // Only update if price changed
      if (price !== Number(opp.current_price)) {
        await db
          .update(opportunities)
          .set({
            current_price: price.toString(),
            // meta: meta, // JSON blob for chart/debug - TODO: Add in Step 3
            // lastDriftAt: meta.driftApplied ? new Date() : opp.lastDriftAt, // TODO: Add in Step 3
          })
          .where(eq(opportunities.id, opp.id));
        
        // Insert price snapshot for audit trail
        await db
          .insert(price_snapshots)
          .values({
            opportunity_id: opp.id,
            suggested_price: price.toString(),
            snapshot_payload: signals as any,
          });
        
        updatedCount++;
        console.log(`💰 Updated OPP ${opp.id}: $${opp.current_price} → $${price}`);
      }
    }
    
    console.log(`✅ Price update complete: ${updatedCount} opportunities updated`);
    
  } catch (error) {
    console.error("❌ Error in updatePrices job:", error);
    throw error;
  }
} 