import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendProductionEmailsWithDelays() {
  
  const emails = [
    {
      name: 'New Opportunity Alert',
      template: 'new-opportunity-alert.html',
      subject: 'New opportunity in Bloomberg has been added to QuoteBid',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Fintech Innovation Expert Needed for Breaking News',
        '{{publicationName}}': 'Bloomberg',
        '{{industry}}': 'Finance & Technology',
        '{{currentPrice}}': '$342',
        '{{deadline}}': '2 days',
        '{{opportunityId}}': '123',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Saved Opportunity Alert',
      template: 'saved-opportunity-alert.html',
      subject: 'You saved this opportunity 6 hours ago, but haven\'t submitted your pitch yet',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Banking Experts for FOMC Meeting Analysis',
        '{{opportunityDescription}}': 'Banking experts needed to analyze the latest FOMC meeting decisions and their impact on commercial lending.',
        '{{currentPrice}}': '$285',
        '{{priceTrend}}': '+$15 up',
        '{{priceTrendClass}}': 'price-trend-up',
        '{{opportunityId}}': '456',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Pitch Sent',
      template: 'pitch-sent.html',
      subject: 'Your pitch has been submitted successfully',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Real Estate Market Trends Analysis',
        '{{opportunityDescription}}': 'Real estate experts needed for commercial market trends analysis covering office space and retail sectors.',
        '{{securedPrice}}': '$256',
        '{{pitchId}}': '101',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Pitch Interested',
      template: 'pitch-interested.html',
      subject: 'Reporter Interested! - Your pitch caught their attention',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Healthcare Innovation Story',
        '{{opportunityDescription}}': 'Healthcare professionals needed to discuss FDA drug approval trends and biotech developments.',
        '{{reporterName}}': 'Michael Chen',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Pitch Rejected',
      template: 'pitch-rejected.html',
      subject: 'Pitch Not Selected - But don\'t give up!',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Climate Change Policy Analysis',
        '{{opportunityDescription}}': 'Environmental policy experts needed to analyze new climate legislation impact.',
        '{{userIndustry}}': 'Finance',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Pitch Submitted',
      template: 'pitch-submitted.html',
      subject: 'New pitch submitted for review',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Energy Sector Investment Analysis',
        '{{opportunityDescription}}': 'Energy sector analysts needed to discuss renewable energy investment trends.',
        '{{reporterName}}': 'Sarah Johnson',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Article Published',
      template: 'article-published.html',
      subject: 'Your Article is Now Live!',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'AI Transformation in Financial Services',
        '{{opportunityDescription}}': 'Your expert commentary on AI adoption in banking and fintech has been published.',
        '{{publicationName}}': 'Bloomberg',
        '{{publishDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{{articleUrl}}': 'https://bloomberg.com/news/articles/ai-transformation-financial-services',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Draft Reminder',
      template: 'draft-reminder.html',
      subject: 'Your draft pitch is waiting to be completed',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{opportunityTitle}}': 'Cryptocurrency Market Analysis Story',
        '{{opportunityDescription}}': 'Crypto experts needed to discuss institutional adoption trends and regulatory developments.',
        '{{opportunityId}}': '789',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Billing Confirmation',
      template: 'billing-confirmation.html',
      subject: 'Receipt: Your QuoteBid Placement - Bloomberg',
      replacements: {
        '{{receiptNumber}}': 'QB-' + Date.now(),
        '{{articleTitle}}': 'AI Revolution in Financial Services',
        '{{publicationName}}': 'Bloomberg',
        '{{publishDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{{billingDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{{placementFee}}': '285.00',
        '{{platformFee}}': '42.75',
        '{{totalAmount}}': '327.75',
        '{{cardBrand}}': 'Visa',
        '{{cardLast4}}': '4242',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Subscription Renewal Failed',
      template: 'subscription-renewal-failed.html',
      subject: 'Action Required: QuoteBid Subscription Payment Failed',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{subscriptionPlan}}': 'QuoteBid Premium',
        '{{monthlyAmount}}': '99.99',
        '{{nextAttemptDate}}': new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{{cardLast4}}': '4242',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Welcome Email',
      template: 'welcome.html',
      subject: 'Welcome to QuoteBid!',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{username}}': 'ben_deveran',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Password Reset',
      template: 'password-reset.html',
      subject: 'Reset Your QuoteBid Password',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{resetUrl}}': frontendUrl + '/reset-password?token=sample-reset-token-123',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Payment Processed',
      template: 'billing-payment.html',
      subject: 'Payment Processed - Published in TechCrunch',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{userEmail}}': emailTo,
        '{{publicationName}}': 'TechCrunch',
        '{{articleTitle}}': 'Startup Funding Trends Drive Q1 2025 Growth',
        '{{articleUrl}}': 'https://techcrunch.com/2025/01/18/startup-funding-trends-q1-2025',
        '{{billingAmount}}': '295.00',
        '{{paymentMethod}}': 'Visa ending in 4242',
        '{{stripeReceiptUrl}}': 'https://pay.stripe.com/receipts/payment/demo-receipt-url',
        '{{frontendUrl}}': frontendUrl
      }
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    try {
      console.log(`Sending ${i + 1}/13: ${email.name}...`);
      
      let emailHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates', email.template), 'utf8');
      
      // Apply replacements
      Object.entries(email.replacements).forEach(([key, value]) => {
        emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
      });
      
      await resend.emails.send({
        from: 'QuoteBid <noreply@quotebid.co>',
        to: [emailTo],
        subject: email.subject,
        html: emailHtml,
      });
      
      console.log(`✅ ${email.name} sent successfully`);
      successCount++;
      
      // Add delay between emails to prevent rate limiting
      if (i < emails.length - 1) {
        console.log('Waiting 2 seconds...');
        await delay(2000);
      }
      
    } catch (error) {
      console.error(`❌ ${email.name} failed:`, error.message);
      failCount++;
    }
  }

  console.log(`\nResults: ${successCount} sent, ${failCount} failed`);
}

sendProductionEmailsWithDelays().catch(console.error); 