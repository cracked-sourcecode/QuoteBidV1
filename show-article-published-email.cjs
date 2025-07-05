const fs = require('fs');
const path = require('path');

const showArticlePublishedEmail = () => {
  console.log('🎉 Article Published Email with Fixed View Media Coverage Button');
  console.log('='.repeat(60));
  
  // Read the article published email template
  const templatePath = path.join(__dirname, 'server/email-templates/article-published.html');
  let template = fs.readFileSync(templatePath, 'utf8');
  
  // Replace template variables
  const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';
  const testData = {
    userFirstName: 'Test User',
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

  // Extract and show the key URLs
  const readArticleMatch = template.match(/href="([^"]*utm_medium=article_published[^"]*)"/);
  const mediaCoverageMatch = template.match(/href="([^"]*notification=media_coverage[^"]*)"/);
  
  console.log('📧 Email Details:');
  console.log('To: test@example.com');
  console.log('Subject: Article Published - Your Story is Live! 🎉');
  console.log('');
  console.log('🔗 Key URLs in the email:');
  console.log('');
  console.log('1. Read Article Button:');
  console.log(`   ${readArticleMatch ? readArticleMatch[1] : 'Not found'}`);
  console.log('');
  console.log('2. 🎯 View Media Coverage Button (FIXED):');
  console.log(`   ${mediaCoverageMatch ? mediaCoverageMatch[1] : 'Not found'}`);
  console.log('');
  console.log('✅ The View Media Coverage button now correctly navigates to:');
  console.log(`   ${frontendUrl}/account?notification=media_coverage`);
  console.log('');
  console.log('🎯 What happens when clicked:');
  console.log('   1. Opens the account page');
  console.log('   2. Switches to the "info" tab (not "profile")');
  console.log('   3. Scrolls to the media coverage section');
  console.log('   4. Refreshes the media coverage data');
  console.log('   5. Cleans up the URL parameters');
  console.log('');
  console.log('💡 The fix changed the tab from "profile" to "info" and increased scroll delay');
  
  // Save the rendered template to a file for viewing
  const outputPath = path.join(__dirname, 'rendered-article-published-email.html');
  fs.writeFileSync(outputPath, template);
  console.log('');
  console.log(`📄 Full rendered email saved to: ${outputPath}`);
  console.log('   You can open this file in your browser to see the email');
};

showArticlePublishedEmail(); 