import { db } from './server/db.ts';

console.log('🔍 Verifying email scheduling fixes...\n');

async function verifyEmailScheduling() {
  try {
    // Test 1: Check recent opportunities and their email scheduling status
    console.log('📊 Test 1: Checking recent opportunities...');
    const recentOpportunities = await db.execute(`
      SELECT 
        id, 
        title, 
        created_at, 
        email_scheduled_at, 
        email_sent_at, 
        email_send_attempted 
      FROM opportunities 
      WHERE created_at >= datetime('now', '-24 hours')
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log(`Found ${recentOpportunities.length} opportunities from last 24 hours:`);
    
    recentOpportunities.forEach((opp, index) => {
      console.log(`${index + 1}. ID: ${opp.id} - "${opp.title.substring(0, 40)}..."`);
      console.log(`   Created: ${opp.created_at}`);
      console.log(`   Email Scheduled: ${opp.email_scheduled_at || '❌ NULL'}`);
      console.log(`   Email Sent: ${opp.email_sent_at || '❌ NULL'}`);
      console.log(`   Send Attempted: ${opp.email_send_attempted || '❌ NULL'}`);
      console.log('');
    });

    // Test 2: Check for fail-safe opportunities (older than 10 min with no scheduling)
    console.log('🚨 Test 2: Checking for fail-safe opportunities...');
    const failSafeOpportunities = await db.execute(`
      SELECT 
        id, 
        title, 
        created_at,
        email_scheduled_at,
        email_sent_at
      FROM opportunities 
      WHERE email_scheduled_at IS NULL 
        AND email_sent_at IS NULL 
        AND created_at <= datetime('now', '-10 minutes')
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log(`Found ${failSafeOpportunities.length} opportunities that should be caught by fail-safe:`);
    failSafeOpportunities.forEach((opp, index) => {
      console.log(`${index + 1}. ID: ${opp.id} - "${opp.title.substring(0, 40)}..."`);
      console.log(`   Created: ${opp.created_at} (never scheduled)`);
    });

    // Test 3: Check email scheduling configuration
    console.log('\n⚙️ Test 3: Checking email delay configuration...');
    const { computeEmailDelay } = await import('./server/jobs/emailScheduler.ts');
    const delayMinutes = computeEmailDelay();
    console.log(`Email delay: ${delayMinutes} minutes (${process.env.NODE_ENV === 'development' ? 'development' : 'production'} mode)`);

    // Test 4: Check database indexes
    console.log('\n📈 Test 4: Checking database indexes...');
    const indexes = await db.execute(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type = 'index' 
        AND name LIKE '%email%' 
        AND sql IS NOT NULL
    `);

    console.log(`Found ${indexes.length} email-related indexes:`);
    indexes.forEach((idx, index) => {
      console.log(`${index + 1}. ${idx.name}`);
    });

    // Summary
    console.log('\n📋 Summary:');
    const scheduledCount = recentOpportunities.filter(opp => opp.email_scheduled_at).length;
    const sentCount = recentOpportunities.filter(opp => opp.email_sent_at).length;
    const totalRecent = recentOpportunities.length;
    
    if (totalRecent > 0) {
      console.log(`✅ Recent opportunities: ${totalRecent}`);
      console.log(`📅 Email scheduled: ${scheduledCount} (${Math.round(scheduledCount/totalRecent*100)}%)`);
      console.log(`📧 Email sent: ${sentCount} (${Math.round(sentCount/totalRecent*100)}%)`);
    } else {
      console.log('ℹ️  No recent opportunities found');
    }

    if (failSafeOpportunities.length > 0) {
      console.log(`⚠️  ${failSafeOpportunities.length} opportunities need fail-safe handling`);
    } else {
      console.log('✅ No opportunities need fail-safe handling');
    }

    console.log(`⏱️  Email delay: ${delayMinutes} minutes`);
    console.log(`🔍 Database indexes: ${indexes.length} created`);

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  }
}

// Run verification
verifyEmailScheduling()
  .then(() => {
    console.log('\n✅ Email scheduling verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }); 