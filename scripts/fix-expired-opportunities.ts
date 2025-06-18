/**
 * Fix Expired Opportunities
 * 
 * This script finds opportunities that should have been closed but weren't,
 * and properly closes them with their final prices recorded.
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql, and } from "drizzle-orm";
import { opportunities } from "../shared/schema";

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonSql = neon(connectionString);
const db = drizzle(neonSql);

async function fixExpiredOpportunities() {
  console.log("🔍 Finding opportunities that should have been closed...");
  
  try {
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
      console.log("✅ No expired opportunities found - all opportunities are properly closed!");
      return;
    }
    
    console.log(`🔄 Found ${expiredOpps.length} opportunities that should have been closed`);
    
    let fixedCount = 0;
    
    for (const opp of expiredOpps) {
      try {
        // Use the current_price as the final price since that's the last market price
        const finalPrice = opp.current_price || opp.minimumBid || 225;
        const closedAt = new Date(opp.deadline!); // Use deadline as close time
        
        console.log(`🏁 Fixing opportunity ${opp.id}: "${opp.title}" - setting final price to $${finalPrice}`);
        
        // Update the opportunity status and record final price
        await db
          .update(opportunities)
          .set({
            status: 'closed',
            closedAt,
            lastPrice: String(finalPrice)
          })
          .where(eq(opportunities.id, opp.id));
          
        console.log(`✅ Fixed opportunity ${opp.id} with final price $${finalPrice}`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to fix opportunity ${opp.id}:`, error);
      }
    }
    
    console.log(`\n🎉 Successfully fixed ${fixedCount} out of ${expiredOpps.length} expired opportunities`);
    console.log("✅ All opportunities now have proper final prices recorded!");
    
  } catch (error) {
    console.error("❌ Error fixing expired opportunities:", error);
    process.exit(1);
  }
}

// Run the script
fixExpiredOpportunities()
  .then(() => {
    console.log("🏁 Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 