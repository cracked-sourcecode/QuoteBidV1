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

async function sendMissing5() {
  
  const emails = [
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
    }
  ];

  for (const email of emails) {
    try {
      console.log(`Sending: ${email.name}...`);
      
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
      
      console.log(`✅ ${email.name} sent`);
      
    } catch (error) {
      console.error(`❌ ${email.name} failed:`, error.message);
    }
  }

  console.log('Done!');
}

sendMissing5().catch(console.error); 