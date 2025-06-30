#!/usr/bin/env node

import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resend = new Resend(process.env.RESEND_API_KEY);
const TO_EMAIL = 'ben@rubiconprgroup.com';

console.log('🚀 Sending ALL 12 emails directly to ben@rubiconprgroup.com');
console.log('📧 Including the FIXED subscription renewal email with $99.99 pricing\n');

// Email templates with their data
const emailTemplates = [
  // UTILITY
  {
    name: 'welcome',
    category: 'UTILITY',
    subject: '🎯 QuoteBid UTILITY: Welcome Email Template',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  {
    name: 'password-reset',
    category: 'UTILITY', 
    subject: '🎯 QuoteBid UTILITY: Password Reset Template',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{resetUrl}}': 'https://quotebid.co/reset-password?token=abc123',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  
  // ALERTS
  {
    name: 'new-opportunity-alert',
    category: 'ALERTS',
    subject: '🎯 QuoteBid ALERTS: New Opportunity Alert Template',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'Tech Innovation Drives Market Growth',
      '{{publicationName}}': 'TechCrunch',
      '{{currentPrice}}': '285',
      '{{pitchCount}}': '8',
      '{{industry}}': 'Technology',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  {
    name: 'saved-opportunity-alert',
    category: 'ALERTS',
    subject: '🎯 QuoteBid ALERTS: Saved Opportunity Alert Template', 
    data: {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'AI Startup Funding Surge',
      '{{publicationName}}': 'Forbes',
      '{{oldPrice}}': '450',
      '{{newPrice}}': '320',
      '{{priceDirection}}': 'down',
      '{{priceChange}}': '130',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  
  // NOTIFICATIONS
  {
    name: 'draft-reminder',
    category: 'NOTIFICATIONS',
    subject: '🎯 QuoteBid NOTIFICATIONS: Draft Reminder Template',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'Blockchain Innovation Coverage',
      '{{publicationName}}': 'Wall Street Journal',
      '{{daysLeft}}': '2',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  {
    name: 'pitch-sent',
    category: 'NOTIFICATIONS',
    subject: '🎯 QuoteBid NOTIFICATIONS: Pitch Sent Template',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'Climate Tech Solutions',
      '{{publicationName}}': 'Reuters',
      '{{bidAmount}}': '275',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  {
    name: 'pitch-submitted',
    category: 'NOTIFICATIONS',
    subject: '🎯 QuoteBid NOTIFICATIONS: Pitch Submitted Template',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'Cybersecurity Trends',
      '{{publicationName}}': 'TechCrunch',
      '{{bidAmount}}': '350',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  {
    name: 'pitch-interested',
    category: 'NOTIFICATIONS',
    subject: '🎯 QuoteBid NOTIFICATIONS: Pitch Interested Template',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'SaaS Market Analysis',
      '{{publicationName}}': 'Business Insider',
      '{{reporterName}}': 'Sarah Johnson',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  {
    name: 'pitch-rejected',
    category: 'NOTIFICATIONS',
    subject: '🎯 QuoteBid NOTIFICATIONS: Pitch Rejected Template',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'Fintech Evolution',
      '{{publicationName}}': 'Bloomberg',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  {
    name: 'article-published',
    category: 'NOTIFICATIONS',
    subject: '🎯 QuoteBid NOTIFICATIONS: Article Published Template',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{articleTitle}}': 'The Future of Digital Banking',
      '{{publicationName}}': 'Fortune',
      '{{articleUrl}}': 'https://fortune.com/future-digital-banking',
      '{{publishDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  
  // BILLING
  {
    name: 'billing-confirmation',
    category: 'BILLING',
    subject: '🎯 QuoteBid BILLING: Billing Confirmation Template',
    data: {
      '{{receiptNumber}}': 'QB-' + Date.now(),
      '{{articleTitle}}': 'Tech Innovation Drives Market Growth',
      '{{publicationName}}': 'TechCrunch',
      '{{publishDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      '{{billingDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      '{{totalAmount}}': '327.75',
      '{{cardBrand}}': 'Visa',
      '{{cardLast4}}': '4242',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  },
  
  // SUBSCRIPTION RENEWAL FAILED - THE FIXED ONE!
  {
    name: 'subscription-renewal-failed',
    category: 'BILLING',
    subject: '🎯 QuoteBid BILLING: Subscription Renewal Failed Template (FIXED - $99.99)',
    data: {
      '{{userFirstName}}': 'Ben',
      '{{subscriptionPlan}}': 'QuoteBid Premium',
      '{{monthlyAmount}}': '99.99',
      '{{nextAttemptDate}}': new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      '{{cardLast4}}': '4242',
      '{{frontendUrl}}': 'https://quotebid.co'
    }
  }
];

async function loadAndSendEmail(template) {
  try {
    console.log(`📥 Loading ${template.name}...`);
    
    // Load HTML template
    const templatePath = path.join(__dirname, 'server/email-templates', `${template.name}.html`);
    let html = fs.readFileSync(templatePath, 'utf8');
    
    // Replace template variables
    for (const [placeholder, value] of Object.entries(template.data)) {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      html = html.replace(regex, value);
    }
    
    console.log(`📤 Sending ${template.name}...`);
    
    // Send email
    const { data, error } = await resend.emails.send({
      from: 'QuoteBid <hello@quotebid.co>',
      to: [TO_EMAIL],
      subject: template.subject,
      html: html,
    });

    if (error) {
      console.error(`❌ Failed to send ${template.name}:`, error);
      return false;
    }

    console.log(`✅ ${template.name} sent successfully! ID: ${data.id}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error with ${template.name}:`, error.message);
    return false;
  }
}

async function sendAllEmails() {
  let successCount = 0;
  let failCount = 0;

  console.log('🎯 ===== SENDING ALL 12 EMAIL TEMPLATES =====\n');

  for (let i = 0; i < emailTemplates.length; i++) {
    const template = emailTemplates[i];
    
    // Add delay between emails
    if (i > 0) {
      console.log('⏱️  Waiting 2 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const success = await loadAndSendEmail(template);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    console.log(`📊 Progress: ${i + 1}/12 completed\n`);
  }

  // Final summary
  console.log('🏁 ===== FINAL RESULTS =====');
  console.log(`✅ Successfully sent: ${successCount}/12`);
  console.log(`❌ Failed: ${failCount}/12`);
  console.log(`📧 All emails sent to: ${TO_EMAIL}`);
  
  if (successCount === 12) {
    console.log('\n🎉 🎯 ALL 12 EMAIL TEMPLATES SENT SUCCESSFULLY! 🎉');
    console.log('📬 Check ben@rubiconprgroup.com inbox');
    console.log('💰 Subscription renewal email now has CORRECT $99.99 pricing!');
    console.log('🎨 Clean, professional design that actually works!');
  }
}

// Execute
sendAllEmails()
  .then(() => {
    console.log('\n🎯 Email delivery completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  }); 