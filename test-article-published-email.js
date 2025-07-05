const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const testArticlePublishedEmail = async () => {
  console.log('🎉 Testing Article Published Email with Fixed View Media Coverage Button...');
  
  // Read the article published email template
  const templatePath = path.join(__dirname, 'server/email-templates/article-published.html');
  let template = fs.readFileSync(templatePath, 'utf8');
  
  // Replace template variables
  const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';
  const testData = {
    userFirstName: 'Test',
    articleTitle: 'Revolutionary AI Breakthrough: New Technology Transforms Healthcare',
    articleUrl: 'https://techcrunch.com/2024/ai-healthcare-breakthrough',
    publicationName: 'TechCrunch',
    frontendUrl: frontendUrl
  };
  
  // Replace all template variables
  template = template
    .replace(/\{\{userFirstName\}\}/g, testData.userFirstName)
    .replace(/\{\{articleTitle\}\}/g, testData.articleTitle)
    .replace(/\{\{articleUrl\}\}/g, testData.articleUrl)
    .replace(/\{\{publicationName\}\}/g, testData.publicationName)
    .replace(/\{\{frontendUrl\}\}/g, testData.frontendUrl);

  // Create email transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@quotebid.co',
      to: 'test@example.com',
      subject: 'Article Published - Your Story is Live! 🎉',
      html: template
    });

    console.log('✅ Article Published Email sent successfully!');
    console.log('📧 Check your email for the article published notification');
    console.log('🔗 Test the "View Media Coverage" button - it should now properly navigate to:');
    console.log(`   ${frontendUrl}/account?notification=media_coverage`);
    console.log('💡 This should switch to the info tab and scroll to the media coverage section');
    
  } catch (error) {
    console.error('❌ Failed to send Article Published Email:', error);
  }
};

testArticlePublishedEmail().catch(console.error); 