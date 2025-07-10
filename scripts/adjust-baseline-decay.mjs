#!/usr/bin/env node

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { variable_registry } from "../shared/schema.ts";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(connectionString);
const db = drizzle(sql);

async function adjustBaselineDecay() {
  try {
    console.log("🔧 Adjusting baseline decay from 5% to 2% for smoother price movements...");

    // Update baseline decay to be less aggressive
    await db
      .update(variable_registry)
      .set({ 
        weight: "0.02", // Changed from 0.05 (5%) to 0.02 (2%)
        updated_at: new Date()
      })
      .where(eq(variable_registry.var_name, "baselineDecay"));

    console.log("✅ Baseline decay adjusted successfully!");
    console.log("   Old value: 0.05 (5% decay)");
    console.log("   New value: 0.02 (2% decay)");
    console.log("📊 This will make price movements smoother and less aggressive");
    console.log("🔄 The pricing worker will pick up this change within 30 seconds");

  } catch (error) {
    console.error("❌ Error adjusting baseline decay:", error);
    process.exit(1);
  }
}

adjustBaselineDecay(); 