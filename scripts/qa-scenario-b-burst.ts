import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';

dotenv.config();

async function executeBurstScenario() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);
  
  // Target opportunity for burst test (ID 16 - Crypto Experts, Yahoo Finance, $491)
  const targetOppId = 16;
  const testUserId = 99; // Using existing user ID from logs
  
  try {
    console.log('🚀 Executing Scenario B: Burst Bids Test');
    console.log('='.repeat(50));
    
    // Check baseline price before test
    const beforeOpp = await sql`
      SELECT o.id, o.title, o.current_price, p.name as outlet
      FROM opportunities o
      JOIN publications p ON o.publication_id = p.id  
      WHERE o.id = ${targetOppId}
    `;
    
    if (beforeOpp.length === 0) {
      console.log(`❌ Opportunity ${targetOppId} not found`);
      return;
    }
    
    const baseline = beforeOpp[0];
    console.log(`📊 Baseline: ID ${baseline.id} - $${baseline.current_price} (${baseline.outlet})`);
    console.log(`📋 Title: ${baseline.title}`);
    
    // Send 3 pitches in rapid succession
    console.log('\n🎯 Sending 3 rapid pitches...');
    
    for (let i = 1; i <= 3; i++) {
      const pitchContent = `QA Test Pitch #${i} - ${new Date().toISOString()}`;
      
      console.log(`📝 Pitch ${i}: Inserting into database...`);
      
      // Insert pitch directly into database
      await sql`
        INSERT INTO pitches (opportunity_id, user_id, content, status, created_at)
        VALUES (${targetOppId}, ${testUserId}, ${pitchContent}, 'pending', NOW())
      `;
      
      console.log(`✅ Pitch ${i} inserted successfully`);
      
      // Small delay between pitches (1 second)
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n✅ Burst complete! 3 pitches sent in ~2 seconds');
    console.log('📊 Monitor pricing engine logs for the next 3 cycles (6 minutes)');
    console.log('🎯 Expected: Price increases ≤ $30 per tick, ceiling respected');
    
    // Wait a moment and check current price
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const afterOpp = await sql`
      SELECT o.id, o.current_price, o.meta
      FROM opportunities o
      WHERE o.id = ${targetOppId}
    `;
    
    if (afterOpp.length > 0) {
      console.log(`\n💰 Current price: $${afterOpp[0].current_price}`);
      console.log(`📈 Meta: ${JSON.stringify(afterOpp[0].meta)}`);
    }
    
  } catch (error) {
    console.error('❌ Error executing burst scenario:', error);
  }
}

// Execute the function
executeBurstScenario(); 