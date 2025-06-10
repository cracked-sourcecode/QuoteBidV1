import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);

const configSchema = await sql`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'pricing_config' 
  ORDER BY ordinal_position
`;

console.log('pricing_config table columns:');
configSchema.forEach(col => {
  console.log(`  ${col.column_name}: ${col.data_type}`);
});

const variablesSchema = await sql`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'pricing_variables' 
  ORDER BY ordinal_position
`;

console.log('\npricing_variables table columns:');
variablesSchema.forEach(col => {
  console.log(`  ${col.column_name}: ${col.data_type}`);
}); 