import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';

dotenv.config();

async function monitorOpportunities() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('🎯 QA Scenario Monitoring - Current Opportunities Status');
    console.log('='.repeat(60));
    
    // Get current opportunities with their key stats
    const opportunities = await sql`
      SELECT 
        o.id, 
        o.title, 
        o.current_price,
        o.deadline,
        p.name as outlet,
        o.meta,
        o.last_drift_at,
        o.tier,
        o.status,
        EXTRACT(EPOCH FROM (o.deadline - NOW()))/3600 as hours_remaining
      FROM opportunities o
      JOIN publications p ON o.publication_id = p.id
      WHERE o.deadline > NOW()
      ORDER BY o.current_price DESC
    `;

    console.log(`\n📊 Found ${opportunities.length} active opportunities:\n`);
    
    opportunities.forEach(opp => {
      const metaStr = opp.meta ? JSON.stringify(opp.meta) : 'null';
      console.log(`ID ${opp.id}: ${opp.title.substring(0, 30)}...`);
      console.log(`  💰 Price: $${opp.current_price} | Tier: ${opp.tier} | ${opp.outlet}`);
      console.log(`  ⏱️  Hours left: ${Number(opp.hours_remaining).toFixed(1)}`);
      console.log(`  📈 Meta: ${metaStr}`);
      console.log(`  🕐 Last drift: ${opp.last_drift_at || 'never'}`);
      console.log('');
    });

    // Scenario targets
    console.log('\n🎯 QA Scenario Target Opportunities:');
    console.log('Scenario A (Dead opp): ID 19 - S&P Targets (Forbes)');
    console.log('Scenario B (Burst): ID 16 or 17 - Bitcoin ETF or similar');  
    console.log('Scenario C (Drift): ID 16 - Bitcoin ETF (after burst)');
    console.log('Scenario D (Outlet load): Investopedia opportunities vs Forbes control');
    
  } catch (error) {
    console.error('❌ Error monitoring opportunities:', error);
  }
}

monitorOpportunities(); 