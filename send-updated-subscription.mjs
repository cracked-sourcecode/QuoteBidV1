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

async function sendUpdatedSubscriptionEmail() {
  const frontendUrl = 'https://quotebid.co';
  const emailTo = 'ben@rubiconprgroup.com';
  
  console.log('📧 SENDING UPDATED SUBSCRIPTION RENEWAL FAILED EMAIL');
  
  try {
    let subscriptionFailedHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/subscription-renewal-failed.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{subscriptionPlan}}/g, 'QuoteBid Premium')
      .replace(/{{monthlyAmount}}/g, '99.99')
      .replace(/{{nextAttemptDate}}/g, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/{{cardLast4}}/g, '4242')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'Action Required: QuoteBid Subscription Payment Failed - UPDATED DESIGN',
      html: subscriptionFailedHtml,
    });
    console.log('✅ Updated Subscription Renewal Failed email sent!');
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
  
  console.log('\n🎉 UPDATED SUBSCRIPTION EMAIL SENT - Check your inbox!');
}

sendUpdatedSubscriptionEmail().catch(console.error); 