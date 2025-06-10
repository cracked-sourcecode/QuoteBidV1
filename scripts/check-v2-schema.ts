import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAndFixV2Schema() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('🔌 Connected to database');

    // Check if meta column exists
    const metaCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'opportunities' 
      AND column_name = 'meta'
    `;

    // Check if last_drift_at column exists
    const driftCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'opportunities' 
      AND column_name = 'last_drift_at'
    `;

    console.log(`📊 Meta column exists: ${metaCheck.length > 0}`);
    console.log(`📊 Last drift at column exists: ${driftCheck.length > 0}`);

    // Add meta column if missing
    if (metaCheck.length === 0) {
      console.log('➕ Adding meta column...');
      await sql`ALTER TABLE opportunities ADD COLUMN meta jsonb`;
      console.log('✅ Meta column added');
    }

    // Add last_drift_at column if missing
    if (driftCheck.length === 0) {
      console.log('➕ Adding last_drift_at column...');
      await sql`ALTER TABLE opportunities ADD COLUMN last_drift_at bigint`;
      console.log('✅ Last drift at column added');
    }

    // Verify the schema
    const finalCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'opportunities' 
      AND column_name IN ('meta', 'last_drift_at')
      ORDER BY column_name
    `;

    console.log('\n🔍 Final schema check:');
    finalCheck.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ V2 schema check complete');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndFixV2Schema(); 