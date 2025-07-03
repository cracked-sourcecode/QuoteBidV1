import { Resend } from 'resend';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWelcomeEmail() {
  try {
    console.log('📧 Sending welcome email to ben@rubiconprgroup.com...\n');
    
    // Read the welcome email template
    const htmlContent = fs.readFileSync('server/email-templates/welcome.html', 'utf8');
    
    // Replace template variables with sample data
    const personalizedContent = htmlContent
      .replace(/\{\{userFirstName\}\}/g, 'Ben')
      .replace(/\{\{frontendUrl\}\}/g, 'https://quotebid.co');
    
    // Send the email
    const result = await resend.emails.send({
      from: 'QuoteBid Email System <noreply@quotebid.co>',
      to: ['ben@rubiconprgroup.com'],
      subject: '[FIXED] Welcome to QuoteBid - Your Account is Ready!',
      html: personalizedContent
    });
    
    console.log(`✅ Welcome email sent successfully!`);
    console.log(`📧 Email ID: ${result.data?.id}`);
    console.log(`🔍 Check your inbox at ben@rubiconprgroup.com`);
    console.log(`\n🎯 Changes made:`);
    console.log(`  - Added complete main content section`);
    console.log(`  - Personal greeting with user's first name`);
    console.log(`  - Value proposition with 3 key differentiators`);
    console.log(`  - 3-step getting started guide`);
    console.log(`  - Clear call-to-action button`);
    console.log(`  - Support contact information`);
    console.log(`  - Mobile-responsive design`);
    
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error.message);
  }
}

sendWelcomeEmail(); 