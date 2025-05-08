// Admin user recreation utility
// This script will recreate an admin user directly in the database
import pkg from '@neondatabase/serverless';
const { Pool } = pkg;
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  // Default admin credentials (can be changed via command line args)
  const adminUsername = process.argv[2] || 'admin';
  const adminPassword = process.argv[3] || 'password123';
  const adminEmail = process.argv[4] || 'admin@example.com';
  const adminFullName = process.argv[5] || 'Admin User';
  
  console.log("Creating admin with the following credentials:");
  console.log("Username:", adminUsername);
  console.log("Email:", adminEmail);
  console.log("Full Name:", adminFullName);
  
  try {
    // Connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    // Delete any existing admin user with the same username (to prevent conflicts)
    console.log("Checking for existing admin user...");
    const { rowCount } = await client.query(
      'DELETE FROM admin_users WHERE username = $1 RETURNING id',
      [adminUsername]
    );
    
    if (rowCount > 0) {
      console.log(`Deleted existing admin user with username '${adminUsername}'`);
    } else {
      console.log("No existing admin found with that username");
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(adminPassword);
    console.log("Password hashed successfully");
    
    // Current timestamp
    const now = new Date();
    
    // Insert the new admin user
    const { rows } = await client.query(
      `INSERT INTO admin_users 
        (username, password, email, full_name, role, created_at, updated_at) 
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, username, email, full_name, role`,
      [adminUsername, hashedPassword, adminEmail, adminFullName, 'admin', now, now]
    );
    
    console.log("Admin user created successfully:");
    console.log(rows[0]);
    
    await client.end();
    
    console.log("\nAdmin creation complete. You can now log in with:");
    console.log(`Username: ${adminUsername}`);
    console.log(`Password: ${adminPassword}`);
    
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}
