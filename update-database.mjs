import { db } from './server/db.js';

console.log('Starting database schema update...');

async function main() {
  try {
    console.log('Applying schema changes to the database...');
    
    // Use raw SQL to add the new columns to the pitches table
    await db.execute(`
ALTER TABLE pitches 
ADD COLUMN IF NOT EXISTS authorization_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS billed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
ADD COLUMN IF NOT EXISTS billing_error TEXT;
`);
    
    console.log('Database schema updated successfully!');
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  }
}

main();
