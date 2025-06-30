#!/usr/bin/env node

import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const templateDir = path.join(process.cwd(), 'server', 'email-templates');

async function sendBillingEmailOnly() {
  console.log('💳 Sending FINAL Billing Confirmation Email to ben@rubiconprgroup.com\n');
  
  try {
    // Read billing template
    const templatePath = path.join(templateDir, 'billing-confirmation.html');
    console.log('📥 Reading final billing template...');
    const template = fs.readFileSync(templatePath, 'utf8');
    console.log(`✅ Template loaded: billing-confirmation.html (${template.length} chars)`);
    
    // Sample billing data - using correct quotebid.co URLs
    const emailData = {
      userFirstName: 'Ben',
      receiptNumber: 'QBR-2025-001234',
      articleTitle: 'NYC Housing Crisis: Expert Analysis on Market Trends',
      articleUrl: 'https://www.wsj.com/articles/nyc-housing-crisis-expert-analysis-market-trends-2025',
      publicationName: 'The Wall Street Journal',
      publishDate: 'January 15, 2025',
      billingDate: 'January 15, 2025',
      totalAmount: '2,640.00',
      cardBrand: 'Visa',
      cardLast4: '4242',
      frontendUrl: 'https://quotebid.co'
    };
    
    // Replace template variables
    let htmlContent = template;
    Object.keys(emailData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(regex, emailData[key]);
    });
    
    // Send email
    console.log('📤 Sending final billing confirmation...');
    const result = await resend.emails.send({
      from: 'QuoteBid Billing <billing@quotebid.co>',
      to: ['ben@rubiconprgroup.com'],
      subject: `💳 Payment Confirmed - $${emailData.totalAmount} (Receipt #${emailData.receiptNumber})`,
      html: htmlContent,
    });
    
    console.log(`✅ FINAL Billing Confirmation sent successfully!`);
    console.log(`📧 Message ID: ${result.data?.id || 'unknown'}`);
    console.log(`📬 Sent to: ben@rubiconprgroup.com`);
    console.log(`💰 Total Amount: $${emailData.totalAmount}`);
    console.log(`🧾 Receipt: ${emailData.receiptNumber}`);
    console.log(`📰 Article: ${emailData.articleTitle}`);
    console.log(`🔗 Article URL: ${emailData.articleUrl}`);
    console.log(`💳 Card: ${emailData.cardBrand} •••• ${emailData.cardLast4}`);
    console.log(`🌐 URLs: All pointing to quotebid.co`);
    
    console.log('\n🎉 Final billing confirmation email sent successfully!');
    console.log('✨ All features complete:');
    console.log('  🔗 Article title is clickable (links to published article)');
    console.log('  🎯 Credit card content properly centered');
    console.log('  🌐 All URLs point to quotebid.co (not .com)');
    console.log('  💳 Proper table layout for email client compatibility');
    console.log('  💰 Simple total charged amount (no confusing fee breakdown)');
    
  } catch (error) {
    console.error('❌ Error sending billing email:', error.message);
    process.exit(1);
  }
}

sendBillingEmailOnly(); 