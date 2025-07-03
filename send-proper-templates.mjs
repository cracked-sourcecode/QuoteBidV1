#!/usr/bin/env node

// Send emails using actual QuoteBid templates (proper header design)
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);
const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';

async function sendProperTemplateEmails() {
  console.log('📧 Sending emails using PROPER QuoteBid templates...\n');
  
  const emailTests = [
    {
      name: 'Pitch Interested (Clean Subject)',
      template: 'pitch-interested.html',
      subject: 'Great News! Your Pitch is Gaining Traction',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Healthcare Innovation Story Expert Needed',
        '{{publicationName}}': 'TechCrunch',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Draft Reminder (Clean Subject)', 
      template: 'draft-reminder.html',
      subject: 'Complete Your Pitch Draft - Opportunity Waiting',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Capital Markets Expert for Fed Meeting Analysis',
        '{{currentPrice}}': '$285',
        '{{timeLeft}}': '2 days',
        '{{opportunityId}}': '123',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Article Published (Clean Subject)',
      template: 'article-published.html', 
      subject: 'Success! Your Story Has Been Published',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{articleTitle}}': 'Tech Innovation Drives Market Growth',
        '{{publicationName}}': 'Forbes',
        '{{articleUrl}}': 'https://forbes.com/tech-innovation-story',
        '{{publishDate}}': 'January 15, 2025',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Billing Confirmation (Clean Subject)',
      template: 'billing-confirmation.html',
      subject: 'Receipt: Your QuoteBid Placement - $2,450.00', 
      replacements: {
        '{{receiptNumber}}': 'QB-' + Date.now(),
        '{{articleTitle}}': 'Healthcare Innovation Breakthrough',
        '{{publicationName}}': 'TechCrunch',
        '{{publishDate}}': 'January 15, 2025',
        '{{billingDate}}': 'January 15, 2025',
        '{{placementFee}}': '2,450.00',
        '{{platformFee}}': '367.50',
        '{{totalAmount}}': '2,817.50',
        '{{cardBrand}}': 'Visa',
        '{{cardLast4}}': '4242',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Subscription Renewal Failed (Clean Subject)',
      template: 'subscription-renewal-failed.html',
      subject: 'Payment Issue: QuoteBid Premium Renewal Failed',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{subscriptionPlan}}': 'QuoteBid Premium',
        '{{monthlyAmount}}': '99.99',
        '{{nextAttemptDate}}': 'January 18, 2025',
        '{{cardLast4}}': '4242',
        '{{frontendUrl}}': frontendUrl
      }
    }
  ];

  for (const test of emailTests) {
    try {
      console.log(`📧 Sending: ${test.name}...`);
      
      // Read the actual template file
      const templatePath = path.join(process.cwd(), 'server/email-templates', test.template);
      let emailHtml = fs.readFileSync(templatePath, 'utf8');
      
      // Replace template variables
      for (const [placeholder, value] of Object.entries(test.replacements)) {
        emailHtml = emailHtml.replace(new RegExp(placeholder, 'g'), value);
      }
      
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'QuoteBid <no-reply@quotebid.co>',
        to: ['ben@rubiconprgroup.com'],
        subject: test.subject, // CLEAN SUBJECT - NO BRACKETS!
        html: emailHtml
      });

      if (error) {
        console.error(`   ❌ Failed: ${error}`);
      } else {
        console.log(`   ✅ Success! Email ID: ${data?.id}`);
        console.log(`   📬 Subject: "${test.subject}"`);
        console.log(`   🎨 Template: ${test.template} (PROPER HEADER)`);
      }
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`   💥 Error: ${error}`);
    }
  }

  console.log('\n🎉 ALL PROPER TEMPLATE EMAILS SENT!');
  console.log('📧 Check ben@rubiconprgroup.com');
  console.log('✅ Using ACTUAL QuoteBid templates with proper headers!');
  console.log('🚫 NO BRACKETS in subjects!');
}

// Run the proper template emails
sendProperTemplateEmails(); 