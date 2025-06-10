#!/usr/bin/env node

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const connection = neon(DATABASE_URL);
const db = drizzle(connection);

async function createEmailClicksTable() {
  console.log('🔨 Creating email_clicks table...');
  
  try {
    // Create the table
    await db.execute(sql`
      CREATE TABLE "email_clicks" (
        "id" serial PRIMARY KEY NOT NULL,
        "opportunity_id" integer NOT NULL,
        "clicked_at" timestamp NOT NULL
      );
    `);
    
    console.log('✅ Table email_clicks created successfully');
    
    // Add foreign key constraint
    await db.execute(sql`
      ALTER TABLE "email_clicks" 
      ADD CONSTRAINT "email_clicks_opportunity_id_opportunities_id_fk" 
      FOREIGN KEY ("opportunity_id") 
      REFERENCES "public"."opportunities"("id") 
      ON DELETE cascade ON UPDATE no action;
    `);
    
    console.log('✅ Foreign key constraint added successfully');
    console.log('🎉 email_clicks table setup complete!');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️ Table already exists, skipping creation');
    } else {
      console.error('❌ Error creating table:', error);
      throw error;
    }
  }
}

await createEmailClicksTable(); 