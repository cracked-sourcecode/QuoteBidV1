#!/usr/bin/env node

// Send updated pitch-rejected email with proper styling matching pitch-interested
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);
const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';

async function sendUpdatedPitchRejectedEmail() {
  console.log('📧 Sending updated pitch-rejected email with proper styling...\n');
  
  try {
    // Read the template file
    const templatePath = path.join(process.cwd(), 'server/email-templates/pitch-rejected.html');
    let emailHtml = fs.readFileSync(templatePath, 'utf8');
    
    // Replace template variables
    const replacements = {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'Financial Markets Commentary Expert Needed',
      '{{publicationName}}': 'Bloomberg',
      '{{frontendUrl}}': frontendUrl
    };
    
    for (const [placeholder, value] of Object.entries(replacements)) {
      emailHtml = emailHtml.replace(new RegExp(placeholder, 'g'), value);
    }
    
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <no-reply@quotebid.co>',
      to: ['ben@rubiconprgroup.com'],
      subject: 'Pitch Update - Not Selected This Time', 
      html: emailHtml
    });

    if (error) {
      console.error(`❌ Failed: ${error}`);
    } else {
      console.log(`✅ Success! Email ID: ${data?.id}`);
      console.log(`📬 Subject: "Pitch Update - Not Selected This Time"`);
      console.log(`🎨 Updated styling:`);
      console.log(`   • Light blue container (matches pitch-interested)`);
      console.log(`   • Rounded button (8px radius, not full width)`);
      console.log(`   • Better uplifting message (not hyperbolic)`);
    }
    
  } catch (error) {
    console.error(`💥 Error: ${error}`);
  }
}

// Send the email
sendUpdatedPitchRejectedEmail(); 