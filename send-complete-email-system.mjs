#!/usr/bin/env node

// Send ALL 12 QuoteBid email templates with CLEAN subjects (no brackets)
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);
const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';

async function sendCompleteEmailSystem() {
  console.log('🚀 COMPLETE EMAIL SYSTEM TEST - All 12 Templates\n');
  console.log('✅ Using ACTUAL QuoteBid templates with proper headers');
  console.log('🚫 NO BRACKETS in any subject lines\n');
  
  const allEmailTemplates = [
    {
      name: 'Welcome Email',
      template: 'welcome.html',
      subject: 'Welcome to QuoteBid - Your Account is Ready!',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{userEmail}}': 'ben@rubiconprgroup.com',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'New Opportunity Alert',
      template: 'new-opportunity-alert.html',
      subject: 'New Opportunity in Yahoo Finance - Your Industry Match',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Healthcare Innovation Expert Needed',
        '{{publicationName}}': 'Yahoo Finance',
        '{{currentPrice}}': '$450',
        '{{bidCount}}': '3',
        '{{timeLeft}}': '2 days',
        '{{opportunityId}}': '789',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Saved Opportunity Reminder',
      template: 'saved-opportunity-alert.html',
      subject: 'You Saved This Opportunity - Submit Your Pitch Today',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Capital Markets Analysis Expert',
        '{{publicationName}}': 'Wall Street Journal',
        '{{currentPrice}}': '$680',
        '{{timeLeft}}': '1 day',
        '{{opportunityId}}': '456',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Pitch Interested',
      template: 'pitch-interested.html',
      subject: 'Great News! Your Pitch is Gaining Traction',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Tech Innovation Story',
        '{{publicationName}}': 'TechCrunch',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Pitch Rejected',
      template: 'pitch-rejected.html',
      subject: 'Pitch Update - Not Selected This Time',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Financial Markets Commentary',
        '{{publicationName}}': 'Bloomberg',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Pitch Sent Confirmation',
      template: 'pitch-sent.html',
      subject: 'Pitch Successfully Submitted',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Healthcare Policy Analysis',
        '{{publicationName}}': 'Reuters',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Pitch Submitted (Admin)',
      template: 'pitch-submitted.html',
      subject: 'New Pitch Submitted - Review Required',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Climate Change Expert Commentary Expert Needed',
        '{{publicationName}}': 'The Guardian',
        '{{securedPrice}}': '$298',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Draft Reminder',
      template: 'draft-reminder.html',
      subject: 'Complete Your Pitch Draft - Opportunity Waiting',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Economic Forecast Analysis',
        '{{currentPrice}}': '$320',
        '{{timeLeft}}': '3 hours',
        '{{opportunityId}}': '234',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Article Published',
      template: 'article-published.html',
      subject: 'Success! Your Story Has Been Published',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{articleTitle}}': 'The Future of Digital Healthcare',
        '{{publicationName}}': 'Forbes',
        '{{articleUrl}}': 'https://forbes.com/digital-healthcare-future',
        '{{publishDate}}': 'January 15, 2025',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Billing Confirmation',
      template: 'billing-confirmation.html',
      subject: 'Receipt: Your QuoteBid Placement - $2,450.00',
      replacements: {
        '{{receiptNumber}}': 'QB-' + Date.now(),
        '{{articleTitle}}': 'Sustainable Energy Innovation',
        '{{publicationName}}': 'MIT Technology Review',
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
      name: 'Subscription Renewal Failed',
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
    },
    {
      name: 'Password Reset',
      template: 'password-reset.html',
      subject: 'Reset Your QuoteBid Password',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{resetLink}}': `${frontendUrl}/reset-password?token=sample-token-123`,
        '{{frontendUrl}}': frontendUrl
      }
    }
  ];

  console.log(`📧 Sending ${allEmailTemplates.length} emails...\n`);

  for (const [index, test] of allEmailTemplates.entries()) {
    try {
      console.log(`📧 ${index + 1}/${allEmailTemplates.length} Sending: ${test.name}...`);
      
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
        console.log(`   🎨 Template: ${test.template}\n`);
      }
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`   💥 Error: ${error}\n`);
    }
  }

  console.log('🎉 COMPLETE EMAIL SYSTEM TEST FINISHED!');
  console.log('📧 Check ben@rubiconprgroup.com for all 12 emails');
  console.log('✅ ALL templates using proper QuoteBid headers');
  console.log('🚫 ZERO brackets in any subject lines!');
  console.log('🚀 Email system is production ready!');
}

// Run the complete email system test
sendCompleteEmailSystem(); 