import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { storage } from '../storage';
import { getDb, initializeDatabase } from '../db';
import { mediaCoverage, users, pitches } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

async function checkMediaCoverageStatus() {
  try {
    console.log("🔧 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database initialized");
    
    console.log("🔍 Checking media coverage status for all users...");
    
    // Get all users
    const allUsers = await storage.getAllUsers();
    console.log(`📊 Total users: ${allUsers.length}`);
    
    // Get all pitches
    const allPitches = await storage.getAllPitches();
    const deliveredPitches = allPitches.filter(pitch => 
      pitch.status === 'delivered' || 
      pitch.status === 'successful' || 
      pitch.status === 'Successful Coverage' ||
      pitch.status === 'accepted'
    );
    console.log(`📊 Total delivered pitches: ${deliveredPitches.length}`);
    
    // Get all media coverage entries
    const allMediaCoverage = await getDb()
      .select()
      .from(mediaCoverage)
      .orderBy(desc(mediaCoverage.createdAt));
    console.log(`📊 Total media coverage entries: ${allMediaCoverage.length}`);
    
    // Group by user
    const userStats = new Map();
    
    for (const user of allUsers) {
      const userPitches = allPitches.filter(p => p.userId === user.id);
      const userDeliveredPitches = deliveredPitches.filter(p => p.userId === user.id);
      const userMediaCoverage = allMediaCoverage.filter(mc => mc.userId === user.id);
      
      userStats.set(user.id, {
        user: user,
        totalPitches: userPitches.length,
        deliveredPitches: userDeliveredPitches.length,
        mediaCoverage: userMediaCoverage.length
      });
    }
    
    console.log("\n📋 User Media Coverage Report:");
    console.log("=====================================");
    
    userStats.forEach((stats, userId) => {
      if (stats.totalPitches > 0 || stats.mediaCoverage > 0) {
        console.log(`User ${userId} (${stats.user.email}):`);
        console.log(`  - Total pitches: ${stats.totalPitches}`);
        console.log(`  - Delivered pitches: ${stats.deliveredPitches}`);
        console.log(`  - Media coverage entries: ${stats.mediaCoverage}`);
        console.log(`  - Coverage deficit: ${Math.max(0, stats.deliveredPitches - stats.mediaCoverage)}`);
        console.log("");
      }
    });
    
    // Create a test media coverage entry for user 1 if they don't have any
    const user1Stats = userStats.get(1);
    if (user1Stats && user1Stats.mediaCoverage === 0) {
      console.log("🔄 Creating test media coverage entry for user 1...");
      
      const testMediaCoverage = {
        userId: 1,
        title: "Test Media Coverage Entry - Published Article",
        publication: "Forbes",
        url: "https://forbes.com/test-article",
        source: 'test_entry',
        isVerified: true,
        articleDate: new Date(),
      };
      
      try {
        const newEntry = await storage.createMediaCoverage(testMediaCoverage);
        console.log(`✅ Created test media coverage entry ${newEntry.id} for user 1`);
      } catch (error: any) {
        console.error(`❌ Failed to create test entry:`, error);
      }
    } else if (user1Stats) {
      console.log(`✅ User 1 already has ${user1Stats.mediaCoverage} media coverage entries`);
    }
    
    console.log("\n🎉 Media coverage check completed");
    
  } catch (error: any) {
    console.error("❌ Error in media coverage check:", error);
    throw error;
  }
}

// Initialize database and run the check
async function main() {
  try {
    await checkMediaCoverageStatus();
    process.exit(0);
  } catch (error) {
    console.error("❌ Check failed:", error);
    process.exit(1);
  }
}

main(); 