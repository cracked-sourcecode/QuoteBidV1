/**
 * Seed script for Pricing Engine v2 - Step 5
 * Adds the required conversion, velocity, ambient, and load penalty weights
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pricing_config } from "../shared/schema";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonSql = neon(connectionString);
const db = drizzle(neonSql);

async function seedV2Weights() {
  console.log("🌱 Seeding Pricing Engine v2 weight keys...");
  
  try {
    // Insert the 5 new v2 weight keys
    const result = await db.insert(pricing_config).values([
      { key: 'conversionPenalty',      value: '-0.4' },
      { key: 'pitchVelocityBoost',     value: '0.2'  },
      { key: 'outletLoadPenalty',      value: '-0.2' },
      { key: 'ambient.triggerMins',    value: '7'    },
      { key: 'ambient.cooldownMins',   value: '10'   },
    ]).onConflictDoNothing();

    console.log("✅ Successfully seeded v2 weight keys:");
    console.log("   • conversionPenalty: -0.4");
    console.log("   • pitchVelocityBoost: 0.2");
    console.log("   • outletLoadPenalty: -0.2");
    console.log("   • ambient.triggerMins: 7");
    console.log("   • ambient.cooldownMins: 10");
    
    console.log("\n🔍 Next steps:");
    console.log("   1. Verify keys appear in Admin → Pricing Variables");
    console.log("   2. Edit/save one value to test hot-reload");
    console.log("   3. Check opportunity meta.score is non-zero in worker logs");
    
  } catch (error) {
    console.error("❌ Error seeding v2 weights:", error);
    throw error;
  }
}

// Run the seed script directly
seedV2Weights()
  .then(() => {
    console.log("🎉 Seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  });

export { seedV2Weights }; 