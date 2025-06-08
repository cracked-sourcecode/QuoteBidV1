import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { storage } from '../storage';
import { getDb, initializeDatabase } from '../db';
import { mediaCoverage } from '../../shared/schema';
import { eq } from 'drizzle-orm';

async function cleanupTestMediaCoverage() {
  try {
    console.log("🔧 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database initialized");
    
    console.log("🗑️ Deleting test media coverage entries...");
    
    // Delete test entries based on source = 'test_entry'
    const result = await getDb()
      .delete(mediaCoverage)
      .where(eq(mediaCoverage.source, 'test_entry'))
      .returning();
    
    console.log(`✅ Deleted ${result.length} test media coverage entries`);
    
  } catch (error: any) {
    console.error("❌ Error cleaning up test media coverage:", error);
    throw error;
  }
}

// Initialize database and run the cleanup
async function main() {
  try {
    await cleanupTestMediaCoverage();
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }
}

main(); 