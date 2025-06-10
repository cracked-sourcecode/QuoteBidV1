import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';

dotenv.config();

async function checkOpportunitiesSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('🔌 Connected to database');

    // Check the actual schema of opportunities table
    const schema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'opportunities'
      ORDER BY ordinal_position
    `;

    console.log(`\n📋 Opportunities table schema:`);
    schema.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Try to get a sample record to see actual data
    const sample = await sql`
      SELECT * FROM opportunities 
      LIMIT 1
    `;

    if (sample.length > 0) {
      console.log(`\n📊 Sample opportunity fields:`);
      Object.keys(sample[0]).forEach(key => {
        console.log(`  ${key}: ${sample[0][key]}`);
      });
    } else {
      console.log(`\n📊 No opportunities found in database`);
    }

    console.log('\n✅ Schema Check Complete');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOpportunitiesSchema(); 