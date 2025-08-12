import { sendAdminPitchNotification } from './server/lib/email-production.js';

console.log('🔍 Testing admin email notification...');

try {
  const result = await sendAdminPitchNotification({
    // Pitch details
    pitchId: 999,
    pitchContent: "Test pitch content for debugging why Juan isn't receiving emails.",
    pitchType: 'Text',
    bidAmount: 150,
    submittedAt: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }),
    
    // User details
    userFullName: 'Debug User',
    userEmail: 'debug@test.com',
    userUsername: 'debuguser',
    userTitle: 'Test Expert',
    userCompany: 'Test Company',
    
    // Opportunity details
    opportunityTitle: 'Debug Opportunity - Testing Admin Email',
    publicationName: 'Test Publication',
    industry: 'Technology',
    currentPrice: '150',
    deadline: 'January 30, 2025'
  });

  console.log('📧 Result:', result);
  
  if (result.success) {
    console.log('✅ Email sent successfully!');
    console.log('📬 Recipients:', result.recipients);
    console.log('🆔 Email ID:', result.id);
  } else {
    console.log('❌ Email failed:', result.error);
  }
} catch (error) {
  console.error('💥 Script error:', error);
} 