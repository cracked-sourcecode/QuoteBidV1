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

async function testPitchSentEmail() {
  try {
    console.log('Testing updated pitch sent email...');
    
    let emailHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/pitch-sent.html'), 'utf8');
    
    // Test data for pitch sent email
    const replacements = {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'Real Estate Market Trends Analysis',
      '{{opportunityDescription}}': 'Real estate experts needed for commercial market trends analysis covering office space and retail sectors.',
      '{{securedPrice}}': '$256',
      '{{pitchId}}': '101',
      '{{frontendUrl}}': frontendUrl
    };
    
    console.log('Applying replacements for pitch sent email:');
    console.log('- Opportunity Title:', replacements['{{opportunityTitle}}']);
    console.log('- Secured Price:', replacements['{{securedPrice}}']);
    console.log('- Updated button text: "Edit Draft"');
    console.log('- Added draft editing explanation');
    console.log('- Buttons now stacked and less rounded for mobile');
    
    Object.entries(replacements).forEach(([key, value]) => {
      emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
    });
    
    console.log('Sending updated pitch sent test email...');
    
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'Your pitch has been submitted successfully',
      html: emailHtml,
    });
    
    console.log('✅ Updated pitch sent email sent successfully!');
    console.log('📧 Subject: Your pitch has been submitted successfully');
    console.log('💰 Secured Price: $256');
    console.log('🔘 Button 1: "Edit Draft" (was "Update Pitch")');
    console.log('🔘 Button 2: "Track Progress"');
    console.log('📱 Mobile optimized: Buttons now stack vertically');
    console.log('📝 Added explanation about draft editing timeline');
    
  } catch (error) {
    console.error('❌ Failed to send pitch sent test email:', error);
  }
}

testPitchSentEmail().catch(console.error); 