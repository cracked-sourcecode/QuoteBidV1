/**
 * Opportunity Price Update API Route
 * 
 * POST /api/opportunity/:id/price
 * Updates opportunity price and creates audit trail
 */

import express from "express";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { opportunities, price_snapshots } from "../../shared/schema";

const router = express.Router();

// Initialize database
const neonSql = neon(process.env.DATABASE_URL!);
const db = drizzle(neonSql);

/**
 * POST /api/opportunity/:id/price
 * Update opportunity price with audit trail
 */
router.post("/opportunity/:id/price", async (req, res) => {
  try {
    const { id } = req.params;
    const { price, snapshot } = req.body;

    // Validate opportunity ID
    const opportunityId = parseInt(id);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: "Invalid opportunity ID" });
    }

    // Validate price (v2: let pricingEngine.ts handle bounds)
    if (typeof price !== "number" || price <= 0) {
      return res.status(400).json({ 
        error: "Invalid price - must be a positive number" 
      });
    }

    // Check if opportunity exists
    const existingOpp = await db
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(eq(opportunities.id, opportunityId))
      .limit(1);

    if (existingOpp.length === 0) {
      return res.status(404).json({ error: "Opportunity not found" });
    }

    // Update opportunity price and create audit trail in a transaction
    await db.transaction(async (trx) => {
      // Update the opportunity's current price and variable snapshot
      await trx
        .update(opportunities)
        .set({
          current_price: price.toString(),
          variable_snapshot: snapshot || null,
        })
        .where(eq(opportunities.id, opportunityId));

      // Insert price snapshot for audit trail
      await trx
        .insert(price_snapshots)
        .values({
          opportunity_id: opportunityId,
          suggested_price: price.toString(),
          snapshot_payload: snapshot || {},
          tick_time: new Date(),
        });
    });

    console.log(`💰 Price updated via API: OPP ${opportunityId} → $${price}`);

    return res.status(200).json({ 
      ok: true, 
      message: `Opportunity ${opportunityId} price updated to $${price}` 
    });

  } catch (error) {
    console.error("❌ Price update API error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router; 