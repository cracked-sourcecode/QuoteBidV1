import pg from 'pg';
const { Pool } = pg;

async function clearSessions() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Clear session data
    const result = await pool.query('DELETE FROM "user_sessions"');
    
    console.log(`Cleared ${result.rowCount} session records`);
    await pool.end();

  } catch (error) {
    console.error('Error clearing sessions:', error);
    process.exit(1);
  }
}

clearSessions();