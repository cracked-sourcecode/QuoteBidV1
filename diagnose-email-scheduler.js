#!/usr/bin/env node
// Diagnose Email Scheduler - Check what's happening with opportunity emails

const { sql } = require('drizzle-orm');

async function diagnoseEmailScheduler() {
  console.log('🔍 DIAGNOSING EMAIL SCHEDULER SYSTEM\n');
  
  try {
    // Import database setup
    const { getDb } = await import('./server/db.js');
    const db = getDb();
    
    console.log('✅ Database connected\n');
    
    // 1. Check recent opportunities and their email status
    console.log('📊 RECENT OPPORTUNITIES & EMAIL STATUS:');
    const recentOpps = await db.execute(sql`
      SELECT 
        id, 
        title, 
        industry,
        created_at,
        email_scheduled_at,
        email_sent_at,
        email_send_attempted,
        CASE 
          WHEN email_sent_at IS NOT NULL THEN '✅ SENT'
          WHEN email_send_attempted = true AND email_sent_at IS NULL THEN '❌ FAILED'
          WHEN email_scheduled_at IS NOT NULL AND email_scheduled_at < NOW() THEN '🔴 OVERDUE'
          WHEN email_scheduled_at IS NOT NULL THEN '⏰ SCHEDULED'
          ELSE '❓ NOT SCHEDULED'
        END as status
      FROM opportunities 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    recentOpps.rows.forEach(opp => {
      console.log(`  ${opp.status} ID ${opp.id}: "${opp.title}"`);
      console.log(`    🏭 Industry: ${opp.industry || 'NONE'}`);
      console.log(`    📅 Created: ${new Date(opp.created_at).toLocaleString()}`);
      if (opp.email_scheduled_at) {
        console.log(`    ⏰ Scheduled: ${new Date(opp.email_scheduled_at).toLocaleString()}`);
      }
      if (opp.email_sent_at) {
        console.log(`    ✅ Sent: ${new Date(opp.email_sent_at).toLocaleString()}`);
      }
      console.log('');
    });
    
    // 2. Check overdue emails
    console.log('🔴 OVERDUE EMAILS (should have been sent):');
    const overdueEmails = await db.execute(sql`
      SELECT id, title, industry, email_scheduled_at
      FROM opportunities 
      WHERE email_scheduled_at < NOW() 
        AND email_sent_at IS NULL 
        AND email_send_attempted = false
      ORDER BY email_scheduled_at
    `);
    
    if (overdueEmails.rows.length === 0) {
      console.log('  ✅ No overdue emails found\n');
    } else {
      overdueEmails.rows.forEach(opp => {
        const scheduled = new Date(opp.email_scheduled_at);
        const minsOverdue = Math.floor((Date.now() - scheduled.getTime()) / 60000);
        console.log(`  🔴 ID ${opp.id}: "${opp.title}" - ${minsOverdue} minutes overdue`);
        console.log(`    🏭 Industry: ${opp.industry || 'NONE'}`);
        console.log(`    ⏰ Should have sent: ${scheduled.toLocaleString()}`);
      });
      console.log('');
    }
    
    // 3. Check users by industry
    console.log('👥 USERS BY INDUSTRY:');
    const usersByIndustry = await db.execute(sql`
      SELECT 
        industry, 
        COUNT(*) as user_count,
        COUNT(CASE WHEN email_preferences IS NULL OR 
                       JSON_EXTRACT(email_preferences, '$.alerts') != false 
                   THEN 1 END) as alerts_enabled
      FROM users 
      WHERE industry IS NOT NULL AND industry != ''
      GROUP BY industry 
      ORDER BY user_count DESC
    `);
    
    if (usersByIndustry.rows.length === 0) {
      console.log('  ❌ NO USERS HAVE INDUSTRIES SET!');
      console.log('  This is why emails aren\'t being sent.\n');
    } else {
      usersByIndustry.rows.forEach(row => {
        console.log(`  • ${row.industry}: ${row.user_count} users (${row.alerts_enabled} want alerts)`);
      });
      console.log('');
    }
    
    // 4. Check email scheduler status
    console.log('🔧 EMAIL SCHEDULER STATUS:');
    console.log(`  • NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`  • RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ SET (' + process.env.RESEND_API_KEY.substring(0, 8) + '...)' : '❌ MISSING'}`);
    console.log(`  • EMAIL_FROM: ${process.env.EMAIL_FROM || 'Using default'}`);
    
    // 5. Test if scheduler is running by checking recent activity
    console.log('\n📊 SUMMARY:');
    const hasOverdue = overdueEmails.rows.length > 0;
    const hasUsers = usersByIndustry.rows.length > 0;
    const hasRecentOpps = recentOpps.rows.length > 0;
    
    if (hasOverdue) {
      console.log('🔴 ISSUE: Overdue emails found - scheduler may not be running');
    }
    if (!hasUsers) {
      console.log('🔴 ISSUE: No users have industries set - no emails will be sent');
    }
    if (hasRecentOpps && !hasOverdue && hasUsers) {
      console.log('✅ Email system appears healthy');
    }
    
  } catch (error) {
    console.error('❌ Error diagnosing email scheduler:', error);
    console.log('\n🔧 Make sure:');
    console.log('1. Database is accessible');
    console.log('2. Server is running');
    console.log('3. Environment variables are set');
  }
}

// Run diagnosis
diagnoseEmailScheduler(); 