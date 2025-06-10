/**
 * Quick verification script for Step 5 - Pricing Engine v2 weights
 * Checks if the 5 required v2 weight keys are present in the database
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { pricing_config } from "../shared/schema";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonSql = neon(connectionString);
const db = drizzle(neonSql);

async function verifyV2Weights() {
  console.log("🔍 Verifying Pricing Engine v2 weight keys...");
  
  const requiredKeys = [
    'conversionPenalty',
    'pitchVelocityBoost',
    'outletLoadPenalty',
    'ambient.triggerMins',
    'ambient.cooldownMins'
  ];
  
  try {
    let allFound = true;
    
    for (const key of requiredKeys) {
      const result = await db
        .select()
        .from(pricing_config)
        .where(eq(pricing_config.key, key))
        .limit(1);
        
      if (result.length > 0) {
        console.log(`✅ ${key}: ${result[0].value}`);
      } else {
        console.log(`❌ ${key}: MISSING`);
        allFound = false;
      }
    }
    
    if (allFound) {
      console.log("\n🎉 All v2 weight keys are present!");
      console.log("📊 Step 5 verification: PASSED");
    } else {
      console.log("\n❌ Some v2 weight keys are missing!");
      console.log("📊 Step 5 verification: FAILED");
    }
    
  } catch (error) {
    console.error("❌ Error verifying v2 weights:", error);
    throw error;
  }
}

// Run the verification
verifyV2Weights()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Verification failed:", error);
    process.exit(1);
  }); 