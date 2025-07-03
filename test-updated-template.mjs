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

async function testUpdatedTemplate() {
  try {
    console.log('Testing updated email template with realistic data...');
    
    let emailHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/new-opportunity-alert.html'), 'utf8');
    
    // Real-world test data
    const replacements = {
      '{{userFirstName}}': 'Ben',
      '{{publicationType}}': 'Wall Street Journal',
      '{{title}}': 'Fed Rate Cut Impact on Regional Banking Sector',
      '{{requestType}}': 'Expert commentary on interest rate policy effects',
      '{{bidDeadline}}': '3 days',
      '{{opportunityId}}': '147',
      '{{frontendUrl}}': frontendUrl
    };
    
    console.log('Applying replacements with new template variables:');
    console.log('- {{title}} =', replacements['{{title}}']);
    console.log('- {{requestType}} =', replacements['{{requestType}}']);
    console.log('- {{publicationType}} =', replacements['{{publicationType}}']);
    
    Object.entries(replacements).forEach(([key, value]) => {
      emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
    });
    
    console.log('Sending test email...');
    
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'New opportunity in Wall Street Journal has been added to QuoteBid',
      html: emailHtml,
    });
    
    console.log('✅ Test email sent successfully with updated template!');
    console.log('📧 Story Topic: Fed Rate Cut Impact on Regional Banking Sector');
    console.log('📰 Media Outlet: Wall Street Journal');
    console.log('🎯 What They Need: Expert commentary on interest rate policy effects');
    console.log('⏰ Deadline: 3 days');
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }
}

testUpdatedTemplate().catch(console.error); 