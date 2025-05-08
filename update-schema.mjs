import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function updateSchema() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Add the new columns to the users table
    console.log("Adding new columns to users table...");
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS agreement_pdf_url TEXT,
      ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMP
    `);
    
    console.log("Schema update complete!");
    
    await pool.end();
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  }
}

updateSchema();