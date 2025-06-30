#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const templatePath = path.join(process.cwd(), 'server', 'email-templates', 'billing-confirmation.html');

// Create transporter
const transporter = nodemailer.createTransporter({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

async function sendBillingEmail() {
  try {
    console.log('📧 Sending Billing Confirmation Email...\n');
    
    // Read template
    const template = fs.readFileSync(templatePath, 'utf8');
    console.log(`✅ Template loaded: ${template.length} chars`);
    
    // Sample billing data
    const emailData = {
      userFirstName: 'Ben',
      receiptNumber: 'QBR-2025-001234',
      articleTitle: 'NYC Housing Crisis: Expert Analysis on Market Trends',
      publicationName: 'The Wall Street Journal',
      publishDate: 'January 15, 2025',
      billingDate: 'January 15, 2025',
      placementFee: '2,400.00',
      platformFee: '240.00',
      totalAmount: '2,640.00',
      cardBrand: 'Visa',
      cardLast4: '4242',
      frontendUrl: 'https://quotebid.com'
    };
    
    // Replace template variables
    let htmlContent = template;
    Object.keys(emailData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(regex, emailData[key]);
    });
    
    // Email options
    const mailOptions = {
      from: {
        name: 'QuoteBid Billing',
        address: 'billing@quotebid.com'
      },
      to: 'ben@rubiconprgroup.com',
      subject: `Payment Confirmed - $${emailData.totalAmount} (Receipt #${emailData.receiptNumber})`,
      html: htmlContent
    };
    
    // Send email
    console.log('📤 Sending billing confirmation...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Billing Confirmation sent successfully!`);
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📬 Sent to: ben@rubiconprgroup.com`);
    console.log(`💰 Total Amount: $${emailData.totalAmount}`);
    console.log(`🧾 Receipt: ${emailData.receiptNumber}`);
    console.log(`📰 Article: ${emailData.articleTitle}`);
    
    console.log('\n🎉 Billing email sent successfully!');
    
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    process.exit(1);
  }
}

sendBillingEmail(); 