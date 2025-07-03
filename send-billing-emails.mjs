import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBillingEmails() {
  const frontendUrl = 'https://quotebid.co';
  const emailTo = 'ben@rubiconprgroup.com';
  
  console.log('📧 Sending all billing emails to:', emailTo);
  
  const billingEmails = [
    {
      name: 'Billing Confirmation',
      template: 'billing-confirmation.html',
      subject: 'Receipt: Your QuoteBid Placement - Bloomberg',
      replacements: {
        '{{receiptNumber}}': 'QB-' + Date.now(),
        '{{articleTitle}}': 'AI Revolution in Financial Services',
        '{{publicationName}}': 'Bloomberg',
        '{{publishDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{{billingDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{{placementFee}}': '285.00',
        '{{platformFee}}': '42.75',
        '{{totalAmount}}': '327.75',
        '{{cardBrand}}': 'Visa',
        '{{cardLast4}}': '4242',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Billing Payment',
      template: 'billing-payment.html',
      subject: 'Payment Processed - Published in TechCrunch',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{userEmail}}': emailTo,
        '{{publicationName}}': 'TechCrunch',
        '{{articleTitle}}': 'Startup Funding Trends Drive Q1 2025 Growth',
        '{{articleUrl}}': 'https://techcrunch.com/2025/01/18/startup-funding-trends-q1-2025',
        '{{billingAmount}}': '295.00',
        '{{paymentMethod}}': 'Visa ending in 4242',
        '{{stripeReceiptUrl}}': 'https://pay.stripe.com/receipts/payment/demo-receipt-url',
        '{{frontendUrl}}': frontendUrl
      }
    },
    {
      name: 'Subscription Renewal Failed',
      template: 'subscription-renewal-failed.html',
      subject: 'Action Required: QuoteBid Subscription Payment Failed',
      replacements: {
        '{{userFirstName}}': 'Ben',
        '{{subscriptionPlan}}': 'QuoteBid Premium',
        '{{monthlyAmount}}': '99.99',
        '{{nextAttemptDate}}': new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        '{{cardLast4}}': '4242',
        '{{frontendUrl}}': frontendUrl
      }
    }
  ];

  for (const email of billingEmails) {
    try {
      console.log(`\n📧 Sending ${email.name}...`);
      
      let emailHtml = fs.readFileSync(
        path.join(__dirname, 'server/email-templates', email.template), 
        'utf8'
      );
      
      // Apply replacements
      Object.entries(email.replacements).forEach(([key, value]) => {
        emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
      });
      
      await resend.emails.send({
        from: 'QuoteBid <noreply@quotebid.co>',
        to: [emailTo],
        subject: `${email.subject} - BILLING EMAIL TEST`,
        html: emailHtml,
      });
      
      console.log(`✅ ${email.name} sent successfully`);
      
    } catch (error) {
      console.error(`❌ Error sending ${email.name}:`, error);
    }
  }
  
  console.log('\n🎉 All billing emails sent!');
  
  // Also send the placement notification email (4th billing email)
  try {
    console.log('\n📧 Sending Placement Notification (4th billing email)...');
    
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
      subject: '🎉 Your Expertise Was Featured in Wall Street Journal! - BILLING EMAIL TEST',
      html: placementHtml,
    });
    
    console.log('✅ Placement Notification sent successfully');
    
  } catch (error) {
    console.error('❌ Error sending Placement Notification:', error);
  }
  
  console.log('\n🎉 All 4 billing emails sent to', emailTo);
}

sendBillingEmails().catch(console.error); 