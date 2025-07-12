import { db } from './server/db.ts';
import fs from 'fs';

console.log('🔄 Running email scheduling improvements migration...');

try {
  // Read the migration file
  const migrationSQL = fs.readFileSync('./db/migration-20250127-email-scheduling-improvements.sql', 'utf8');
  
  // Execute the migration
  await db.execute(migrationSQL);
  
  console.log('✅ Email scheduling improvements migration completed successfully!');
  console.log('   - Added default values for email scheduling columns');
  console.log('   - Created performance indexes for email scheduling queries');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

process.exit(0); 