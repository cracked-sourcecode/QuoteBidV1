import { Resend } from 'resend';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendNewOpportunityFinal() {
  try {
    // Read the updated new opportunity alert template
    const htmlContent = fs.readFileSync('server/email-templates/new-opportunity-alert.html', 'utf8');
    
    // Replace template variables with the real opportunity data
    const personalizedContent = htmlContent
      .replace(/\{\{userFirstName\}\}/g, 'Ben')
      .replace(/\{\{bidDeadline\}\}/g, 'Friday, 5 PM ET')
      .replace(/\{\{publicationType\}\}/g, 'Yahoo Finance')
      .replace(/\{\{opportunityTitle\}\}/g, 'Looking For Capital Market Experts For a Story On The Stock Market')
      .replace(/\{\{industryMatch\}\}/g, 'Capital Markets, Financial Analysis, Stock Market Commentary')
      .replace(/\{\{currentPrice\}\}/g, '500')
      .replace(/\{\{opportunityId\}\}/g, '40')
      .replace(/\{\{frontendUrl\}\}/g, 'https://www.quotebid.co');
    
    // Send the email
    const result = await resend.emails.send({
      from: 'QuoteBid Alerts <noreply@quotebid.co>',
      to: ['ben@rubiconprgroup.com'],
      subject: 'YAHOO FINANCE Quote Opportunity: Capital Markets Story - $500 Placement',
      html: personalizedContent
    });
    
    console.log('✅ New opportunity email sent with improved photo spacing!');
    console.log('Message ID:', result.data?.id);
    console.log('\n📧 Email features:');
    console.log('  ✓ Improved photo spacing (40px gap)');
    console.log('  ✓ Professional QuoteBid messaging');
    console.log('  ✓ Clean structured opportunity details');
    console.log('  ✓ Real Yahoo Finance opportunity data');
    console.log('  ✓ UTM tracking for pricing engine');
    console.log('  ✓ Better signature layout');
    
  } catch (error) {
    console.error('❌ Failed to send new opportunity email:', error.message);
  }
}

sendNewOpportunityFinal(); 