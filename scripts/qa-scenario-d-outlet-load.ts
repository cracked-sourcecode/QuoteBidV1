import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';

dotenv.config();

async function executeOutletLoadScenario() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);
  const testUserId = 99; // Using existing user ID
  
  try {
    console.log('🏭 Executing Scenario D: Outlet Overload Test');
    console.log('='.repeat(50));
    
    // Get Investopedia opportunities (target outlet)
    const investopediaOpps = await sql`
      SELECT o.id, o.title, o.current_price, p.name as outlet
      FROM opportunities o
      JOIN publications p ON o.publication_id = p.id  
      WHERE p.name = 'Investopedia'
      AND o.deadline > NOW()
      ORDER BY o.id
    `;
    
    // Get control outlets (non-Investopedia) for comparison
    const controlOpps = await sql`
      SELECT o.id, o.title, o.current_price, p.name as outlet
      FROM opportunities o
      JOIN publications p ON o.publication_id = p.id  
      WHERE p.name != 'Investopedia'
      AND o.deadline > NOW()
      ORDER BY o.current_price DESC
      LIMIT 3
    `;
    
    console.log(`\n📊 Found ${investopediaOpps.length} Investopedia opportunities to load`);
    console.log(`📊 Found ${controlOpps.length} control opportunities for comparison`);
    
    console.log('\n🎯 Baseline Prices:');
    console.log('INVESTOPEDIA (Target):');
    investopediaOpps.forEach(opp => {
      console.log(`  ID ${opp.id}: $${opp.current_price} - ${opp.title.substring(0, 40)}...`);
    });
    
    console.log('\nCONTROL OUTLETS:');
    controlOpps.forEach(opp => {
      console.log(`  ID ${opp.id}: $${opp.current_price} (${opp.outlet}) - ${opp.title.substring(0, 30)}...`);
    });
    
    // Add saves to all Investopedia opportunities to create outlet load
    console.log('\n💾 Adding saves to saturate Investopedia outlet...');
    
    for (const opp of investopediaOpps) {
      console.log(`📝 Adding save to ID ${opp.id}...`);
      
      // Insert save record (simple insert)
      await sql`
        INSERT INTO saved_opportunities (user_id, opportunity_id, created_at)
        VALUES (${testUserId}, ${opp.id}, NOW())
      `;
      
      console.log(`✅ Save added to ID ${opp.id}`);
      
      // Small delay between saves
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n✅ Outlet loading complete! Added saves to ${investopediaOpps.length} Investopedia opportunities`);
    console.log('📊 Monitor pricing engine for next 2-3 cycles (6 minutes)');
    console.log('🎯 Expected: Investopedia prices ~10-15% lower than controls due to outletLoadPenalty');
    
    console.log('\n📈 Summary for comparison:');
    console.log('Target effect: Investopedia outlets should show price reduction vs controls');
    console.log('Look for: meta.outletLoadPenalty in opportunity metadata');
    
  } catch (error) {
    console.error('❌ Error executing outlet load scenario:', error);
  }
}

executeOutletLoadScenario(); 