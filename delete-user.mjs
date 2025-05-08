import pg from 'pg';
const { Pool } = pg;

async function deleteUser() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Delete user with ID 9 (bendev1)
    const result = await pool.query('DELETE FROM users WHERE id = 9');
    
    console.log(`Deleted ${result.rowCount} user(s) with ID 9 (bendev1)`);
    await pool.end();

  } catch (error) {
    console.error('Error deleting user:', error);
    process.exit(1);
  }
}

deleteUser();