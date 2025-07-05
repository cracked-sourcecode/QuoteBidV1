const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Test pitch-sent email with edit button
async function testPitchSentEmail() {
  console.log('🧪 Testing pitch-sent email with edit button...');
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';
  
  const testData = {
    userFirstName: 'Ben',
    email: 'bendeveran@gmail.com',
    opportunityTitle: 'Test Opportunity for Edit Modal',
    publicationName: 'Test Publication',
    securedPrice: '$250',
    pitchId: 123
  };
  
  console.log('📧 Test data:', testData);
  console.log('🔗 Expected edit URL: /my-pitches?edit=123');
  
  try {
    // Load template
    const templatePath = path.join(__dirname, 'server/email-templates/pitch-sent.html');
    let emailHtml = fs.readFileSync(templatePath, 'utf8');
    
    // Replace template variables
    emailHtml = emailHtml
      .replace(/\{\{userFirstName\}\}/g, testData.userFirstName)
      .replace(/\{\{opportunityTitle\}\}/g, testData.opportunityTitle)
      .replace(/\{\{publicationName\}\}/g, testData.publicationName)
      .replace(/\{\{securedPrice\}\}/g, testData.securedPrice)
      .replace(/\{\{pitchId\}\}/g, testData.pitchId)
      .replace(/\{\{frontendUrl\}\}/g, frontendUrl);
    
    // Check if the edit URL is correct
    const editUrlPattern = `/my-pitches\\?edit=${testData.pitchId}`;
    const hasCorrectEditUrl = emailHtml.includes(`/my-pitches?edit=${testData.pitchId}`);
    
    console.log('✅ Template variables replaced successfully');
    console.log('🔗 Edit URL check:', hasCorrectEditUrl ? '✅ CORRECT' : '❌ MISSING');
    
    if (hasCorrectEditUrl) {
      console.log('📧 Sending test email...');
      
      const result = await resend.emails.send({
        from: 'QuoteBid <noreply@quotebid.co>',
        to: testData.email,
        subject: 'TEST: Pitch Received - Edit Button Test 📤',
        html: emailHtml
      });
      
      console.log('✅ Email sent successfully!');
      console.log('📧 Result:', result);
      
      console.log('\n🎯 To test the edit modal functionality:');
      console.log('1. Check your email for the "Edit Pitch" button');
      console.log('2. Click the button - it should take you to /my-pitches?edit=123');
      console.log('3. The edit modal should auto-open for pitch ID 123');
      console.log('4. The modal should show the correct opportunity title');
    } else {
      console.error('❌ Edit URL not found in template!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPitchSentEmail(); 