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

async function sendBillingEmails() {
  const frontendUrl = 'https://quotebid.co';
  const emailTo = 'ben@rubiconprgroup.com';
  
  console.log('📧 SENDING ALL BILLING EMAILS TO:', emailTo);
  
  // 1. Billing Confirmation
  try {
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
    console.log('✅ 1. Billing Confirmation sent');
  } catch (error) {
    console.error('❌ Error sending Billing Confirmation:', error);
  }

  // 2. Billing Payment
  try {
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
      subject: 'Payment Processed - Published in TechCrunch',
      html: billingPaymentHtml,
    });
    console.log('✅ 2. Billing Payment sent');
  } catch (error) {
    console.error('❌ Error sending Billing Payment:', error);
  }

  // 3. Subscription Renewal Failed
  try {
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
    console.log('✅ 3. Subscription Renewal Failed sent');
  } catch (error) {
    console.error('❌ Error sending Subscription Renewal Failed:', error);
  }

  // 4. Placement Notification (inline HTML - this is from routes.ts)
  try {
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
      subject: '🎉 Your Expertise Was Featured in Wall Street Journal!',
      html: placementHtml,
    });
    console.log('✅ 4. Placement Notification sent');
  } catch (error) {
    console.error('❌ Error sending Placement Notification:', error);
  }
  
  console.log('\n🎉 ALL 4 BILLING EMAILS SENT TO', emailTo);
}

sendBillingEmails().catch(console.error); 