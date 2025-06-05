import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTestPlacements() {
  try {
    console.log("🔧 Creating test placement data...");
    
    // First, let's see what users exist
    const usersResult = await pool.query("SELECT id, full_name, email FROM users LIMIT 5");
    console.log("📋 Found users:", usersResult.rows);
    
    if (usersResult.rows.length === 0) {
      console.log("❌ No users found. Please create some users first.");
      return;
    }
    
    // Create test placements
    const testPlacements = [
      {
        userId: usersResult.rows[0].id,
        articleTitle: "Yahoo Finance Article Coverage",
        amount: 1500,
        status: "ready_for_billing"
      },
      {
        userId: usersResult.rows[0].id,
        articleTitle: "TechCrunch Media Placement",
        amount: 2500,
        status: "ready_for_billing"
      }
    ];
    
    for (let placement of testPlacements) {
      const result = await pool.query(`
        INSERT INTO placements (
          pitch_id, user_id, opportunity_id, publication_id, 
          amount, status, article_title, created_at
        ) VALUES (1, $1, 1, 1, $2, $3, $4, NOW())
        RETURNING id, article_title, amount, status
      `, [placement.userId, placement.amount, placement.status, placement.articleTitle]);
      
      console.log("✅ Created placement:", result.rows[0]);
    }
    
    console.log("🎉 Test placements created successfully!");
    
  } catch (error) {
    console.error("❌ Error creating test placements:", error);
  } finally {
    await pool.end();
  }
}

createTestPlacements(); 