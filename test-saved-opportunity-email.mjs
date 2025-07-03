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

async function testSavedOpportunityEmail() {
  try {
    console.log('Testing saved opportunity alert email...');
    
    let emailHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/saved-opportunity-alert.html'), 'utf8');
    
    // Real-world test data for saved opportunity pitch reminder
    const replacements = {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'Banking Experts Needed for Fed Rate Decision Analysis',
      '{{opportunityDescription}}': 'Financial experts needed to provide commentary on the Federal Reserve\'s latest interest rate decision and its impact on regional banking institutions.',
      '{{currentPrice}}': '$342',
      '{{priceTrend}}': '+$28 up',
      '{{priceTrendClass}}': 'price-trend-up',
      '{{opportunityId}}': '156',
      '{{frontendUrl}}': frontendUrl
    };
    
    console.log('Applying replacements for saved opportunity email:');
    console.log('- Opportunity Title:', replacements['{{opportunityTitle}}']);
    console.log('- Current Price:', replacements['{{currentPrice}}']);
    console.log('- Price Trend:', replacements['{{priceTrend}}']);
    
    Object.entries(replacements).forEach(([key, value]) => {
      emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
    });
    
    console.log('Sending saved opportunity test email...');
    
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'You saved this opportunity 6 hours ago, but haven\'t submitted your pitch yet',
      html: emailHtml,
    });
    
    console.log('✅ Saved opportunity alert email sent successfully!');
    console.log('📧 Subject: You saved this opportunity 6 hours ago, but haven\'t submitted your pitch yet');
    console.log('💰 Current Price: $342');
    console.log('📈 Price Trend: +$28 up');
    console.log('🎯 Purpose: 6-hour pitch reminder with FOMO messaging');
    
  } catch (error) {
    console.error('❌ Failed to send saved opportunity test email:', error);
  }
}

testSavedOpportunityEmail().catch(console.error); 