import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, gt } from "drizzle-orm";
import { opportunities } from "../../shared/schema";

config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function initializePrices() {
  console.log("🔧 Initializing opportunity prices...");
  
  // Get live opportunities
  const liveOpps = await db
    .select()
    .from(opportunities)
    .where(
      and(
        eq(opportunities.status, "open"),
        gt(opportunities.deadline, new Date())
      )
    );
  
  console.log(`📋 Found ${liveOpps.length} opportunities to initialize`);
  
  for (const opp of liveOpps) {
    // Set initial price based on tier
    const initialPrice = opp.tier === "Tier 1" ? 250 : 
                        opp.tier === "Tier 2" ? 175 : 125;
    
    await db
      .update(opportunities)
      .set({ current_price: initialPrice.toString() })
      .where(eq(opportunities.id, opp.id));
    
    console.log(`💰 OPP ${opp.id}: Initialized to $${initialPrice} (${opp.tier})`);
  }
  
  console.log("✅ Price initialization complete!");
}

initializePrices().catch(console.error); 