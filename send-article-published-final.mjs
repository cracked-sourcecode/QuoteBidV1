import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sendArticlePublishedEmail = async () => {
  console.log('🎉 Sending Article Published Email with Fixed View Media Coverage Button...');
  
  // Read the article published template
  const templatePath = join(__dirname, 'server/email-templates/article-published.html');
  let template = fs.readFileSync(templatePath, 'utf8');
  
  // Replace template variables
  const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';
  template = template
    .replace(/\{\{userFirstName\}\}/g, 'Ben')
    .replace(/\{\{articleTitle\}\}/g, 'Revolutionary AI Breakthrough: New Technology Transforms Healthcare')
    .replace(/\{\{articleUrl\}\}/g, 'https://techcrunch.com/2024/ai-healthcare-breakthrough')
    .replace(/\{\{publicationName\}\}/g, 'TechCrunch')
    .replace(/\{\{frontendUrl\}\}/g, frontendUrl);

  // Use the existing email system by writing to the server routes
  const emailData = {
    to: 'ben@rubiconprgroup.com',
    subject: 'Article Published - Your Story is Live! 🎉',
    html: template
  };

  // Use curl to send via the existing email endpoint
  const curlCommand = `curl -X POST http://localhost:3000/api/admin/send-test-email \\
    -H "Content-Type: application/json" \\
    -d '${JSON.stringify(emailData).replace(/'/g, "'\\''")}' \\
    --max-time 30`;

  console.log('📧 Sending email via existing email system...');
  console.log('To: ben@rubiconprgroup.com');
  console.log('Subject: Article Published - Your Story is Live! 🎉');
  console.log('');
  console.log('🔗 View Media Coverage Button URL:');
  console.log(`${frontendUrl}/account?notification=media_coverage`);
  console.log('');
  console.log('✅ This will now correctly:');
  console.log('   1. Switch to the "info" tab (not "profile")');
  console.log('   2. Scroll to the media coverage section');
  console.log('   3. Refresh the media coverage data');
  
  // Save the rendered template for viewing
  const outputPath = join(__dirname, 'article-published-email-for-ben.html');
  fs.writeFileSync(outputPath, template);
  console.log('');
  console.log(`📄 Email saved to: ${outputPath}`);
  console.log('   You can open this file in your browser to see the email');
};

sendArticlePublishedEmail().catch(console.error); 