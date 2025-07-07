import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { variable_registry, pricing_config } from "../shared/schema.js";

// Load environment variables
config();

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(connectionString);
const db = drizzle(sql);

async function seedVariables() {
  try {
    console.log("🚀 Starting variable weights & config seeding...");

    // Insert variable weights using Drizzle ORM
    const variables = [
      { var_name: "pitches", weight: "1.0", nonlinear_fn: null },
      { var_name: "clicks", weight: "0.3", nonlinear_fn: null },
      { var_name: "saves", weight: "0.2", nonlinear_fn: null },
      { var_name: "drafts", weight: "0.1", nonlinear_fn: null },
      { var_name: "outlet_avg_price", weight: "-1.0", nonlinear_fn: null },
      { var_name: "successRateOutlet", weight: "-0.5", nonlinear_fn: null },
      { var_name: "hoursRemaining", weight: "-1.2", nonlinear_fn: "decay24h" },
      { var_name: "baselineDecay", weight: "0.05", nonlinear_fn: null },
      { var_name: "yieldPullCap", weight: "0.05", nonlinear_fn: null },
      { var_name: "boundaryPressure", weight: "0.03", nonlinear_fn: null },
      { var_name: "floor", weight: "50", nonlinear_fn: null },
      { var_name: "ceil", weight: "500", nonlinear_fn: null }
    ];

    for (const variable of variables) {
      await db.insert(variable_registry)
        .values(variable)
        .onConflictDoUpdate({
          target: variable_registry.var_name,
          set: {
            weight: variable.weight,
            nonlinear_fn: variable.nonlinear_fn,
          }
        });
    }

    console.log("✅ Variable weights seeded successfully");

    // Insert pricing config using Drizzle ORM
    const configs = [
      { key: "priceStep", value: { dollars: 5 } },
      { key: "tickIntervalMs", value: 60000 }
    ];

    for (const config of configs) {
      await db.insert(pricing_config)
        .values(config)
        .onConflictDoUpdate({
          target: pricing_config.key,
          set: {
            value: config.value,
          }
        });
    }

    console.log("✅ Pricing config seeded successfully");
    console.log("📊 Variable weights & config seeding completed!");

  } catch (error) {
    console.error("❌ Error seeding variables:", error);
    process.exit(1);
  }
}

// Run the seeding
seedVariables()
  .then(() => {
    console.log("🎉 Seeding process completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding process failed:", error);
    process.exit(1);
  }); 