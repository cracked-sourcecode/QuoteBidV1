// Test script to verify opportunity email system
const fetch = globalThis.fetch || require('node-fetch');

async function testOpportunityEmail() {
  console.log('🧪 Testing Opportunity Email System...\n');
  
  // Replace with your actual server URL and test email
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5051';
  const testEmail = process.env.TEST_EMAIL || 'ben@rubiconprgroup.com';
  
  try {
    console.log(`📧 Sending test opportunity alert email to: ${testEmail}`);
    
    const response = await fetch(`${serverUrl}/api/test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        type: 'OPPORTUNITY_ALERT',
        username: 'TestUser',
        fullName: 'Test User'
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ SUCCESS:', result.message);
      console.log('\n📧 Check your email inbox for the test opportunity alert!');
      
      // Test email preview
      console.log('\n🔍 Testing email preview...');
      const previewResponse = await fetch(`${serverUrl}/api/email-preview/opportunity-alert`);
      if (previewResponse.ok) {
        console.log('✅ Email preview endpoint working');
        console.log(`📖 Preview URL: ${serverUrl}/api/email-preview/opportunity-alert`);
      } else {
        console.log('❌ Email preview endpoint failed');
      }
      
    } else {
      console.log('❌ FAILED:', result.message || 'Unknown error');
      console.log('Response:', result);
    }
    
  } catch (error) {
    console.error('❌ ERROR testing email system:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure your server is running on port 5051');
    console.log('2. Check that RESEND_API_KEY is set in environment');
    console.log('3. Verify EMAIL_FROM is configured');
    console.log('4. Check server logs for any errors');
  }
}

// Run the test
testOpportunityEmail(); 