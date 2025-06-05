import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config();

const sql = neon(process.env.DATABASE_URL!);

async function checkDatabase() {
  console.log("🔍 Checking price snapshots table...");
  
  const snapshots = await sql`
    SELECT * FROM price_snapshots 
    ORDER BY tick_time DESC 
    LIMIT 5
  `;
  
  console.log(`📊 Found ${snapshots.length} recent price snapshots:`);
  snapshots.forEach((snap, i) => {
    console.log(`  ${i + 1}. OPP ${snap.opportunity_id}: $${snap.suggested_price} at ${snap.tick_time}`);
  });
  
  console.log("\n🔍 Checking opportunities current prices...");
  
  const opps = await sql`
    SELECT id, title, current_price, deadline, status 
    FROM opportunities 
    WHERE status = 'open' AND deadline > now()
    ORDER BY id
  `;
  
  console.log(`📋 Found ${opps.length} live opportunities:`);
  opps.forEach((opp, i) => {
    console.log(`  ${i + 1}. OPP ${opp.id}: "${opp.title}" - $${opp.current_price || 'null'}`);
  });
}

checkDatabase().catch(console.error); 