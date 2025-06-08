import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { storage } from '../storage';
import { getDb, initializeDatabase } from '../db';

async function createTestMediaCoverage() {
  try {
    console.log("🔧 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database initialized");
    
    console.log("🔄 Creating test media coverage entries for user 193...");
    
    // Create multiple test entries to simulate delivered pitches
    const testEntries = [
      {
        userId: 193,
        title: "How AI is Revolutionizing Financial Markets: A Deep Dive Analysis",
        publication: "Forbes",
        url: "https://forbes.com/ai-financial-markets-analysis",
        source: 'test_entry',
        isVerified: true,
        articleDate: new Date('2024-12-01'),
      },
      {
        userId: 193,
        title: "Tech Startup Raises $50M in Series B Funding Round",
        publication: "TechCrunch",
        url: "https://techcrunch.com/tech-startup-funding-50m",
        source: 'test_entry',
        isVerified: true,
        articleDate: new Date('2024-11-28'),
      },
      {
        userId: 193,
        title: "Climate Change Solutions: Innovative Approaches for 2025",
        publication: "Bloomberg",
        url: "https://bloomberg.com/climate-solutions-2025",
        source: 'test_entry',
        isVerified: true,
        articleDate: new Date('2024-11-25'),
      },
      {
        userId: 193,
        title: "The Future of Remote Work: Trends and Predictions",
        publication: "Harvard Business Review",
        url: "https://hbr.org/future-remote-work-trends",
        source: 'test_entry',
        isVerified: true,
        articleDate: new Date('2024-11-20'),
      },
      {
        userId: 193,
        title: "Cryptocurrency Market Analysis: What to Expect in 2025",
        publication: "Wall Street Journal",
        url: "https://wsj.com/crypto-market-analysis-2025",
        source: 'test_entry',
        isVerified: true,
        articleDate: new Date('2024-11-15'),
      }
    ];
    
    let createdCount = 0;
    
    for (const entry of testEntries) {
      try {
        const newEntry = await storage.createMediaCoverage(entry);
        console.log(`✅ Created media coverage entry ${newEntry.id}: "${entry.title}"`);
        createdCount++;
      } catch (error: any) {
        console.error(`❌ Failed to create entry for "${entry.title}":`, error);
      }
    }
    
    console.log(`\n🎉 Successfully created ${createdCount} test media coverage entries for user 193`);
    console.log("📱 User 193 should now see these entries in the /account page under Media Coverage");
    
  } catch (error: any) {
    console.error("❌ Error creating test media coverage:", error);
    throw error;
  }
}

// Initialize database and run the creation
async function main() {
  try {
    await createTestMediaCoverage();
    process.exit(0);
  } catch (error) {
    console.error("❌ Creation failed:", error);
    process.exit(1);
  }
}

main(); 