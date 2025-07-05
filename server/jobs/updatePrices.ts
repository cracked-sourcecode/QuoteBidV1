/**
 * QuoteBid Pricing Engine v2 - Update Prices Job
 * 
 * Processes live opportunities and updates prices using the new pricing engine
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql, gt, and, gte } from "drizzle-orm";
import { subMinutes } from "date-fns";
import { 
  opportunities, 
  price_snapshots, 
  variable_registry, 
  pricing_config,
  pitches,
  savedOpportunities,
  emailClicks,
  type Opportunity
} from "../../shared/schema";
import { calculatePrice } from "../../lib/pricing/pricingEngine";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonSql = neon(connectionString);
const db = drizzle(neonSql);

/**
 * Build signals for pricing calculation with real data
 */
async function buildSignals(opp: Opportunity & { pitchCount: number; clickCount: number; saveCount: number; draftCount: number }, now: number) {
  const deadline = new Date(opp.deadline!);
  const hoursRemaining = Math.max(0, (deadline.getTime() - now) / (1000 * 60 * 60));
  
  // Ensure tier is properly typed as 1 | 2 | 3
  let tier: 1 | 2 | 3 = 1;
  if (opp.tier === "Tier 1") tier = 1;
  else if (opp.tier === "Tier 2") tier = 2;
  else if (opp.tier === "Tier 3") tier = 3;
  
  // Get real signal data
  const clicksLast10m = await countEvents(opp.id, "click", 10);
  const pitchesLast10m = await countEvents(opp.id, "pitch", 10);
  const emailClicks1h = await emailClicksLastHour(opp.id);
  const lastInteractionMins = await minsSinceLastInteraction(opp.id);
  const outletLoad = await countOpenOutletLoad(opp.publicationId);
  
  const clicks = opp.clickCount;     // total clicks column (placeholder until click tracking implemented)
  const pitches = opp.pitchCount;   // total pitches column
  const conversionRate = clicks >= 5 ? pitches / clicks : 0;
  
  return {
    opportunityId: opp.id.toString(),
    tier,
    current_price: Number(opp.current_price) || 100,
    pitches,
    clicks,
    saves: opp.saveCount,
    drafts: opp.draftCount,
    emailClicks1h,
    hoursRemaining,
    clicksLast10m,
    pitchesLast10m,
    conversionRate,
    outletLoad,
    lastInteractionMins,
    outlet_avg_price: undefined, // TODO: Add outlet metrics in future step
    successRateOutlet: undefined, // TODO: Add outlet metrics in future step
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
      
      return {
        ...opp,
        pitchCount,
        clickCount: 0, // Placeholder - will wire in Step 2
        saveCount,
        draftCount,    // ✅ Now tracking actual drafts!
      };
    })
  );
  
  return oppsWithMetrics;
}

// Returns count of pitches for an opp in the last <mins> (placeholder for event tracking)
async function countEvents(oppId: number, event: "click" | "pitch", mins: number): Promise<number> {
  if (event === "pitch") {
    // Count actual pitches from the last N minutes
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(pitches)
      .where(
        and(
          eq(pitches.opportunityId, oppId),
          gte(pitches.createdAt, subMinutes(new Date(), mins))
        )
      );
    return Number(result[0]?.count || 0);
  }
  
  // Click tracking not implemented yet - return 0 as placeholder
  return 0;
}

// Returns count of email clicks in the last hour for pricing emails only
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

// Returns minutes since the last interaction of ANY kind (placeholder implementation)
async function minsSinceLastInteraction(oppId: number): Promise<number> {
  // Check last pitch as proxy for interaction until full event tracking is implemented
  const lastPitch = await db
    .select({ createdAt: pitches.createdAt })
    .from(pitches)
    .where(eq(pitches.opportunityId, oppId))
    .orderBy(sql`${pitches.createdAt} desc`)
    .limit(1);
  
  if (!lastPitch || lastPitch.length === 0) return 9999;
  return Math.floor((Date.now() - lastPitch[0].createdAt!.getTime()) / 60000);
}

// Returns count of currently OPEN opps for the same publication
async function countOpenOutletLoad(publicationId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.publicationId, publicationId),
        eq(opportunities.status, "open"),
        gte(opportunities.createdAt, subMinutes(new Date(), 60 * 24 * 7)) // 7-day window
      )
    );
  
  return Number(result[0]?.count || 0);
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
      const signals = await buildSignals(opp, Date.now());
      
      const result = calculatePrice(signals, {
        weights: {
          pitches: 1.0,
          clicks: 0.3,
          saves: 0.2,
          drafts: 0.1,
          emailClickBoost: 0.05, // New email click boost weight
          outlet_avg_price: -1.0,
          successRateOutlet: -0.5,
          hoursRemaining: -1.2,
          baselineDecay: 0.05, // Default 5% constant downward pressure
        },
        priceStep: 5,
        elasticity: 1.0,
        floor: 50, // Default minimum price floor (now configurable via variables)
        ceil: 500, // Default maximum price ceiling (now configurable via variables)
      });
      
      // Only update if price changed
      if (result.price !== Number(opp.current_price)) {
        await db
          .update(opportunities)
          .set({
            current_price: result.price.toString(),
            meta: result.meta, // V2 telemetry metadata
            lastDriftAt: result.meta.driftApplied ? BigInt(Date.now()) : opp.lastDriftAt,
          })
          .where(eq(opportunities.id, opp.id));
        
        // Insert price snapshot for audit trail
        await db
          .insert(price_snapshots)
          .values({
            opportunity_id: opp.id,
            suggested_price: result.price.toString(),
            snapshot_payload: signals as any,
          });
        
        updatedCount++;
        console.log(`💰 Updated OPP ${opp.id}: $${opp.current_price} → $${result.price} (score: ${result.meta.score.toFixed(2)}, emailClicks1h: ${signals.emailClicks1h})`);
      }
    }
    
    console.log(`✅ Price update complete: ${updatedCount} opportunities updated`);
    
  } catch (error) {
    console.error("❌ Error in updatePrices job:", error);
    throw error;
  }
}