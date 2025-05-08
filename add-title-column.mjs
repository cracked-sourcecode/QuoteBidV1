import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set. Please set it to continue.');
  process.exit(1);
}

async function main() {
  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('Checking if title column exists...');
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name = 'users' AND column_name = 'title'`
  );

  if (result.rows.length === 0) {
    console.log('Title column does not exist. Adding it now...');
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT`);
    console.log('Title column added successfully!');
  } else {
    console.log('Title column already exists.');
  }

  console.log('Database migration completed successfully.');
  await pool.end();
}

main().catch(error => {
  console.error('Error during migration:', error);
  process.exit(1);
});
