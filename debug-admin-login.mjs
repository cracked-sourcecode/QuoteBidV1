// Admin login debugger
import { connect } from '@neondatabase/serverless';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { scrypt, timingSafeEqual } from 'crypto';

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied, stored) {
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64));
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

async function main() {
  // Connect to database
  const client = connect({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get the admin username from command line arguments
    const username = process.argv[2];
    const password = process.argv[3];
    
    if (!username || !password) {
      console.error('Usage: node debug-admin-login.mjs <username> <password>');
      process.exit(1);
    }
    
    // Query the admin user
    const { rows } = await client.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    );
    
    if (rows.length === 0) {
      console.log('Admin user not found');
      process.exit(1);
    }
    
    const admin = rows[0];
    console.log('Admin user found:');
    console.log('ID:', admin.id);
    console.log('Username:', admin.username);
    console.log('Email:', admin.email);
    console.log('Full Name:', admin.full_name);
    console.log('Password (hashed):', admin.password);
    console.log('Role:', admin.role);
    
    // Check password
    const isPasswordValid = await comparePasswords(password, admin.password);
    console.log('Password valid:', isPasswordValid);
    
    // Output raw SQL for manual testing of password comparison
    console.log('\nRaw password comparison values:');
    console.log('Test password:', password);
    console.log('Stored hash:', admin.password);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close DB connection
    await client.end();
  }
}

main();