#!/usr/bin/env node

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

async function sendBillingOnlyEmails() {
  const frontendUrl = 'https://quotebid.co';
  const emailTo = 'ben@rubiconprgroup.com';
  
  console.log('📧 SENDING ONLY THE 2 BILLING EMAILS TO:', emailTo);
  
  // 1. Billing Confirmation (BILLING CATEGORY)
  try {
    let billingConfirmationHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/billing-confirmation.html'), 'utf8')
      .replace(/{{receiptNumber}}/g, 'QB-' + Date.now())
      .replace(/{{articleTitle}}/g, 'AI Revolution in Financial Services')
      .replace(/{{publicationName}}/g, 'Bloomberg')
      .replace(/{{publishDate}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/{{billingDate}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/{{placementFee}}/g, '285.00')
      .replace(/{{platformFee}}/g, '42.75')
      .replace(/{{totalAmount}}/g, '327.75')
      .replace(/{{cardBrand}}/g, 'Visa')
      .replace(/{{cardLast4}}/g, '4242')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'Receipt: Your QuoteBid Placement - Bloomberg - BILLING CATEGORY',
      html: billingConfirmationHtml,
    });
    console.log('✅ 1. Billing Confirmation sent (BILLING CATEGORY)');
  } catch (error) {
    console.error('❌ Error sending Billing Confirmation:', error);
  }

  // 2. Subscription Renewal Failed (BILLING CATEGORY)
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
      subject: 'Action Required: QuoteBid Subscription Payment Failed - BILLING CATEGORY',
      html: subscriptionFailedHtml,
    });
    console.log('✅ 2. Subscription Renewal Failed sent (BILLING CATEGORY)');
  } catch (error) {
    console.error('❌ Error sending Subscription Renewal Failed:', error);
  }
  
  console.log('\n🎉 ONLY THE 2 BILLING CATEGORY EMAILS SENT TO', emailTo);
  console.log('📝 Note: Payment Processed and Placement Notification are now ALWAYS SEND emails');
}

sendBillingOnlyEmails().catch(console.error); 