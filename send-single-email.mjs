#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const templatePath = path.join(process.cwd(), 'server', 'email-templates', 'new-opportunity-alert.html');

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

async function sendNewOpportunityEmail() {
  try {
    console.log('📧 Sending New Opportunity Alert Email...\n');
    
    // Read template
    const template = fs.readFileSync(templatePath, 'utf8');
    console.log(`✅ Template loaded: ${template.length} chars`);
    
    // Sample data for the email
    const emailData = {
      userFirstName: 'Ben',
      opportunityTitle: 'NYC Housing Crisis Deep Dive',
      publicationName: 'The Wall Street Journal',
      currentPrice: '2,400',
      pitchCount: '12',
      industryMatch: 'Real Estate & Urban Development',
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
        name: 'QuoteBid Alerts',
        address: 'alerts@quotebid.com'
      },
      to: 'ben@rubiconprgroup.com',
      subject: `New Opportunity: ${emailData.opportunityTitle} - $${emailData.currentPrice}`,
      html: htmlContent
    };
    
    // Send email
    console.log('📤 Sending email...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ New Opportunity Alert sent successfully!`);
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📬 Sent to: ben@rubiconprgroup.com`);
    console.log(`💰 Price: $${emailData.currentPrice}`);
    console.log(`📊 Pitch Count: ${emailData.pitchCount}`);
    console.log(`🎯 Industry: ${emailData.industryMatch}`);
    
    console.log('\n🎉 Email sent successfully!');
    
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    process.exit(1);
  }
}

sendNewOpportunityEmail(); 