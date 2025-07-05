import { sendEmail } from './server/lib/email-production.ts';

const testArticlePublishedEmail = async () => {
  console.log('🎉 Testing Article Published Email with Fixed View Media Coverage Button...');
  
  const testUserData = {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  };

  const testPitchData = {
    id: 123,
    articleTitle: 'Revolutionary AI Breakthrough: New Technology Transforms Healthcare',
    articleUrl: 'https://techcrunch.com/2024/ai-healthcare-breakthrough',
    opportunity: {
      title: 'AI in Healthcare Expert Needed',
      publication: {
        name: 'TechCrunch',
        logo: 'https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon-gradient.png'
      }
    }
  };

  try {
    await sendEmail({
      to: testUserData.email,
      subject: 'Article Published - Your Story is Live! 🎉',
      template: 'article-published',
      data: {
        userFirstName: testUserData.firstName,
        articleTitle: testPitchData.articleTitle,
        articleUrl: testPitchData.articleUrl,
        publicationName: testPitchData.opportunity.publication.name,
        publicationLogo: testPitchData.opportunity.publication.logo
      }
    });

    console.log('✅ Article Published Email sent successfully!');
    console.log('📧 Check your email for the article published notification');
    console.log('🔗 Test the "View Media Coverage" button - it should now properly navigate to the account page and scroll to the media coverage section');
    
  } catch (error) {
    console.error('❌ Failed to send Article Published Email:', error);
  }
};

testArticlePublishedEmail().catch(console.error); 