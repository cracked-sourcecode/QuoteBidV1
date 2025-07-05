import { Resend } from 'resend';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendArticlePublishedEmail() {
  try {
    console.log('🎉 Sending Article Published Email with Fixed View Media Coverage Button...');
    
    // Read the HTML template
    const htmlContent = fs.readFileSync('server/email-templates/article-published.html', 'utf8');
    
    // Replace template variables with sample data
    const personalizedContent = htmlContent
      .replace(/\{\{userFirstName\}\}/g, 'Ben')
      .replace(/\{\{articleTitle\}\}/g, 'Revolutionary AI Breakthrough: New Technology Transforms Healthcare')
      .replace(/\{\{articleUrl\}\}/g, 'https://techcrunch.com/2024/ai-healthcare-breakthrough')
      .replace(/\{\{publicationName\}\}/g, 'TechCrunch')
      .replace(/\{\{frontendUrl\}\}/g, 'https://quotebid.co');
    
    // Send the email
    const result = await resend.emails.send({
      from: 'QuoteBid Email System <noreply@quotebid.co>',
      to: ['ben@rubiconprgroup.com'],
      subject: 'Article Published - Your Story is Live! 🎉',
      html: personalizedContent
    });
    
    console.log('✅ Article Published Email sent successfully!');
    console.log('📧 Email ID:', result.data?.id);
    console.log('📧 To: ben@rubiconprgroup.com');
    console.log('📧 Subject: Article Published - Your Story is Live! 🎉');
    console.log('');
    console.log('🔗 View Media Coverage Button URL:');
    console.log('   https://quotebid.co/account');
    console.log('');
    console.log('✅ SIMPLIFIED - The button now simply goes to:');
    console.log('   /account (Profile tab with media coverage section)');
    console.log('');
    console.log('💡 Check your email at ben@rubiconprgroup.com!');
    
  } catch (error) {
    console.error('❌ Failed to send Article Published Email:', error.message);
  }
}

sendArticlePublishedEmail(); 