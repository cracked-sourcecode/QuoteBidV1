#!/usr/bin/env node

// Send just the pitch-interested email to review the "reporter" change
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);
const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';

async function sendPitchInterestedEmail() {
  console.log('📧 Sending pitch-interested email to review "reporter" change...\n');
  
  try {
    // Read the template file
    const templatePath = path.join(process.cwd(), 'server/email-templates/pitch-interested.html');
    let emailHtml = fs.readFileSync(templatePath, 'utf8');
    
    // Replace template variables
    const replacements = {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'Tech Innovation Story Expert Needed',
      '{{publicationName}}': 'TechCrunch',
      '{{frontendUrl}}': frontendUrl
    };
    
    for (const [placeholder, value] of Object.entries(replacements)) {
      emailHtml = emailHtml.replace(new RegExp(placeholder, 'g'), value);
    }
    
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <no-reply@quotebid.co>',
      to: ['ben@rubiconprgroup.com'],
      subject: 'Great News! Your Pitch is Gaining Traction', 
      html: emailHtml
    });

    if (error) {
      console.error(`❌ Failed: ${error}`);
    } else {
      console.log(`✅ Success! Email ID: ${data?.id}`);
      console.log(`📬 Subject: "Great News! Your Pitch is Gaining Traction"`);
      console.log(`🎨 Template: pitch-interested.html`);
      console.log(`🔄 Updated text: "caught the attention of the REPORTER"`);
    }
    
  } catch (error) {
    console.error(`💥 Error: ${error}`);
  }
}

// Send the email
sendPitchInterestedEmail(); 