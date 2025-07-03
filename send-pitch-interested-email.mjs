import { Resend } from 'resend';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const template = fs.readFileSync('./server/email-templates/pitch-interested.html', 'utf8');

const compiledTemplate = template
  .replace(/\{\{userFirstName\}\}/g, 'Ben')
  .replace(/\{\{opportunityTitle\}\}/g, 'Healthcare Innovation Story')
  .replace(/\{\{publicationName\}\}/g, 'Forbes')
  .replace(/\{\{frontendUrl\}\}/g, 'https://quotebid.co')
  .replace(/\{\{pitchId\}\}/g, '123');

try {
  const result = await resend.emails.send({
    from: 'QuoteBid Email System <noreply@quotebid.co>',
    to: ['ben@rubiconprgroup.com'],
    subject: 'REVIEW: Updated Pitch Interested Email Template',
    html: compiledTemplate
  });
  
  console.log('✅ Updated pitch-interested email sent successfully!', result.data?.id);
} catch (error) {
  console.error('❌ Error sending email:', error.message);
} 