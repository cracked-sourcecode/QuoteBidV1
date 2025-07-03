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

async function sendProductionEmails() {
  
  // ALERTS CATEGORY
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
    subject: 'New opportunity in Bloomberg has been added to QuoteBid',
    html: newOpportunityHtml,
  });

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
    subject: 'You saved this opportunity 6 hours ago, but haven\'t submitted your pitch yet',
    html: savedOpportunityHtml,
  });

  // NOTIFICATIONS CATEGORY
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
    subject: 'Your pitch has been submitted successfully',
    html: pitchSentHtml,
  });

  let pitchInterestedHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/pitch-interested.html'), 'utf8')
    .replace(/{{userFirstName}}/g, 'Ben')
    .replace(/{{opportunityTitle}}/g, 'Healthcare Innovation Story')
    .replace(/{{opportunityDescription}}/g, 'Healthcare professionals needed to discuss FDA drug approval trends and biotech developments.')
    .replace(/{{reporterName}}/g, 'Michael Chen')
    .replace(/{{frontendUrl}}/g, frontendUrl);
    
  await resend.emails.send({
    from: 'QuoteBid <noreply@quotebid.co>',
    to: [emailTo],
    subject: 'Reporter Interested! - Your pitch caught their attention',
    html: pitchInterestedHtml,
  });

  let pitchRejectedHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/pitch-rejected.html'), 'utf8')
    .replace(/{{userFirstName}}/g, 'Ben')
    .replace(/{{opportunityTitle}}/g, 'Climate Change Policy Analysis')
    .replace(/{{opportunityDescription}}/g, 'Environmental policy experts needed to analyze new climate legislation impact.')
    .replace(/{{userIndustry}}/g, 'Finance')
    .replace(/{{frontendUrl}}/g, frontendUrl);
    
  await resend.emails.send({
    from: 'QuoteBid <noreply@quotebid.co>',
    to: [emailTo],
    subject: 'Pitch Not Selected - But don\'t give up!',
    html: pitchRejectedHtml,
  });

  let pitchSubmittedHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/pitch-submitted.html'), 'utf8')
    .replace(/{{userFirstName}}/g, 'Ben')
    .replace(/{{opportunityTitle}}/g, 'Energy Sector Investment Analysis')
    .replace(/{{opportunityDescription}}/g, 'Energy sector analysts needed to discuss renewable energy investment trends.')
    .replace(/{{reporterName}}/g, 'Sarah Johnson')
    .replace(/{{frontendUrl}}/g, frontendUrl);
    
  await resend.emails.send({
    from: 'QuoteBid <noreply@quotebid.co>',
    to: [emailTo],
    subject: 'New pitch submitted for review',
    html: pitchSubmittedHtml,
  });

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
    subject: 'Your Article is Now Live!',
    html: articlePublishedHtml,
  });

  let draftReminderHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/draft-reminder.html'), 'utf8')
    .replace(/{{userFirstName}}/g, 'Ben')
    .replace(/{{opportunityTitle}}/g, 'Cryptocurrency Market Analysis Story')
    .replace(/{{opportunityDescription}}/g, 'Crypto experts needed to discuss institutional adoption trends and regulatory developments.')
    .replace(/{{opportunityId}}/g, '789')
    .replace(/{{frontendUrl}}/g, frontendUrl);
    
  await resend.emails.send({
    from: 'QuoteBid <noreply@quotebid.co>',
    to: [emailTo],
    subject: 'Your draft pitch is waiting to be completed',
    html: draftReminderHtml,
  });

  // BILLING CATEGORY
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
    subject: 'Receipt: Your QuoteBid Placement - Bloomberg',
    html: billingConfirmationHtml,
  });

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
    subject: 'Action Required: QuoteBid Subscription Payment Failed',
    html: subscriptionFailedHtml,
  });

  // ALWAYS SEND CATEGORY
  let welcomeHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/welcome.html'), 'utf8')
    .replace(/{{userFirstName}}/g, 'Ben')
    .replace(/{{username}}/g, 'ben_deveran')
    .replace(/{{frontendUrl}}/g, frontendUrl);
    
  await resend.emails.send({
    from: 'QuoteBid <noreply@quotebid.co>',
    to: [emailTo],
    subject: 'Welcome to QuoteBid!',
    html: welcomeHtml,
  });

  let passwordResetHtml = fs.readFileSync(path.join(__dirname, 'server/email-templates/password-reset.html'), 'utf8')
    .replace(/{{userFirstName}}/g, 'Ben')
    .replace(/{{resetUrl}}/g, frontendUrl + '/reset-password?token=sample-reset-token-123')
    .replace(/{{frontendUrl}}/g, frontendUrl);
    
  await resend.emails.send({
    from: 'QuoteBid <noreply@quotebid.co>',
    to: [emailTo],
    subject: 'Reset Your QuoteBid Password',
    html: passwordResetHtml,
  });

  console.log('All 12 emails sent with production subject lines');
}

sendProductionEmails().catch(console.error); 