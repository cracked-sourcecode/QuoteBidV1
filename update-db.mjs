import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // Simple query to create the placements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS placements (
        id SERIAL PRIMARY KEY,
        pitch_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        opportunity_id INTEGER NOT NULL,
        publication_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_invoice',
        article_title TEXT,
        article_url TEXT,
        screenshot_url TEXT,
        publication_date TIMESTAMP,
        invoice_id TEXT,
        payment_id TEXT,
        notification_sent BOOLEAN DEFAULT FALSE,
        metrics JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        charged_at TIMESTAMP
      );
    `);
    
    console.log("Placements table created successfully!");
  } catch (error) {
    console.error("Failed to create table:", error);
  } finally {
    await pool.end();
  }
}

main();
