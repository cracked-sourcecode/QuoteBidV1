#!/usr/bin/env node

import dotenv from 'dotenv';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendSavedOpportunityEmail() {
  console.log('📧 Sending updated saved opportunity email...\n');

  try {
    // Read the template
    const templatePath = path.join(process.cwd(), 'server/email-templates/saved-opportunity-alert.html');
    let emailHtml = fs.readFileSync(templatePath, 'utf8');

    // Replace template variables with test data
    emailHtml = emailHtml
      .replace(/\{\{userFirstName\}\}/g, 'Ben')
      .replace(/\{\{opportunityTitle\}\}/g, 'Capital Markets Expert Needed for Yahoo Finance Story')
      .replace(/\{\{publicationType\}\}/g, 'Yahoo Finance')
      .replace(/\{\{bidDeadline\}\}/g, 'Friday, 5 PM ET')
      .replace(/\{\{opportunityId\}\}/g, '123')
      .replace(/\{\{frontendUrl\}\}/g, 'https://quotebid.co');

    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'QuoteBid <no-reply@quotebid.co>',
      to: ['ben@rubiconprgroup.com'],
      subject: '⏰ REMINDER: You Saved This But Haven\'t Pitched Yet!',
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Pitch reminder email sent successfully!');
    console.log('📧 Email ID:', data.id);
    console.log('\n🎯 Correct Purpose & Functionality:');
    console.log('  ✅ PITCH REMINDER: For users who saved but haven\'t pitched');
    console.log('  ✅ TIMING: Should send 6 hours after saving');
    console.log('  ✅ FREQUENCY: One-time only (never again once pitched)');
    console.log('  ✅ URGENCY: FOMO-driven copy to drive action');
    console.log('  ✅ CONDITION: Only if no pitch submitted yet');
    console.log('\n📬 Check ben@rubiconprgroup.com for the corrected email!');

  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

sendSavedOpportunityEmail(); 