import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';

dotenv.config();

async function trackScenarioProgress() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);

  // Scenario target opportunities
  const scenarioTargets = [24, 16, 22]; // ID 24 for Scenario A, others for later scenarios
  
  while (true) {
    try {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`\n🕐 [${timestamp}] QA Scenario Progress Check`);
      console.log('='.repeat(50));
      
      // Get current status of target opportunities
      const opportunities = await sql`
        SELECT 
          o.id, 
          o.title, 
          o.current_price,
          p.name as outlet,
          o.meta,
          o.last_drift_at,
          EXTRACT(EPOCH FROM (o.deadline - NOW()))/3600 as hours_remaining
        FROM opportunities o
        JOIN publications p ON o.publication_id = p.id
        WHERE o.id = ANY(${scenarioTargets})
        AND o.deadline > NOW()
        ORDER BY o.id
      `;

      opportunities.forEach(opp => {
        const metaScore = opp.meta?.score || 'null';
        const driftApplied = opp.meta?.driftApplied || false;
        
        console.log(`\n📊 ID ${opp.id}: ${opp.title.substring(0, 40)}...`);
        console.log(`   💰 Price: $${opp.current_price} | ${opp.outlet}`);
        console.log(`   📈 Meta Score: ${metaScore}`);
        console.log(`   🌊 Drift Applied: ${driftApplied}`);
        console.log(`   ⏱️  Hours Remaining: ${Number(opp.hours_remaining).toFixed(1)}`);
        
        // Scenario-specific alerts
        if (opp.id === 24) {
          console.log(`   🔴 SCENARIO A: Dead opportunity - monitoring decay`);
        }
      });
      
      // Wait 2 minutes for next check (matching worker tick interval)
      console.log(`\n⏳ Waiting 2 minutes for next check...`);
      await new Promise(resolve => setTimeout(resolve, 120000));
      
    } catch (error) {
      console.error('❌ Error tracking scenario progress:', error);
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s on error
    }
  }
}

trackScenarioProgress(); 