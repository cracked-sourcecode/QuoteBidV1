// Debug script to check opportunity email system status
import { getDb } from './server/db.js';
import { opportunities } from './server/db/schema.js';
import { eq, isNull, and, lt } from 'drizzle-orm';

async function debugEmailSystem() {
  console.log('🔍 DEBUGGING OPPORTUNITY EMAIL SYSTEM\n');
  
  try {
    const db = getDb();
    
    // 1. Check pending emails
    console.log('📧 CHECKING PENDING EMAILS...');
    const now = new Date();
    const pendingEmails = await db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        email_scheduled_at: opportunities.email_scheduled_at,
        email_sent_at: opportunities.email_sent_at,
        email_send_attempted: opportunities.email_send_attempted,
        industry: opportunities.industry,
        createdAt: opportunities.createdAt
      })
      .from(opportunities)
      .where(
        and(
          isNull(opportunities.email_sent_at),
          eq(opportunities.email_send_attempted, false)
        )
      )
      .orderBy(opportunities.createdAt);
    
    console.log(`Found ${pendingEmails.length} opportunities with pending emails:`);
    pendingEmails.forEach(opp => {
      const scheduled = opp.email_scheduled_at ? new Date(opp.email_scheduled_at) : null;
      const isPastDue = scheduled && scheduled < now;
      console.log(`  • ID ${opp.id}: "${opp.title}"`);
      console.log(`    📅 Scheduled: ${scheduled ? scheduled.toISOString() : 'NOT SCHEDULED'}`);
      console.log(`    ⏰ Status: ${isPastDue ? '🔴 PAST DUE' : '🟡 WAITING'}`);
      console.log(`    🏭 Industry: ${opp.industry || 'NONE'}`);
      console.log('');
    });
    
    // 2. Check sent emails
    console.log('✅ CHECKING SENT EMAILS...');
    const sentEmails = await db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        email_sent_at: opportunities.email_sent_at,
        industry: opportunities.industry
      })
      .from(opportunities)
      .where(isNull(opportunities.email_sent_at, false))
      .orderBy(opportunities.email_sent_at)
      .limit(10);
    
    console.log(`Last ${sentEmails.length} sent emails:`);
    sentEmails.forEach(opp => {
      console.log(`  • ID ${opp.id}: "${opp.title}" - Sent: ${new Date(opp.email_sent_at).toISOString()}`);
    });
    
    // 3. Check users by industry
    console.log('\n👥 CHECKING USER DISTRIBUTION BY INDUSTRY...');
    const { users } = await import('./server/db/schema.js');
    const usersByIndustry = await db
      .select({
        industry: users.industry,
        count: 'COUNT(*)'
      })
      .from(users)
      .where(isNull(users.industry, false))
      .groupBy(users.industry);
    
    console.log('Users by industry:');
    usersByIndustry.forEach(row => {
      console.log(`  • ${row.industry}: ${row.count} users`);
    });
    
    // 4. Environment check
    console.log('\n🔧 ENVIRONMENT CHECK...');
    console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ SET' : '❌ MISSING'}`);
    console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || 'Using default'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'Using default'}`);
    
  } catch (error) {
    console.error('❌ Error debugging email system:', error);
  }
}

async function testEmailNow() {
  console.log('\n🧪 TESTING EMAIL SEND NOW...');
  
  try {
    const response = await fetch('http://localhost:5051/api/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ben@rubiconprgroup.com', // Change this to your email
        type: 'OPPORTUNITY_ALERT',
        username: 'TestUser',
        fullName: 'Test User'
      })
    });
    
    const result = await response.json();
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
  }
}

// Run debugging
debugEmailSystem().then(() => {
  console.log('\n💡 QUICK TESTS:');
  console.log('1. Run: node debug-email-system.js');
  console.log('2. Create a test opportunity in admin panel');
  console.log('3. Check logs: tail -f server.log | grep -i email');
  console.log('4. Test immediate send: testEmailNow()');
}).catch(console.error); 