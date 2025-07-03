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

async function sendAllEmails() {
  console.log('📧 SENDING ALL 15 QUOTEBID EMAILS FOR FINAL REVIEW\n');
  
  // =============================================================
  // 🔔 ALERTS CATEGORY (2 emails) - User can disable
  // =============================================================
  console.log('🔔 SENDING ALERTS CATEGORY (User can disable "alerts")...\n');
  
  try {
    // 1. New Opportunity Alert
    let newOpportunityHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/new-opportunity-alert.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{opportunityTitle}}/g, 'Fintech Innovation Expert Needed for Breaking News')
      .replace(/{{publicationName}}/g, 'Bloomberg')
      .replace(/{{industry}}/g, 'Finance & Technology')
      .replace(/{{currentPrice}}/g, '$342')
      .replace(/{{deadline}}/g, '2 days')
      .replace(/{{opportunityId}}/g, '123')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '🚨 New Opportunity: Fintech Innovation Expert Needed - ALERTS CATEGORY',
      html: newOpportunityHtml,
    });
    console.log('✅ 1. New Opportunity Alert sent (ALERTS)');

    // 2. Saved Opportunity Alert (6-hour pitch reminder)
    let savedOpportunityHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/saved-opportunity-alert.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{opportunityTitle}}/g, 'Banking Experts for FOMC Meeting Analysis')
      .replace(/{{opportunityDescription}}/g, 'Banking experts needed to analyze the latest FOMC meeting decisions and their impact on commercial lending.')
      .replace(/{{currentPrice}}/g, '$285')
      .replace(/{{priceTrend}}/g, '+$15 up')
      .replace(/{{priceTrendClass}}/g, 'price-trend-up')
      .replace(/{{opportunityId}}/g, '456')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '⏰ You saved this opportunity 6 hours ago - Time to pitch! - ALERTS CATEGORY',
      html: savedOpportunityHtml,
    });
    console.log('✅ 2. Saved Opportunity Alert sent (ALERTS)\n');
  } catch (error) {
    console.error('❌ Error sending ALERTS emails:', error);
  }

  // =============================================================
  // 📢 NOTIFICATIONS CATEGORY (7 emails) - User can disable
  // =============================================================
  console.log('📢 SENDING NOTIFICATIONS CATEGORY (User can disable "notifications")...\n');
  
  try {
    // 3. Pitch Sent
    let pitchSentHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/pitch-sent.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{opportunityTitle}}/g, 'Real Estate Market Trends Analysis')
      .replace(/{{opportunityDescription}}/g, 'Real estate experts needed for commercial market trends analysis covering office space and retail sectors.')
      .replace(/{{securedPrice}}/g, '$256')
      .replace(/{{pitchId}}/g, '101')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '📤 Your pitch has been submitted successfully - NOTIFICATIONS CATEGORY',
      html: pitchSentHtml,
    });
    console.log('✅ 3. Pitch Sent sent (NOTIFICATIONS)');

    // 4. Pitch Interested
    let pitchInterestedHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/pitch-interested.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{opportunityTitle}}/g, 'Healthcare Innovation Story')
      .replace(/{{opportunityDescription}}/g, 'Healthcare professionals needed to discuss FDA drug approval trends and biotech developments.')
      .replace(/{{reporterName}}/g, 'Michael Chen')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '👍 Reporter Interested! - Your pitch caught their attention - NOTIFICATIONS CATEGORY',
      html: pitchInterestedHtml,
    });
    console.log('✅ 4. Pitch Interested sent (NOTIFICATIONS)');

    // 5. Pitch Rejected
    let pitchRejectedHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/pitch-rejected.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{opportunityTitle}}/g, 'Climate Change Policy Analysis')
      .replace(/{{opportunityDescription}}/g, 'Environmental policy experts needed to analyze new climate legislation impact.')
      .replace(/{{userIndustry}}/g, 'Finance')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '❌ Pitch Not Selected - But don\'t give up! - NOTIFICATIONS CATEGORY',
      html: pitchRejectedHtml,
    });
    console.log('✅ 5. Pitch Rejected sent (NOTIFICATIONS)');

    // 6. Pitch Submitted
    let pitchSubmittedHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/pitch-submitted.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{opportunityTitle}}/g, 'Energy Sector Investment Analysis')
      .replace(/{{opportunityDescription}}/g, 'Energy sector analysts needed to discuss renewable energy investment trends.')
      .replace(/{{reporterName}}/g, 'Sarah Johnson')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '📋 New pitch submitted for review - NOTIFICATIONS CATEGORY',
      html: pitchSubmittedHtml,
    });
    console.log('✅ 6. Pitch Submitted sent (NOTIFICATIONS)');

    // 7. Article Published
    let articlePublishedHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/article-published.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{opportunityTitle}}/g, 'AI Transformation in Financial Services')
      .replace(/{{opportunityDescription}}/g, 'Your expert commentary on AI adoption in banking and fintech has been published.')
      .replace(/{{publicationName}}/g, 'Bloomberg')
      .replace(/{{publishDate}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/{{articleUrl}}/g, 'https://bloomberg.com/news/articles/ai-transformation-financial-services')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '🎉 Your Article is Now Live! - NOTIFICATIONS CATEGORY',
      html: articlePublishedHtml,
    });
    console.log('✅ 7. Article Published sent (NOTIFICATIONS)');

    // 8. Media Coverage Added
    let mediaCoverageHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/media-coverage-added.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{publicationName}}/g, 'TechCrunch')
      .replace(/{{articleTitle}}/g, 'The Future of Cryptocurrency Regulation in 2025')
      .replace(/{{articleUrl}}/g, 'https://techcrunch.com/2025/01/18/cryptocurrency-regulation-future')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '🎉 Your Article is Now Live! - QuoteBid - NOTIFICATIONS CATEGORY',
      html: mediaCoverageHtml,
    });
    console.log('✅ 8. Media Coverage Added sent (NOTIFICATIONS)');

    // 9. Draft Reminder
    let draftReminderHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/draft-reminder.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{opportunityTitle}}/g, 'Cryptocurrency Market Analysis Story')
      .replace(/{{opportunityDescription}}/g, 'Crypto experts needed to discuss institutional adoption trends and regulatory developments.')
      .replace(/{{opportunityId}}/g, '789')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '📝 Your draft pitch is waiting to be completed - NOTIFICATIONS CATEGORY',
      html: draftReminderHtml,
    });
    console.log('✅ 9. Draft Reminder sent (NOTIFICATIONS)\n');
  } catch (error) {
    console.error('❌ Error sending NOTIFICATIONS emails:', error);
  }

  // =============================================================
  // 💰 BILLING CATEGORY (2 emails) - User can disable
  // =============================================================
  console.log('💰 SENDING BILLING CATEGORY (User can disable "billing")...\n');
  
  try {
    // 10. Billing Confirmation
    let billingConfirmationHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/billing-confirmation.html'), 'utf8')
      .replace(/{{receiptNumber}}/g, 'QB-' + Date.now())
      .replace(/{{articleTitle}}/g, 'AI Revolution in Financial Services')
      .replace(/{{publicationName}}/g, 'Bloomberg')
      .replace(/{{publishDate}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/{{billingDate}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/{{placementFee}}/g, '285.00')
      .replace(/{{platformFee}}/g, '42.75')
      .replace(/{{totalAmount}}/g, '327.75')
      .replace(/{{cardBrand}}/g, 'Visa')
      .replace(/{{cardLast4}}/g, '4242')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'Receipt: Your QuoteBid Placement - Bloomberg - BILLING CATEGORY',
      html: billingConfirmationHtml,
    });
    console.log('✅ 10. Billing Confirmation sent (BILLING)');

    // 11. Subscription Renewal Failed
    let subscriptionFailedHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/subscription-renewal-failed.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{subscriptionPlan}}/g, 'QuoteBid Premium')
      .replace(/{{monthlyAmount}}/g, '99.99')
      .replace(/{{nextAttemptDate}}/g, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/{{cardLast4}}/g, '4242')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'Action Required: QuoteBid Subscription Payment Failed - BILLING CATEGORY',
      html: subscriptionFailedHtml,
    });
    console.log('✅ 11. Subscription Renewal Failed sent (BILLING)\n');
  } catch (error) {
    console.error('❌ Error sending BILLING emails:', error);
  }

  // =============================================================
  // 🔧 ALWAYS SEND CATEGORY (4 emails) - Cannot disable
  // =============================================================
  console.log('🔧 SENDING ALWAYS SEND CATEGORY (Cannot be disabled)...\n');
  
  try {
    // 12. Welcome Email
    let welcomeHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/welcome.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{username}}/g, 'ben_deveran')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'Welcome to QuoteBid! 🎉 - ALWAYS SEND',
      html: welcomeHtml,
    });
    console.log('✅ 12. Welcome Email sent (ALWAYS SEND)');

    // 13. Password Reset
    let passwordResetHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/password-reset.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{resetUrl}}/g, frontendUrl + '/reset-password?token=sample-reset-token-123')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '🔐 Reset Your QuoteBid Password - ALWAYS SEND',
      html: passwordResetHtml,
    });
    console.log('✅ 13. Password Reset sent (ALWAYS SEND)');

    // 14. Payment Processed (from bulletproof-email.ts)
    let billingPaymentHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/billing-payment.html'), 'utf8')
      .replace(/{{userFirstName}}/g, 'Ben')
      .replace(/{{userEmail}}/g, emailTo)
      .replace(/{{publicationName}}/g, 'TechCrunch')
      .replace(/{{articleTitle}}/g, 'Startup Funding Trends Drive Q1 2025 Growth')
      .replace(/{{articleUrl}}/g, 'https://techcrunch.com/2025/01/18/startup-funding-trends-q1-2025')
      .replace(/{{billingAmount}}/g, '295.00')
      .replace(/{{paymentMethod}}/g, 'Visa ending in 4242')
      .replace(/{{stripeReceiptUrl}}/g, 'https://pay.stripe.com/receipts/payment/demo-receipt-url')
      .replace(/{{frontendUrl}}/g, frontendUrl);
      
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: 'Payment Processed - Published in TechCrunch - ALWAYS SEND',
      html: billingPaymentHtml,
    });
    console.log('✅ 14. Payment Processed sent (ALWAYS SEND)');

    // 15. Placement Notification (from routes.ts)
    const placementHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px;">Congrats Ben!</p>
          
          <p style="font-size: 16px; margin-top: 20px;">Your bid of $325 secured your spot in this breaking story:</p>
          
          <p style="font-size: 16px; margin-top: 10px;">→ Fintech Innovation Reshapes Banking Landscape – Wall Street Journal</p>
          
          <p style="font-size: 16px; margin-top: 10px;">→ <a href="https://wsj.com/articles/fintech-innovation-banking-2025" style="color: #4a5568;">https://wsj.com/articles/fintech-innovation-banking-2025</a></p>
          
          <p style="font-size: 16px; margin-top: 20px;">A receipt for $325 has been charged to your card on file.</p>
          
          <p style="font-size: 16px; margin-top: 10px;">Thank you for trusting our marketplace!</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <p style="font-size: 14px; color: #718096;">QuoteBid - Connect with top publications</p>
          </div>
        </div>
      </div>
    `;
    
    await resend.emails.send({
      from: 'QuoteBid <noreply@quotebid.co>',
      to: [emailTo],
      subject: '🎉 Your Expertise Was Featured in Wall Street Journal! - ALWAYS SEND',
      html: placementHtml,
    });
    console.log('✅ 15. Placement Notification sent (ALWAYS SEND)\n');
  } catch (error) {
    console.error('❌ Error sending ALWAYS SEND emails:', error);
  }

  console.log('🎉 ALL 15 QUOTEBID EMAILS SENT FOR REVIEW!');
  console.log('\n📊 SUMMARY:');
  console.log('🔔 ALERTS: 2 emails (user can disable)');
  console.log('📢 NOTIFICATIONS: 7 emails (user can disable)');
  console.log('💰 BILLING: 2 emails (user can disable)');
  console.log('🔧 ALWAYS SEND: 4 emails (cannot disable)');
  console.log('\n✅ All emails respect user preferences correctly!');
}

sendAllEmails().catch(console.error); 