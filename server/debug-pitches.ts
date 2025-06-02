import { storage } from "./storage";
import { initializeDatabase } from "./db";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.join(process.cwd(), '.env') });

async function debugPitches() {
  console.log("🔍 DEBUG: Starting pitch analysis for opportunity 11...\n");
  
  try {
    // Initialize database first
    console.log("📚 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database initialized");
    
    // Get the opportunity
    const opportunity = await storage.getOpportunity(11);
    if (!opportunity) {
      console.log("❌ Opportunity 11 not found");
      return;
    }
    
    console.log("✅ Opportunity found:", {
      id: opportunity.id,
      title: opportunity.title,
      status: opportunity.status
    });
    
    // Get pitches with user data
    console.log("\n📊 Fetching pitches with user data...");
    const pitchesWithUsers = await storage.getPitchesWithUserDataByOpportunityId(11);
    
    console.log(`\n📈 Found ${pitchesWithUsers.length} pitches with user data:`);
    
    if (pitchesWithUsers.length === 0) {
      console.log("❌ No pitches found with user data");
      return;
    }
    
    // Analyze each pitch
    pitchesWithUsers.forEach((pitch, index) => {
      console.log(`\n--- Pitch ${index + 1} ---`);
      console.log("ID:", pitch.id);
      console.log("User ID:", pitch.userId);
      console.log("Status:", pitch.status);
      console.log("Is Draft:", pitch.isDraft);
      console.log("Content (first 50 chars):", pitch.content?.substring(0, 50) + "...");
      
      // Check user data
      if (pitch.user) {
        console.log("👤 User Data:");
        console.log("  - Full Name:", pitch.user.fullName);
        console.log("  - Username:", pitch.user.username);
        console.log("  - Avatar:", pitch.user.avatar);
        console.log("  - Title:", pitch.user.title);
        console.log("  - Company:", pitch.user.company_name);
        
        // Check avatar availability
        if (pitch.user.avatar) {
          console.log("  ✅ Avatar path exists:", pitch.user.avatar);
        } else {
          console.log("  ❌ No avatar path");
        }
      } else {
        console.log("❌ No user data found for this pitch");
      }
      
      // Check direct user fields
      console.log("📋 Direct user fields:");
      console.log("  - userName:", pitch.userName);
      console.log("  - userUsername:", pitch.userUsername);
      console.log("  - userAvatar:", pitch.userAvatar);
      console.log("  - userTitle:", pitch.userTitle);
    });
    
    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`Total pitches: ${pitchesWithUsers.length}`);
    console.log(`Pitches with user.avatar: ${pitchesWithUsers.filter(p => p.user?.avatar).length}`);
    console.log(`Pitches with userAvatar: ${pitchesWithUsers.filter(p => p.userAvatar).length}`);
    console.log(`Draft pitches: ${pitchesWithUsers.filter(p => p.isDraft).length}`);
    console.log(`Non-draft pitches: ${pitchesWithUsers.filter(p => !p.isDraft).length}`);
    
    // Check specific user avatars
    console.log(`\n🖼️  Avatar paths found:`);
    const avatarPaths = pitchesWithUsers
      .map(p => p.user?.avatar || p.userAvatar)
      .filter(Boolean);
    
    if (avatarPaths.length > 0) {
      avatarPaths.forEach((path, index) => {
        console.log(`  ${index + 1}. ${path}`);
      });
    } else {
      console.log("  ❌ No avatar paths found");
    }
    
  } catch (error) {
    console.error("💥 Error during debug:", error);
  }
}

// Run the debug
debugPitches().then(() => {
  console.log("\n✅ Debug complete");
  process.exit(0);
}).catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
}); 