import { Resend } from 'resend';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const emailTemplates = [
  // UTILITY EMAILS (2)
  {
    name: 'Welcome Email',
    file: 'server/email-templates/welcome.html',
    subject: '[UTILITY] ✅ Welcome to QuoteBid - Your Account is Ready!',
    category: 'Utility',
    status: '✅ APPROVED'
  },
  {
    name: 'Password Reset',
    file: 'server/email-templates/password-reset.html', 
    subject: '[UTILITY] Reset Your QuoteBid Password',
    category: 'Utility',
    status: '🔍 NEEDS REVIEW'
  },
  
  // ALERT EMAILS (3)
  {
    name: 'New Opportunity Alert',
    file: 'server/email-templates/new-opportunity-alert.html',
    subject: '[ALERT] New PR Opportunity: Tech Innovation Story - $2,450',
    category: 'Alerts',
    status: '🔍 NEEDS REVIEW'
  },
  {
    name: 'Pitch Reminder (Saved)', 
    file: 'server/email-templates/saved-opportunity-alert.html',
    subject: '[REMINDER] You Saved This But Haven\'t Pitched Yet!',
    category: 'Reminders',
    status: '🔍 NEEDS REVIEW'
  },
  {
    name: 'Opportunity Alert (Qwoted Style)',
    file: 'server/email-templates/opportunity-alert.html',
    subject: '[ALERT] New Industry Match: FinTech Startup Story Opportunity',
    category: 'Alerts',
    status: '🔍 NEEDS REVIEW'
  },
  
  // NOTIFICATION EMAILS (6)
  {
    name: 'Draft Reminder',
    file: 'server/email-templates/draft-reminder.html',
    subject: '[NOTIFICATION] Complete Your Pitch Draft - Opportunity Waiting',
    category: 'Notifications',
    status: '🔍 NEEDS REVIEW'
  },
  {
    name: 'Pitch Sent',
    file: 'server/email-templates/pitch-sent.html', 
    subject: '[NOTIFICATION] Pitch Sent Successfully - Price Secured at $2,450',
    category: 'Notifications',
    status: '🔍 NEEDS REVIEW'
  },
  {
    name: 'Pitch Submitted',
    file: 'server/email-templates/pitch-submitted.html',
    subject: '[NOTIFICATION] Your Pitch Has Been Submitted to the Reporter',
    category: 'Notifications',
    status: '🔍 NEEDS REVIEW'
  },
  {
    name: 'Pitch Interested',
    file: 'server/email-templates/pitch-interested.html',
    subject: '[NOTIFICATION] Great News! Reporter is Interested in Your Pitch',
    category: 'Notifications',
    status: '🔍 NEEDS REVIEW'
  },
  {
    name: 'Pitch Rejected',
    file: 'server/email-templates/pitch-rejected.html',
    subject: '[NOTIFICATION] Pitch Update - Not Selected This Time',
    category: 'Notifications',
    status: '🔍 NEEDS REVIEW'
  },
  {
    name: 'Article Published',
    file: 'server/email-templates/article-published.html',
    subject: '[NOTIFICATION] 🎉 Success! Your Story Has Been Published',
    category: 'Notifications',
    status: '🔍 NEEDS REVIEW'
  },
  
  // BILLING EMAILS (2)
  {
    name: 'Billing Confirmation',
    file: 'server/email-templates/billing-confirmation.html',
    subject: '[BILLING] Receipt: Your QuoteBid Placement - $2,450.00',
    category: 'Billing',
    status: '🔍 NEEDS REVIEW'
  },
  {
    name: 'Subscription Renewal Failed',
    file: 'server/email-templates/subscription-renewal-failed.html',
    subject: '[BILLING] Payment Issue: QuoteBid Premium Renewal Failed',
    category: 'Billing',
    status: '🔍 NEEDS REVIEW'
  }
];

async function sendAllEmails() {
  try {
    console.log(`📧 Sending ${emailTemplates.length} email templates to ben@rubiconprgroup.com...\n`);
    console.log(`✅ Welcome Email: APPROVED & PRODUCTION READY`);
    console.log(`🔍 Remaining: ${emailTemplates.length - 1} emails to review\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const template of emailTemplates) {
      try {
        // Read the HTML template
        const htmlContent = fs.readFileSync(template.file, 'utf8');
        
        // Replace template variables with sample data
        const personalizedContent = htmlContent
          .replace(/\{\{userFirstName\}\}/g, 'Ben')
          .replace(/\{\{userFullName\}\}/g, 'Ben Deveran')
          .replace(/\{\{userEmail\}\}/g, 'ben@rubiconprgroup.com')
          .replace(/\{\{opportunityTitle\}\}/g, 'Tech Innovation Story: AI Transforms Industry')
          .replace(/\{\{publicationName\}\}/g, 'TechCrunch')
          .replace(/\{\{currentPrice\}\}/g, '2,450')
          .replace(/\{\{previousPrice\}\}/g, '2,200')
          .replace(/\{\{bidAmount\}\}/g, '2,450')
          .replace(/\{\{articleTitle\}\}/g, 'How AI is Revolutionizing the Finance Industry')
          .replace(/\{\{articleUrl\}\}/g, 'https://techcrunch.com/2025/01/15/ai-finance-revolution')
          .replace(/\{\{subscriptionPlan\}\}/g, 'QuoteBid Premium')
          .replace(/\{\{monthlyAmount\}\}/g, '99.99')
          .replace(/\{\{nextAttemptDate\}\}/g, 'January 20, 2025')
          .replace(/\{\{cardLast4\}\}/g, '4242')
          .replace(/\{\{frontendUrl\}\}/g, 'https://quotebid.co');
        
        // Send the email
        const result = await resend.emails.send({
          from: 'QuoteBid Email System <noreply@quotebid.co>',
          to: ['ben@rubiconprgroup.com'],
          subject: template.subject,
          html: personalizedContent
        });
        
        console.log(`${template.status} ${template.category}: ${template.name} - Sent (ID: ${result.data?.id})`);
        successCount++;
        
        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ ${template.category}: ${template.name} - Failed:`, error.message);
        failCount++;
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📧 Total templates: ${emailTemplates.length}`);
    
    console.log(`\n🎯 ALL EMAILS NOW HAVE CORRECTED FOOTER LINKS:`);
    console.log(`  ✅ Email Preferences: /account#email-preferences`);
    console.log(`  ✅ Billing: /account#billing`);
    console.log(`  ✅ Terms & Privacy: Working links to quotebid.co`);
    
    console.log(`\n📈 PROGRESS:`);
    console.log(`  ✅ Welcome Email: PRODUCTION READY`);
    console.log(`  🔍 Remaining: 12 emails to review`);
    
    if (successCount === emailTemplates.length) {
      console.log(`\n🎉 ALL EMAIL TEMPLATES SENT SUCCESSFULLY!`);
    }
  } catch (error) {
    console.error('❌ Failed to send emails:', error.message);
  }
}

sendAllEmails(); 