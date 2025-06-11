console.log('🚀 EMAIL MODULE STARTING TO LOAD...');

import { Resend } from 'resend';
import { render } from '@react-email/render';
import WelcomeEmail from '../../emails/templates/WelcomeEmail';
import PriceDropAlert from '../../emails/templates/PriceDropAlert';
import NotificationEmail from '../../emails/templates/NotificationEmail';

console.log('📦 Initializing email system...');

// Initialize Resend lazily to ensure environment variables are loaded
let resend: Resend | null = null;

function getResendInstance(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    try {
      console.log('🔧 Creating Resend instance...');
      resend = new Resend(process.env.RESEND_API_KEY);
      console.log('✅ Resend initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Resend:', error);
      resend = null;
    }
  }
  return resend;
}

/**
 * Sends an email notification about a new opportunity
 * @param toEmails List of email addresses to send to
 * @param opportunity Opportunity details
 * @returns Boolean indicating success or failure
 */
export async function sendOpportunityNotification(
  toEmails: string[],
  opportunity: { title: string; description: string }
): Promise<boolean> {
  const resendInstance = getResendInstance();
  
  if (!resendInstance) {
    console.error('Resend API key not configured');
    return false;
  }

  try {
    await resendInstance.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: toEmails,
      subject: `New Opportunity: ${opportunity.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #2d3748;">${opportunity.title}</h2>
            <p style="color: #4a5568; line-height: 1.6;">${opportunity.description}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://quotebid.com'}" 
                 style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Opportunity
              </a>
            </div>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send opportunity notification:', error);
    return false;
  }
}

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  username?: string
): Promise<boolean> {
  const resendInstance = getResendInstance();
  
  console.log('🔍 EMAIL DEBUG:', {
    hasResendApiKey: !!process.env.RESEND_API_KEY,
    resendApiKeyLength: process.env.RESEND_API_KEY?.length || 0,
    resendApiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) || 'undefined',
    emailFrom: process.env.EMAIL_FROM || 'not set',
    frontendUrl: process.env.FRONTEND_URL || 'not set',
    resendInstanceExists: !!resendInstance
  });

  if (!resendInstance) {
    console.error('❌ Resend not initialized. Check API key and initialization.');
    return false;
  }

  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5050'}/reset-password?token=${resetToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset - QuoteBid</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>QuoteBid Security Team</p>
            </div>
            <div class="content">
              <p>Hello ${username ? username : 'there'},</p>
              <p>We received a request to reset your QuoteBid account password. If you made this request, click the button below to reset your password:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </p>
              <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
              <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              <p>For security, this reset link can only be used once.</p>
              <div class="footer">
                <p>Need help? Contact our support team at support@quotebid.co</p>
                <p>© 2024 QuoteBid. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('📧 Sending password reset email to:', email);
    
    const { data, error } = await resendInstance.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: [email],
      subject: '🔐 Reset Your QuoteBid Password',
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return false;
    }

    console.log('✅ Password reset email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return false;
  }
}

/**
 * Send username reminder email
 */
export async function sendUsernameReminderEmail(
  email: string,
  username: string
): Promise<boolean> {
  const resendInstance = getResendInstance();
  
  if (!resendInstance) {
    console.error('❌ Resend not initialized for username reminder');
    return false;
  }

  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Username Reminder - QuoteBid</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .username { background: #667eea; color: white; padding: 15px; text-align: center; border-radius: 5px; font-size: 18px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👤 Username Reminder</h1>
              <p>QuoteBid Account Services</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You requested a reminder of your QuoteBid username. Here it is:</p>
              <div class="username">${username}</div>
              <p>You can use this username to log in to your QuoteBid account at <a href="${process.env.FRONTEND_URL || 'http://localhost:5050'}">quotebid.co</a></p>
              <p>If you didn't request this reminder, please ignore this email.</p>
              <div class="footer">
                <p>Need help? Contact our support team at support@quotebid.co</p>
                <p>© 2024 QuoteBid. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('📧 Sending username reminder to:', email);
    
    const { data, error } = await resendInstance.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: [email],
      subject: '👤 Your QuoteBid Username',
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Username reminder error:', error);
      return false;
    }

    console.log('✅ Username reminder sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending username reminder:', error);
    return false;
  }
}

/**
 * Send pricing notification emails (price drops, last call)
 */
export async function sendPricingNotificationEmail(
  emails: string[],
  template: "PRICE_DROP" | "LAST_CALL",
  opportunityTitle: string,
  currentPrice: string
): Promise<boolean> {
  const resendInstance = getResendInstance();
  
  if (!resendInstance) {
    console.error('❌ Resend not initialized for pricing notification');
    return false;
  }

  const emailConfig = {
    PRICE_DROP: {
      subject: "🔥 Price dropped on an opportunity you're interested in",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Price Drop Alert - QuoteBid</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .price-alert { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💰 Price Drop Alert!</h1>
                <p>QuoteBid Pricing Engine</p>
              </div>
              <div class="content">
                <p>Great news! The price has dropped on an opportunity you've shown interest in:</p>
                <div class="price-alert">
                  <h3 style="margin: 0 0 10px 0;">${opportunityTitle}</h3>
                  <p style="margin: 0; font-size: 18px;">
                    <strong>New Price: $${currentPrice}</strong>
                  </p>
                </div>
                <p>This could be a great opportunity to submit your pitch at a better price point.</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5050'}" class="button">View Opportunity</a>
                </p>
                <div class="footer">
                  <p>You're receiving this because you've previously shown interest in this opportunity.</p>
                  <p>© 2024 QuoteBid. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    LAST_CALL: {
      subject: "⏰ Last call for pitches - Opportunity closing soon",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Last Call Alert - QuoteBid</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .urgent-alert { background: #fef2f2; padding: 20px; border-left: 4px solid #dc2626; border-radius: 8px; margin: 20px 0; }
              .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ Last Call!</h1>
                <p>QuoteBid Deadline Alert</p>
              </div>
              <div class="content">
                <p>Time is running out! An opportunity you're interested in is closing soon:</p>
                <div class="urgent-alert">
                  <h3 style="margin: 0 0 10px 0; color: #1f2937;">${opportunityTitle}</h3>
                  <p style="margin: 0; color: #dc2626;">
                    <strong>Closing Soon - Current Price: $${currentPrice}</strong>
                  </p>
                </div>
                <p>Don't miss out! Submit your pitch now before this opportunity expires.</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5050'}" class="button">Submit Pitch Now</a>
                </p>
                <div class="footer">
                  <p style="color: #dc2626; font-weight: bold;">Act fast - this opportunity may not be available much longer!</p>
                  <p>© 2024 QuoteBid. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    },
  };

  try {
    const { subject, html } = emailConfig[template];
    
    console.log(`📧 Sending ${template} pricing notification to ${emails.length} users`);
    
    const { data, error } = await resendInstance.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: emails,
      subject,
      html,
    });

    if (error) {
      console.error('❌ Pricing notification error:', error);
      return false;
    }

    console.log('✅ Pricing notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending pricing notification:', error);
    return false;
  }
}

/**
 * General notification email function
 */
export async function sendNotificationEmail(
  email: string,
  subject: string,
  message: string
): Promise<boolean> {
  const resendInstance = getResendInstance();
  
  if (!resendInstance) {
    console.error('❌ Resend not initialized for notification');
    return false;
  }

  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📢 QuoteBid Notification</h1>
            </div>
            <div class="content">
              <p>${message}</p>
              <div class="footer">
                <p>© 2024 QuoteBid. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resendInstance.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Notification email error:', error);
      return false;
    }

    console.log('✅ Notification email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    return false;
  }
}

/**
 * Send notification email using React Email template
 */
export async function sendUserNotificationEmail(
  email: string,
  userName: string,
  notificationType: 'system' | 'opportunity' | 'pitch_status' | 'payment' | 'media_coverage',
  title: string,
  message: string,
  linkUrl?: string,
  linkText?: string
): Promise<boolean> {
  console.log(`🔍 sendUserNotificationEmail called with:`, {
    email,
    userName,
    notificationType,
    title,
    message: message.substring(0, 100) + '...',
    linkUrl,
    linkText
  });

  const resendInstance = getResendInstance();
  
  if (!resendInstance) {
    console.error('❌ Resend not initialized for notification email');
    return false;
  }

  try {
    console.log(`🔧 Building email for ${notificationType} notification...`);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5050';
    const fullLinkUrl = linkUrl ? (linkUrl.startsWith('http') ? linkUrl : `${frontendUrl}${linkUrl}`) : undefined;
    
    console.log(`🎨 About to render NotificationEmail template...`);
    
    // Render React Email template to HTML
    const emailHtml = await render(NotificationEmail({
      type: notificationType,
      title,
      message,
      userName,
      linkUrl: fullLinkUrl,
      linkText,
    }));

    console.log(`✅ React Email template rendered successfully! HTML length: ${emailHtml.length}`);

    // Generate appropriate subject based on notification type
    const getSubject = () => {
      switch (notificationType) {
        case 'opportunity':
          return '🚀 New Opportunity Available - QuoteBid';
        case 'pitch_status':
          return `📄 Pitch Update - ${title}`;
        case 'payment':
          return '💰 Payment Update - QuoteBid';
        case 'media_coverage':
          return '📰 New Media Coverage - QuoteBid';
        case 'system':
        default:
          return `📢 ${title} - QuoteBid`;
      }
    };

    console.log(`📧 Sending ${notificationType} notification email to:`, email);
    
    const { data, error } = await resendInstance.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: [email],
      subject: getSubject(),
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Notification email error:', error);
      return false;
    }

    console.log('✅ Notification email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    return false;
  }
}

/**
 * Send welcome email to new users using React Email
 */
export async function sendWelcomeEmail(
  email: string,
  username: string,
  fullName?: string,
  industry?: string
): Promise<boolean> {
  const resendInstance = getResendInstance();
  
  if (!resendInstance) {
    console.error('❌ Resend not initialized for welcome email');
    return false;
  }

  try {
    const userFirstName = fullName?.split(' ')[0] || username;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5050';
    
    // Try to fetch a real live opportunity for this user's industry
    let liveOpportunity = null;
    try {
      const { getOpportunityForEmail, getStaticFallbackOpportunity } = await import('./opportunityMatcher');
      liveOpportunity = await getOpportunityForEmail(industry);
      
      // If no live opportunity found, use static fallback
      if (!liveOpportunity) {
        console.log(`📋 No live opportunity found for ${industry}, using static fallback`);
        liveOpportunity = getStaticFallbackOpportunity(industry);
      } else {
        console.log(`🎯 Using live opportunity: ${liveOpportunity.title} for ${industry}`);
      }
    } catch (error) {
      console.error('Error fetching live opportunity for welcome email:', error);
      // Use static fallback if database query fails
      const { getStaticFallbackOpportunity } = await import('./opportunityMatcher');
      liveOpportunity = getStaticFallbackOpportunity(industry);
    }
    
    // Render React Email template to HTML
    const emailHtml = await render(WelcomeEmail({
      userFirstName,
      username,
      frontendUrl,
      industry,
      liveOpportunity,
    }));

    console.log('📧 Sending welcome email to:', email);
    
    const { data, error } = await resendInstance.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: [email],
      subject: '🎉 Welcome to QuoteBid - Your PR Opportunity Platform Awaits!',
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Welcome email error:', error);
      return false;
    }

    console.log('✅ Welcome email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
}