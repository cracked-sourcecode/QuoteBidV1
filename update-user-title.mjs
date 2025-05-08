import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon database connection
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // Get user with ID 24 as an example
    const result = await pool.query('SELECT id, username, full_name, title FROM users WHERE id = 24');
    console.log('Current user data:', result.rows[0]);
    
    // Update the title if needed
    if (!result.rows[0].title) {
      console.log('Updating title for user...');
      await pool.query('UPDATE users SET title = $1 WHERE id = $2', ['CEO of QuoteBid', 24]);
      
      // Verify the update
      const updated = await pool.query('SELECT id, username, full_name, title FROM users WHERE id = 24');
      console.log('Updated user data:', updated.rows[0]);
    } else {
      console.log('User already has a title:', result.rows[0].title);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
