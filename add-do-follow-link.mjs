import { sql } from 'drizzle-orm';

// This is a temporary fix since we can't directly import the TypeScript file
// Let's use a direct database connection instead
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

// Add WebSocket constructor for Neon
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const database = drizzle(pool);

async function main() {
  console.log('Adding do_follow_link column to users table...');
  
  try {
    // Add the new column if it doesn't exist
    await database.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS do_follow_link TEXT;
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();