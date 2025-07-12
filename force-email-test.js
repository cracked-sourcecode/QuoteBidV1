// Force send opportunity email immediately (for testing)
const fetch = globalThis.fetch || require('node-fetch');

async function forceSendOpportunityEmail() {
  console.log('🚀 FORCE SENDING OPPORTUNITY EMAIL TEST...\n');
  
  const serverUrl = 'http://localhost:5051';
  const testEmail = 'ben@rubiconprgroup.com'; // Change to your email
  
  try {
    // 1. Test the email endpoint directly
    console.log('📧 Testing direct email send...');
    const response = await fetch(`${serverUrl}/api/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        type: 'OPPORTUNITY_ALERT',
        username: 'TestUser',
        fullName: 'Test User'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ SUCCESS! Email sent to:', testEmail);
      console.log('Message:', result.message);
      console.log('\n📱 Check your email inbox now!');
    } else {
      console.log('❌ FAILED:', result.message);
    }
    
    // 2. Check if there are any real opportunities that need emails
    console.log('\n🔍 Checking for real opportunities needing emails...');
    
    // This would require database access - for now just suggest manual check
    console.log('💡 To check real opportunities:');
    console.log('1. Go to admin panel');
    console.log('2. Create a test opportunity');
    console.log('3. Watch server logs for email activity');
    console.log('4. Check if users have industries set');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('\n🔧 Make sure:');
    console.log('- Server is running on port 5051');
    console.log('- RESEND_API_KEY is set');
    console.log('- EMAIL_FROM is configured');
  }
}

// Run the test
forceSendOpportunityEmail(); 