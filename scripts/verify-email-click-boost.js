#!/usr/bin/env node

/**
 * QuoteBid Pricing Engine v2 - Step 9: Verify Email Click Boost Configuration
 * 
 * Verifies that the emailClickBoost weight was successfully seeded
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { pricing_config } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function verifyEmailClickBoost() {
  console.log('🔍 Verifying emailClickBoost configuration...');
  
  try {
    // Check if emailClickBoost exists in database
    const result = await db
      .select()
      .from(pricing_config)
      .where(eq(pricing_config.key, 'emailClickBoost'))
      .limit(1);

    if (result.length > 0) {
      console.log('✅ EmailClickBoost configuration found:');
      console.log(`   📊 Key: ${result[0].key}`);
      console.log(`   📊 Value: ${result[0].value}`);
      console.log(`   📊 Updated: ${result[0].updated_at}`);
      console.log('🎉 Step 9 email click boost verification: PASSED');
    } else {
      console.log('❌ EmailClickBoost configuration NOT found');
      console.log('💡 Run: npx tsx scripts/seed-email-click-boost.js');
      console.log('📊 Step 9 verification: FAILED');
    }

    // Also show all current config for reference
    console.log('\n📋 All current pricing configuration:');
    const allConfig = await db.select().from(pricing_config);
    allConfig.forEach(config => {
      console.log(`   • ${config.key}: ${config.value}`);
    });

  } catch (error) {
    console.error('❌ Error verifying emailClickBoost configuration:', error);
    process.exit(1);
  }
}

// Run verification
console.log('🚀 Starting emailClickBoost verification...');
await verifyEmailClickBoost();
console.log('🏁 Verification complete!'); 