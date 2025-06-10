#!/usr/bin/env node

/**
 * QuoteBid Pricing Engine v2 - Step 9: Seed Email Click Boost Weight
 * 
 * Seeds the emailClickBoost weight configuration for pricing emails
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { pricing_config } from '../shared/schema.ts';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function seedEmailClickBoost() {
  console.log('🌱 Seeding emailClickBoost weight configuration...');
  
  try {
    // Seed the emailClickBoost weight with default value 0.05
    await db
      .insert(pricing_config)
      .values([
        { key: "emailClickBoost", value: 0.05 }
      ])
      .onConflictDoUpdate({
        target: pricing_config.key,
        set: { 
          value: 0.05,
          updated_at: new Date()
        }
      });

    console.log('✅ Successfully seeded emailClickBoost weight:');
    console.log('   📊 emailClickBoost: 0.05');
    console.log('   📧 This weight boosts prices when users click pricing emails');
    console.log('   🔄 Admin can adjust this value in the pricing controls');

  } catch (error) {
    console.error('❌ Error seeding emailClickBoost weight:', error);
    process.exit(1);
  }
}

// Run the seeding function
console.log('🚀 Starting email click boost seeding...');
await seedEmailClickBoost();
console.log('🎉 Email click boost seeding complete!');

export { seedEmailClickBoost }; 