import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function deleteUser() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Delete the user with username 'bendev1'
    const deleteResult = await pool.query('DELETE FROM users WHERE username = $1 RETURNING id', ['bendev1']);
    
    if (deleteResult.rowCount > 0) {
      console.log(`User 'bendev1' with ID ${deleteResult.rows[0].id} successfully deleted`);
    } else {
      console.log("User 'bendev1' not found");
    }
    
    // Also clear sessions to prevent login issues
    const sessionResult = await pool.query('DELETE FROM user_sessions');
    console.log(`Cleared ${sessionResult.rowCount} session records`);
    
    await pool.end();
  } catch (error) {
    console.error('Error deleting user:', error);
    process.exit(1);
  }
}

deleteUser();