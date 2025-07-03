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
const frontendUrl = 'https://quotebid.co';
const emailTo = 'ben@rubiconprgroup.com';

async function sendArticlePublished() {
  try {
    console.log('Sending: Article Published...');
    
    let emailHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/article-published.html'), 'utf8');
    
    // Apply replacements
    const replacements = {
      '{{userFirstName}}': 'Ben',
      '{{opportunityTitle}}': 'AI Transformation in Financial Services',
      '{{opportunityDescription}}': 'Your expert commentary on AI adoption in banking and fintech has been published.',
      '{{publicationName}}': 'Bloomberg',
      '{{publishDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      '{{articleUrl}}': 'https://bloomberg.com/news/articles/ai-transformation-financial-services',
      '{{frontendUrl}}': frontendUrl
    };
    
    Object.entries(replacements).forEach(([key, value]) => {
      emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
    });
    
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'Your Article is Now Live!',
      html: emailHtml,
    });
    
    console.log('✅ Article Published sent');
    
  } catch (error) {
    console.error('❌ Article Published failed:', error.message);
  }
}

sendArticlePublished().catch(console.error); 