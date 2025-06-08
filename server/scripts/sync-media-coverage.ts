import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { storage } from '../storage';
import { getDb, initializeDatabase } from '../db';
import { mediaCoverage, pitches, opportunities, publications } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

async function syncMissingMediaCoverage() {
  try {
    console.log("🔍 Checking for delivered pitches without media coverage entries...");
    
    // Get all pitches that are delivered/successful
    const allPitches = await storage.getAllPitches();
    const deliveredPitches = allPitches.filter(pitch => 
      pitch.status === 'delivered' || 
      pitch.status === 'successful' || 
      pitch.status === 'Successful Coverage' ||
      pitch.status === 'accepted'
    );
    
    console.log(`📊 Found ${deliveredPitches.length} delivered pitches`);
    
    // Get all existing media coverage entries
    const existingMediaCoverage = await getDb()
      .select()
      .from(mediaCoverage)
      .orderBy(desc(mediaCoverage.createdAt));
    
    console.log(`📊 Found ${existingMediaCoverage.length} existing media coverage entries`);
    
    let createdCount = 0;
    
    for (const pitch of deliveredPitches) {
      // Check if media coverage already exists for this pitch
      const existingCoverage = existingMediaCoverage.find(coverage => 
        coverage.pitchId === pitch.id
      );
      
      if (existingCoverage) {
        console.log(`✅ Media coverage already exists for pitch ${pitch.id}`);
        continue;
      }
      
      console.log(`🔄 Creating media coverage for pitch ${pitch.id}...`);
      
      // Get opportunity details
      const opportunity = await storage.getOpportunity(pitch.opportunityId);
      if (!opportunity) {
        console.log(`❌ Opportunity not found for pitch ${pitch.id}`);
        continue;
      }
      
      // Get publication details 
      const publication = await storage.getPublication(opportunity.publicationId);
      const publicationName = publication?.name || 'Unknown Publication';
      
      // Get placement info if it exists
      const placements = await storage.getAllPlacements();
      const placement = placements.find(p => p.pitchId === pitch.id);
      
      // Create media coverage entry
      const mediaCoverageData = {
        userId: pitch.userId,
        title: opportunity.title || `Published Article - ${opportunity.title}`,
        publication: publicationName,
        url: '', // Will be filled when article URL is provided
        source: 'auto_sync',
        placementId: placement?.id,
        pitchId: pitch.id,
        isVerified: true, // Mark as verified since it's from a delivered pitch
        articleDate: new Date(), // Use current date as default
      };
      
      try {
        const newMediaCoverage = await storage.createMediaCoverage(mediaCoverageData);
        console.log(`✅ Created media coverage entry ${newMediaCoverage.id} for pitch ${pitch.id}`);
        createdCount++;
      } catch (error: any) {
        console.error(`❌ Failed to create media coverage for pitch ${pitch.id}:`, error);
      }
    }
    
    console.log(`🎉 Media coverage sync completed: ${createdCount} new entries created`);
    return createdCount;
    
  } catch (error: any) {
    console.error("❌ Error in media coverage sync:", error);
    throw error;
  }
}

// Initialize database and run the sync
async function main() {
  try {
    console.log("🔧 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database initialized");
    
    const count = await syncMissingMediaCoverage();
    console.log(`✅ Sync completed successfully. Created ${count} new media coverage entries.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

main(); 