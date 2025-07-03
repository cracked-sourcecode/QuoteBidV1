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

async function sendAllEmailsOrganized() {
  console.log('📧 SENDING ALL QUOTEBID EMAILS - FINAL ORGANIZED VERSION\n');
  
  // =============================================================
  // 🔔 ALERTS CATEGORY (2 emails) - User can disable "alerts"
  // =============================================================
  console.log('🔔 ALERTS CATEGORY (User can disable "alerts")...\n');
  
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
    subject: '1️⃣ New Opportunity Alert - ALERTS CATEGORY',
    html: newOpportunityHtml,
  });
  console.log('✅ 1. New Opportunity Alert sent');

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
    subject: '2️⃣ Saved Opportunity Reminder - ALERTS CATEGORY',
    html: savedOpportunityHtml,
  });
  console.log('✅ 2. Saved Opportunity Alert sent\n');

  // =============================================================
  // 📢 NOTIFICATIONS CATEGORY (6 emails) - User can disable "notifications"  
  // =============================================================
  console.log('📢 NOTIFICATIONS CATEGORY (User can disable "notifications")...\n');
  
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
    subject: '3️⃣ Pitch Sent - NOTIFICATIONS CATEGORY',
    html: pitchSentHtml,
  });
  console.log('✅ 3. Pitch Sent sent');

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
    subject: '4️⃣ Pitch Interested - NOTIFICATIONS CATEGORY',
    html: pitchInterestedHtml,
  });
  console.log('✅ 4. Pitch Interested sent');

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
    subject: '5️⃣ Pitch Rejected - NOTIFICATIONS CATEGORY',
    html: pitchRejectedHtml,
  });
  console.log('✅ 5. Pitch Rejected sent');

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
    subject: '6️⃣ Pitch Submitted - NOTIFICATIONS CATEGORY',
    html: pitchSubmittedHtml,
  });
  console.log('✅ 6. Pitch Submitted sent');

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
    subject: '7️⃣ Article Published - NOTIFICATIONS CATEGORY',
    html: articlePublishedHtml,
  });
  console.log('✅ 7. Article Published sent');

  // 8. Draft Reminder
  let draftReminderHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/draft-reminder.html'), 'utf8')
    .replace(/{{userFirstName}}/g, 'Ben')
    .replace(/{{opportunityTitle}}/g, 'Cryptocurrency Market Analysis Story')
    .replace(/{{opportunityDescription}}/g, 'Crypto experts needed to discuss institutional adoption trends and regulatory developments.')
    .replace(/{{opportunityId}}/g, '789')
    .replace(/{{frontendUrl}}/g, frontendUrl);
    
  await resend.emails.send({
    from: 'QuoteBid <noreply@quotebid.co>',
    to: [emailTo],
    subject: '8️⃣ Draft Reminder - NOTIFICATIONS CATEGORY',
    html: draftReminderHtml,
  });
  console.log('✅ 8. Draft Reminder sent\n');

  // =============================================================
  // 💰 BILLING CATEGORY (2 emails) - User can disable "billing"
  // =============================================================
  console.log('💰 BILLING CATEGORY (User can disable "billing")...\n');
  
  // 9. Billing Confirmation
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
    subject: '9️⃣ Billing Confirmation - BILLING CATEGORY',
    html: billingConfirmationHtml,
  });
  console.log('✅ 9. Billing Confirmation sent');

  // 10. Subscription Renewal Failed
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
    subject: '🔟 Subscription Renewal Failed - BILLING CATEGORY',
    html: subscriptionFailedHtml,
  });
  console.log('✅ 10. Subscription Renewal Failed sent\n');

  // =============================================================
  // 🔧 ALWAYS SEND CATEGORY (3 emails) - Cannot be disabled
  // =============================================================
  console.log('🔧 ALWAYS SEND CATEGORY (Cannot be disabled)...\n');
  
  // 11. Welcome Email
  let welcomeHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/welcome.html'), 'utf8')
    .replace(/{{userFirstName}}/g, 'Ben')
    .replace(/{{username}}/g, 'ben_deveran')
    .replace(/{{frontendUrl}}/g, frontendUrl);
    
  await resend.emails.send({
    from: 'QuoteBid <noreply@quotebid.co>',
    to: [emailTo],
    subject: '1️⃣1️⃣ Welcome Email - ALWAYS SEND',
    html: welcomeHtml,
  });
  console.log('✅ 11. Welcome Email sent');

  // 12. Password Reset
  let passwordResetHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/password-reset.html'), 'utf8')
    .replace(/{{userFirstName}}/g, 'Ben')
    .replace(/{{resetUrl}}/g, frontendUrl + '/reset-password?token=sample-reset-token-123')
    .replace(/{{frontendUrl}}/g, frontendUrl);
    
  await resend.emails.send({
    from: 'QuoteBid <noreply@quotebid.co>',
    to: [emailTo],
    subject: '1️⃣2️⃣ Password Reset - ALWAYS SEND',
    html: passwordResetHtml,
  });
  console.log('✅ 12. Password Reset sent');

  // 13. Payment Processed
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
    subject: '1️⃣3️⃣ Payment Processed - ALWAYS SEND',
    html: billingPaymentHtml,
  });
  console.log('✅ 13. Payment Processed sent\n');

  console.log('🎉 ALL 13 EMAILS SENT IN ORGANIZED ORDER!');
  console.log('\n📊 FINAL SUMMARY:');
  console.log('🔔 ALERTS: 2 emails (user can disable)');
  console.log('📢 NOTIFICATIONS: 6 emails (user can disable)');  
  console.log('💰 BILLING: 2 emails (user can disable)');
  console.log('🔧 ALWAYS SEND: 3 emails (cannot disable)');
  console.log('\n✅ Clean, organized, and properly categorized!');
}

sendAllEmailsOrganized().catch(console.error); 