import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { variable_registry } from "../shared/schema.js";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonSql = neon(connectionString);
const db = drizzle(neonSql);

async function addBaselineDecayVariable() {
  console.log("🎯 Adding baselineDecay variable to variable_registry...");
  
  try {
    // Check if baselineDecay already exists
    const existing = await db
      .select()
      .from(variable_registry)
      .where(eq(variable_registry.var_name, 'baselineDecay'))
      .limit(1);
    
    if (existing.length > 0) {
      console.log("✅ baselineDecay variable already exists");
      console.log(`   Current value: ${existing[0].weight}`);
      return;
    }
    
    // Insert baselineDecay variable
    const result = await db
      .insert(variable_registry)
      .values({
        var_name: 'baselineDecay',
        weight: '0.05', // Default 5% constant downward pressure (as string for numeric type)
        nonlinear_fn: 'none',
        updated_at: new Date()
      })
      .returning();
    
    console.log("✅ Added baselineDecay variable:");
    console.log(`   Name: ${result[0].var_name}`);
    console.log(`   Weight: ${result[0].weight}`);
    console.log(`   Function: ${result[0].nonlinear_fn}`);
    console.log(`   Created: ${result[0].updated_at}`);
    
  } catch (error) {
    console.error("❌ Error adding baselineDecay variable:", error);
    throw error;
  }
}

// Run the script
addBaselineDecayVariable()
  .then(() => {
    console.log("🎉 Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 