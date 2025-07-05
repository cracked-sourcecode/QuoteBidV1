import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { variable_registry, pricing_config } from "./shared/schema.js";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const neonSql = neon(connectionString);
const db = drizzle(neonSql);

async function testPricingSystem() {
  console.log("🧪 TESTING PRICING SYSTEM");
  console.log("=" .repeat(50));
  
  try {
    // Test 1: Check what's actually in variable_registry
    console.log("\n📊 VARIABLES IN DATABASE:");
    const variables = await db.select().from(variable_registry);
    
    if (variables.length === 0) {
      console.log("❌ No variables found in database!");
    } else {
      variables.forEach(v => {
        console.log(`✅ ${v.var_name}: ${v.weight} (${v.nonlinear_fn})`);
      });
    }
    
    // Test 2: Check what's in pricing_config  
    console.log("\n⚙️ CONFIG VALUES IN DATABASE:");
    const configs = await db.select().from(pricing_config);
    
    if (configs.length === 0) {
      console.log("❌ No config values found in database!");
    } else {
      configs.forEach(c => {
        console.log(`✅ ${c.key}: ${JSON.stringify(c.value)}`);
      });
    }
    
    // Test 3: Check specific expected variables
    console.log("\n🎯 CHECKING EXPECTED VARIABLES:");
    const expectedVars = ['baselineDecay', 'floor', 'ceil', 'pitches', 'clicks', 'saves'];
    
    for (const varName of expectedVars) {
      const found = variables.find(v => v.var_name === varName);
      if (found) {
        console.log(`✅ ${varName}: EXISTS (${found.weight})`);
      } else {
        console.log(`❌ ${varName}: MISSING`);
      }
    }
    
    // Test 4: Check expected config values
    console.log("\n🎯 CHECKING EXPECTED CONFIG VALUES:");
    const expectedConfigs = ['priceStep', 'tickIntervalMs', 'ambient.cooldownMins'];
    
    for (const configKey of expectedConfigs) {
      const found = configs.find(c => c.key === configKey);
      if (found) {
        console.log(`✅ ${configKey}: EXISTS (${JSON.stringify(found.value)})`);
      } else {
        console.log(`❌ ${configKey}: MISSING`);
      }
    }
    
  } catch (error) {
    console.error("💥 Database test failed:", error);
  }
}

// Run the test
testPricingSystem()
  .then(() => {
    console.log("\n🎉 Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  }); 