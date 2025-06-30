#!/usr/bin/env node

import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  console.log('🧪 Sending Simple Test Email to ben@rubiconprgroup.com\n');
  
  try {
    const result = await resend.emails.send({
      from: 'QuoteBid Test <test@quotebid.co>',
      to: ['ben@rubiconprgroup.com'],
      subject: '🧪 Test Email - QuoteBid Delivery Check',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Test Email Delivery</h1>
          <p>Hi Ben,</p>
          <p>This is a simple test email to verify that email delivery is working correctly.</p>
          <p>If you receive this email, then delivery is working and we can troubleshoot the billing email specifically.</p>
          <p>Time sent: ${new Date().toLocaleString()}</p>
          <hr>
          <p style="font-size: 12px; color: #666;">QuoteBid Email System Test</p>
        </div>
      `,
    });
    
    console.log(`✅ Test email sent successfully!`);
    console.log(`📧 Message ID: ${result.data?.id || 'unknown'}`);
    console.log(`📬 Sent to: ben@rubiconprgroup.com`);
    console.log(`🕐 Time: ${new Date().toLocaleString()}`);
    
    console.log('\n🔍 Next steps:');
    console.log('1. Check your inbox for this test email');
    console.log('2. Check spam folder if not in inbox');
    console.log('3. If you receive this but not the billing email, there\'s an issue with the billing template');
    
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

sendTestEmail(); 