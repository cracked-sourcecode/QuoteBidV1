import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTables() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('📋 Checking available database tables...');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log(`\n🗄️ Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Check for tables that might contain clicks or interactions
    console.log('\n🔍 Looking for interaction-related tables...');
    const interactionTables = tables.filter(t => 
      t.table_name.includes('click') || 
      t.table_name.includes('interaction') ||
      t.table_name.includes('save') ||
      t.table_name.includes('view')
    );
    
    if (interactionTables.length > 0) {
      console.log('Found interaction tables:');
      interactionTables.forEach(table => {
        console.log(`  ✅ ${table.table_name}`);
      });
    } else {
      console.log('❌ No obvious interaction tables found');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

checkTables(); 