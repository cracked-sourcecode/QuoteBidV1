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

const savedOpportunities = pgTable("saved_opportunities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  opportunityId: integer("opportunity_id").notNull(),
  createdAt: timestamp("created_at"),
});

const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
});

async function testWithRealSavedOpportunity() {
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
    db = drizzle(pool, { schema: { opportunities, publications, savedOpportunities, users } });
    
    console.log('📊 Querying for real saved opportunities...');
    
    // Get the latest saved opportunity with its opportunity and publication data
    const results = await db
      .select({
        savedId: savedOpportunities.id,
        userId: savedOpportunities.userId,
        savedAt: savedOpportunities.createdAt,
        opportunityId: opportunities.id,
        title: opportunities.title,
        description: opportunities.description,
        currentPrice: opportunities.current_price,
        deadline: opportunities.deadline,
        publicationName: publications.name,
        userName: users.fullName,
        userEmail: users.email,
      })
      .from(savedOpportunities)
      .leftJoin(opportunities, eq(savedOpportunities.opportunityId, opportunities.id))
      .leftJoin(publications, eq(opportunities.publicationId, publications.id))
      .leftJoin(users, eq(savedOpportunities.userId, users.id))
      .orderBy(desc(savedOpportunities.createdAt))
      .limit(1);
    
    if (results.length === 0) {
      console.log('❌ No saved opportunities found in database');
      console.log('Creating test data for demonstration...');
      
      // Use test data if no real saved opportunities exist
      var savedOpportunity = {
        opportunityId: 999,
        title: 'Test Banking Experts Needed for Fed Rate Analysis',
        description: 'Financial experts needed to provide commentary on Federal Reserve decisions',
        currentPrice: '285.00',
        publicationName: 'Bloomberg',
        userName: 'Ben Deveran'
      };
    } else {
      var savedOpportunity = results[0];
      console.log('✅ Found real saved opportunity:', {
        id: savedOpportunity.savedId,
        opportunityTitle: savedOpportunity.title,
        publication: savedOpportunity.publicationName,
        user: savedOpportunity.userName,
        savedAt: savedOpportunity.savedAt
      });
    }
    
    console.log('📧 Loading email template...');
    
    let emailHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/saved-opportunity-alert.html'), 'utf8');
    
    // Calculate price trend (simulate for demo)
    const basePrice = parseFloat(savedOpportunity.currentPrice) || 285;
    const priceTrend = Math.random() > 0.5 ? '+$' + Math.floor(Math.random() * 50 + 10) + ' up' : '-$' + Math.floor(Math.random() * 30 + 5) + ' down';
    const priceTrendClass = priceTrend.includes('+') ? 'price-trend-up' : 'price-trend-down';
    
    // Format deadline
    const deadlineDate = new Date(savedOpportunity.deadline);
    const now = new Date();
    const timeDiff = deadlineDate - now;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const bidDeadline = daysDiff > 0 ? `${daysDiff} days` : 'Less than 1 day';

    // Apply real data replacements
    const replacements = {
      '{{userFirstName}}': savedOpportunity.userName ? savedOpportunity.userName.split(' ')[0] : 'Ben',
      '{{opportunityTitle}}': savedOpportunity.title || 'Test Opportunity',
      '{{opportunityDescription}}': savedOpportunity.description || 'Expert commentary needed for breaking news story',
      '{{currentPrice}}': '$' + (savedOpportunity.currentPrice || '285'),
      '{{priceTrend}}': priceTrend,
      '{{priceTrendClass}}': priceTrendClass,
      '{{publicationType}}': savedOpportunity.publicationName || 'Unknown Publication',
      '{{bidDeadline}}': bidDeadline,
      '{{opportunityId}}': savedOpportunity.opportunityId.toString(),
      '{{frontendUrl}}': frontendUrl
    };
    
    console.log('🔄 Applying real data replacements:');
    Object.entries(replacements).forEach(([key, value]) => {
      console.log(`  ${key} = ${value}`);
      emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
    });
    
    console.log('📤 Sending email with REAL saved opportunity data...');
    
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'You saved this opportunity 6 hours ago, but haven\'t submitted your pitch yet',
      html: emailHtml,
    });
    
    console.log('🎉 SUCCESS! Real saved opportunity email sent:');
    console.log(`📧 Opportunity: ${savedOpportunity.title}`);
    console.log(`📰 Publication: ${savedOpportunity.publicationName}`);
    console.log(`💰 Current Price: $${savedOpportunity.currentPrice || '285'}`);
    console.log(`📈 Price Trend: ${priceTrend}`);
    console.log(`⏰ Deadline: ${bidDeadline}`);
    console.log(`👤 User: ${savedOpportunity.userName || 'Ben Deveran'}`);
    console.log(`🔗 Opportunity ID: ${savedOpportunity.opportunityId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Database connection closed');
    }
  }
}

testWithRealSavedOpportunity().catch(console.error); 