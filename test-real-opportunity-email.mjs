import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file directly
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

const resend = new Resend(process.env.RESEND_API_KEY);
const frontendUrl = 'https://quotebid.co';
const emailTo = 'ben@rubiconprgroup.com';

// Database connection
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

// Database schema imports
import { pgTable, serial, integer, text, timestamp, numeric, jsonb, bigint } from 'drizzle-orm/pg-core';

// Define the tables we need
const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  publicationId: integer("publication_id").notNull(),
  title: text("title").notNull(),
  requestType: text("request_type").notNull(),
  mediaType: text("media_type"),
  description: text("description").notNull(),
  status: text("status").notNull(),
  tier: text("tier"),
  industry: text("industry"),
  tags: text("tags").array(),
  deadline: timestamp("deadline"),
  minimumBid: integer("minimum_bid"),
  current_price: numeric("current_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at"),
});

const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  type: text("type")
});

async function testRealOpportunityEmail() {
  try {
    console.log('Fetching real opportunity from database...');
    
    // Get the latest open opportunity with its publication
    const results = await db
      .select({
        // Opportunity fields
        id: opportunities.id,
        title: opportunities.title,
        requestType: opportunities.requestType,
        description: opportunities.description,
        deadline: opportunities.deadline,
        currentPrice: opportunities.current_price,
        minimumBid: opportunities.minimumBid,
        industry: opportunities.industry,
        // Publication fields
        publicationName: publications.name,
        publicationType: publications.type,
      })
      .from(opportunities)
      .leftJoin(publications, eq(opportunities.publicationId, publications.id))
      .where(eq(opportunities.status, 'open'))
      .limit(1);

    if (results.length === 0) {
      console.log('No open opportunities found, creating test data...');
      
      // Use test data if no real opportunities exist
      var opportunity = {
        id: 999,
        title: 'Test Fintech Innovation Expert Needed',
        requestType: 'Expert quotes and insights',
        description: 'Looking for fintech experts to comment on new banking regulations',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        currentPrice: 285.00,
        minimumBid: 250,
        industry: 'Finance',
        publicationName: 'Bloomberg',
        publicationType: 'News'
      };
    } else {
      var opportunity = results[0];
      console.log('Found opportunity:', opportunity);
    }
    
    console.log('Loading email template...');
    
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
      '{{publicationType}}': opportunity.publicationName || 'Bloomberg',
      '{{title}}': opportunity.title || 'Test Opportunity',
      '{{requestType}}': opportunity.requestType || 'Expert quotes and insights',
      '{{bidDeadline}}': bidDeadline,
      '{{opportunityId}}': opportunity.id.toString(),
      '{{frontendUrl}}': frontendUrl
    };
    
    console.log('Applying replacements:', replacements);
    
    Object.entries(replacements).forEach(([key, value]) => {
      emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
    });
    
    console.log('Sending email...');
    
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: `New opportunity in ${opportunity.publicationName || 'Bloomberg'} has been added to QuoteBid`,
      html: emailHtml,
    });
    
    console.log('✅ Test email sent successfully with real opportunity data!');
    console.log(`📧 Opportunity: ${opportunity.title}`);
    console.log(`📰 Publication: ${opportunity.publicationName || 'Bloomberg'}`);
    console.log(`🎯 Request Type: ${opportunity.requestType || 'Expert quotes and insights'}`);
    console.log(`⏰ Deadline: ${bidDeadline}`);
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  } finally {
    await client.end();
  }
}

testRealOpportunityEmail().catch(console.error); 