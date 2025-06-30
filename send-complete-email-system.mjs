#!/usr/bin/env node

import { Resend } from 'resend';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FRONTEND_URL = 'http://localhost:5050';
const TO_EMAIL = 'ben@rubiconprgroup.com';

console.log('🚀 Starting Complete Email System Test to ben@rubiconprgroup.com');
console.log('📧 Using FRONTEND_URL:', FRONTEND_URL);
console.log('📬 Sending to:', TO_EMAIL);

// All email templates organized by category
const emailTemplates = {
  'UTILITY': [
    'welcome',
    'password-reset'
  ],
  'ALERTS': [
    'new-opportunity-alert',
    'saved-opportunity-alert'
  ],
  'NOTIFICATIONS': [
    'draft-reminder',
    'pitch-sent',
    'pitch-submitted',
    'pitch-interested',
    'pitch-rejected',
    'article-published'
  ],
  'BILLING': [
    'billing-confirmation'
  ]
};

async function fetchEmailTemplate(templateName) {
  try {
    console.log(`📥 Fetching ${templateName}...`);
    const response = await fetch(`${FRONTEND_URL}/api/email-preview/${templateName}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`✅ ${templateName} fetched successfully (${html.length} chars)`);
    return html;
  } catch (error) {
    console.error(`❌ Failed to fetch ${templateName}:`, error.message);
    throw error;
  }
}

async function sendEmail(templateName, category, html) {
  try {
    const subject = `🎯 QuoteBid ${category}: ${templateName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Template`;
    
    console.log(`📤 Sending ${templateName}...`);
    
    const result = await resend.emails.send({
      from: 'QuoteBid <no-reply@quotebid.co>',
      to: [TO_EMAIL],
      subject: subject,
      html: html,
    });

    console.log(`✅ ${templateName} sent successfully! ID: ${result.data?.id || 'unknown'}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send ${templateName}:`, error.message);
    throw error;
  }
}

async function sendAllEmails() {
  const results = [];
  let totalSent = 0;
  let totalFailed = 0;

  console.log('\n🎯 ===== COMPLETE EMAIL SYSTEM TEST =====');
  console.log('📊 Total templates to send: 11');
  console.log('📧 Recipient: ben@rubiconprgroup.com\n');

  for (const [category, templates] of Object.entries(emailTemplates)) {
    console.log(`\n📁 === ${category} EMAILS ===`);
    
    for (const templateName of templates) {
      try {
        // Add delay between requests to avoid rate limiting
        if (totalSent > 0) {
          console.log('⏱️  Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const html = await fetchEmailTemplate(templateName);
        const result = await sendEmail(templateName, category, html);
        
        results.push({
          template: templateName,
          category: category,
          status: 'success',
          id: result.data?.id
        });
        
        totalSent++;
        console.log(`🎉 ${templateName} completed! (${totalSent}/11)`);
        
      } catch (error) {
        console.error(`💥 ${templateName} failed:`, error.message);
        results.push({
          template: templateName,
          category: category,
          status: 'failed',
          error: error.message
        });
        totalFailed++;
      }
    }
  }

  // Final summary
  console.log('\n🏁 ===== FINAL RESULTS =====');
  console.log(`✅ Successfully sent: ${totalSent}/11`);
  console.log(`❌ Failed: ${totalFailed}/11`);
  console.log(`📧 All emails sent to: ${TO_EMAIL}\n`);

  // Detailed results
  console.log('📋 DETAILED RESULTS:');
  results.forEach(result => {
    const status = result.status === 'success' ? '✅' : '❌';
    const details = result.status === 'success' ? `ID: ${result.id}` : `Error: ${result.error}`;
    console.log(`${status} [${result.category}] ${result.template} - ${details}`);
  });

  if (totalSent === 11) {
    console.log('\n🎯 🎉 ALL 11 EMAIL TEMPLATES SENT SUCCESSFULLY! 🎉');
    console.log('📬 Check ben@rubiconprgroup.com inbox for the complete email system');
    console.log('🔥 Email system with click tracking is ready for production!');
  } else {
    console.log(`\n⚠️  Only ${totalSent}/11 emails sent. Check errors above.`);
  }

  return results;
}

// Execute the email sending
sendAllEmails()
  .then(() => {
    console.log('\n🎯 Email system test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  }); 