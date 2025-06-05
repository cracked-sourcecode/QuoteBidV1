import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

// Load environment variables
config();

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(connectionString);

async function createTables() {
  try {
    console.log("🚀 Creating pricing engine tables manually...");

    // Create variable_registry table
    await sql`
      CREATE TABLE IF NOT EXISTS variable_registry (
        var_name     TEXT PRIMARY KEY,
        weight       NUMERIC,
        nonlinear_fn TEXT,
        updated_at   TIMESTAMPTZ DEFAULT now()
      )
    `;
    console.log("✅ variable_registry table created");

    // Create pricing_config table
    await sql`
      CREATE TABLE IF NOT EXISTS pricing_config (
        key         TEXT PRIMARY KEY,
        value       JSONB,
        updated_at  TIMESTAMPTZ DEFAULT now()
      )
    `;
    console.log("✅ pricing_config table created");

    // Create price_snapshots table
    await sql`
      CREATE TABLE IF NOT EXISTS price_snapshots (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        opportunity_id    INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
        suggested_price   NUMERIC(10,2),
        snapshot_payload  JSONB,
        tick_time         TIMESTAMPTZ DEFAULT now()
      )
    `;
    console.log("✅ price_snapshots table created");

    // Add columns to opportunities if they don't exist
    await sql`
      ALTER TABLE opportunities 
      ADD COLUMN IF NOT EXISTS current_price NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS inventory_level INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS category TEXT,
      ADD COLUMN IF NOT EXISTS variable_snapshot JSONB
    `;
    console.log("✅ opportunities table updated");

    // Add columns to publications if they don't exist
    await sql`
      ALTER TABLE publications
      ADD COLUMN IF NOT EXISTS outlet_avg_price NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS success_rate_outlet NUMERIC(5,4)
    `;
    console.log("✅ publications table updated");

    console.log("🎉 All pricing engine tables created successfully!");

  } catch (error) {
    console.error("❌ Error creating tables:", error);
    process.exit(1);
  }
}

// Run the table creation
createTables()
  .then(() => {
    console.log("✅ Table creation completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Table creation failed:", error);
    process.exit(1);
  }); 