import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, desc } from 'drizzle-orm';
import ws from "ws";
import { pgTable, serial, integer, text, timestamp, numeric } from 'drizzle-orm/pg-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '.env') });

// Configure neon to use websockets
neonConfig.webSocketConstructor = ws;

const resend = new Resend(process.env.RESEND_API_KEY);
const frontendUrl = 'https://quotebid.co';
const emailTo = 'ben@rubiconprgroup.com';

// Define database schema
const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  publicationId: integer("publication_id").notNull(),
  title: text("title").notNull(),
  requestType: text("request_type").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(),
  deadline: timestamp("deadline"),
  current_price: numeric("current_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at"),
});

const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  website: text("website"),
  category: text("category"),
  tier: text("tier"),
});

async function testWithRealOpportunity() {
  let pool = null;
  let db = null;
  
  try {
    console.log('🔌 Connecting to database...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not found in environment");
    }
    
    // Create connection pool
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Create drizzle client
    db = drizzle(pool, { schema: { opportunities, publications } });
    
    console.log('📊 Querying for real opportunities...');
    
    // Get the latest open opportunity with publication
    const results = await db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        requestType: opportunities.requestType,
        description: opportunities.description,
        deadline: opportunities.deadline,
        currentPrice: opportunities.current_price,
        publicationName: publications.name,
        publicationTier: publications.tier,
      })
      .from(opportunities)
      .leftJoin(publications, eq(opportunities.publicationId, publications.id))
      .where(eq(opportunities.status, 'open'))
      .orderBy(desc(opportunities.createdAt))
      .limit(1);
    
    if (results.length === 0) {
      console.log('❌ No open opportunities found in database');
      return;
    }
    
    const opportunity = results[0];
    console.log('✅ Found real opportunity:', {
      id: opportunity.id,
      title: opportunity.title,
      publication: opportunity.publicationName,
      requestType: opportunity.requestType
    });
    
    console.log('📧 Loading email template...');
    
    let emailHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/new-opportunity-alert.html'), 'utf8');
    
    // Format deadline
    const deadlineDate = new Date(opportunity.deadline);
    const now = new Date();
    const timeDiff = deadlineDate - now;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const bidDeadline = daysDiff > 0 ? `${daysDiff} days` : 'Less than 1 day';
    
    // Apply real data replacements
    const replacements = {
      '{{userFirstName}}': 'Ben',
      '{{publicationType}}': opportunity.publicationName || 'Unknown Publication',
      '{{title}}': opportunity.title,
      '{{requestType}}': opportunity.requestType,
      '{{bidDeadline}}': bidDeadline,
      '{{opportunityId}}': opportunity.id.toString(),
      '{{frontendUrl}}': frontendUrl
    };
    
    console.log('🔄 Applying real data replacements:');
    Object.entries(replacements).forEach(([key, value]) => {
      console.log(`  ${key} = ${value}`);
      emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
    });
    
    console.log('📤 Sending email with REAL opportunity data...');
    
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: `New opportunity in ${opportunity.publicationName} has been added to QuoteBid`,
      html: emailHtml,
    });
    
    console.log('🎉 SUCCESS! Real opportunity email sent:');
    console.log(`📧 Story Topic: ${opportunity.title}`);
    console.log(`📰 Media Outlet: ${opportunity.publicationName}`);
    console.log(`🎯 What They Need: ${opportunity.requestType}`);
    console.log(`⏰ Deadline: ${bidDeadline}`);
    console.log(`🔗 Opportunity ID: ${opportunity.id}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

testWithRealOpportunity().catch(console.error); 