import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';

dotenv.config();

async function checkQAEnvironment() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('🔌 Connected to database');

    // Check current opportunities (using correct column names)
    const opportunities = await sql`
      SELECT o.id, o.title, o.tier, o.current_price, o.deadline, p.name as outlet,
             o.meta, o.last_drift_at, o.created_at, o.status
      FROM opportunities o
      JOIN publications p ON o.publication_id = p.id
      WHERE o.deadline > NOW()
      ORDER BY o.created_at DESC
      LIMIT 10
    `;

    console.log(`\n📊 Found ${opportunities.length} active opportunities:`);
    opportunities.forEach(opp => {
      const price = opp.current_price ? `$${opp.current_price}` : 'No price set';
      console.log(`  ${opp.id}: ${opp.title} - ${price} (${opp.tier})`);
      console.log(`    Outlet: ${opp.outlet}, Status: ${opp.status}`);
      console.log(`    Deadline: ${new Date(opp.deadline).toLocaleDateString()}`);
      console.log(`    Meta: ${opp.meta ? 'Has data' : 'Empty'}, Last drift: ${opp.last_drift_at || 'Never'}`);
      console.log('');
    });

    // Check v2 configuration keys (using correct column names)
    const v2Config = await sql`
      SELECT key, value 
      FROM pricing_config 
      WHERE key IN ('conversionPenalty', 'pitchVelocityBoost', 'outletLoadPenalty', 'ambient.triggerMins', 'ambient.cooldownMins')
      ORDER BY key
    `;

    console.log(`🔧 V2 Configuration Keys (${v2Config.length} found):`);
    v2Config.forEach(config => {
      console.log(`  ${config.key}: ${config.value}`);
    });

    // Check general pricing configuration
    const generalConfig = await sql`
      SELECT key, value 
      FROM pricing_config 
      WHERE key IN ('priceStep', 'tickIntervalMs')
      ORDER BY key
    `;

    console.log(`\n⚙️  General Pricing Config:`);
    generalConfig.forEach(config => {
      console.log(`  ${config.key}: ${config.value}`);
    });

    // Check users for testing
    const users = await sql`
      SELECT id, email, role 
      FROM users 
      WHERE role IN ('user', 'admin')
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log(`\n👥 Test Users Available (${users.length} found):`);
    users.forEach(user => {
      console.log(`  ID ${user.id}: ${user.email} (${user.role})`);
    });

    // Check publications for outlet overload testing
    const publications = await sql`
      SELECT id, name, COUNT(o.id) as open_opportunities
      FROM publications p
      LEFT JOIN opportunities o ON p.id = o.publication_id AND o.status = 'open' AND o.deadline > NOW()
      GROUP BY p.id, p.name
      ORDER BY open_opportunities DESC
      LIMIT 5
    `;

    console.log(`\n📰 Publications with active opportunities:`);
    publications.forEach(pub => {
      console.log(`  ${pub.name}: ${pub.open_opportunities} open opportunities`);
    });

    console.log('\n✅ QA Environment Check Complete');
    console.log('\n🎯 Ready for QA Matrix Testing');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkQAEnvironment(); 