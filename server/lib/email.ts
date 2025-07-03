console.log('🚀 EMAIL MODULE STARTING TO LOAD...');

import { Resend } from 'resend';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

console.log('📦 Initializing email system...');

// Initialize Resend - moved to function to handle dynamic imports
let resendInstance: Resend | null = null;

function getResendInstance(): Resend | null {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Helper function to check if user wants to receive a specific type of email
 */
export async function checkUserEmailPreference(
  email: string, 
  preferenceType: 'alerts' | 'notifications' | 'billing'
): Promise<boolean> {
  try {
    const { getDb } = await import('../db');
    const db = getDb();
    
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (user.length === 0) {
      console.log(`⚠️ User not found for email ${email}, allowing email by default`);
      return true; // Default to allowing if user not found
    }

    const defaultPreferences = {
      alerts: true,
      notifications: true,
      billing: true
    };

    const rawPrefs = user[0].emailPreferences;
    if (!rawPrefs || typeof rawPrefs !== 'object') {
      return defaultPreferences[preferenceType] !== false;
    }

    // Handle both old and new formats
    let preferences = { ...defaultPreferences };
    
    // Check if it's the new simplified format
    if ('alerts' in rawPrefs || 'notifications' in rawPrefs || 'billing' in rawPrefs) {
      // New format - use directly
      preferences = { 
        ...defaultPreferences, 
        ...(rawPrefs as { alerts?: boolean; notifications?: boolean; billing?: boolean; })
      };
    } else {
      // Old format - convert on the fly
      const oldToNewMapping: Record<string, keyof typeof defaultPreferences> = {
        'priceAlerts': 'alerts',
        'opportunityNotifications': 'alerts',
        'pitchStatusUpdates': 'notifications',
        'mediaCoverageUpdates': 'notifications',
        'placementSuccess': 'notifications',
        'paymentConfirmations': 'billing'
      };

      const oldPrefs = rawPrefs as Record<string, any>;
      for (const [oldKey, newKey] of Object.entries(oldToNewMapping)) {
        if (oldPrefs[oldKey] === false) {
          preferences[newKey] = false;
        }
      }
      
      console.log(`🔄 User ${email}: Using old format preferences (consider running migration)`);
    }

    const allowed = preferences[preferenceType] !== false;
    console.log(`📧 Email preference check for ${email}: ${preferenceType} = ${allowed} (preferences: ${JSON.stringify(preferences)})`);
    return allowed;
  } catch (error) {
    console.error('Error checking email preference:', error);
    return true; // Default to allowing on error
  }
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
  username?: string,
  fullName?: string
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
    const resetUrl = `${process.env.FRONTEND_URL || 'https://quotebid.co'}/reset-password?token=${resetToken}`;
    const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';
    const userFirstName = fullName?.split(' ')[0] || username;
    
    // Use HTML template
    const fs = await import('fs');
    const path = await import('path');
    
    const emailHtml = fs.readFileSync(path.join(process.cwd(), 'server/email-templates/password-reset.html'), 'utf8')
      .replace(/{{userFirstName}}/g, userFirstName || 'there')
      .replace(/{{resetUrl}}/g, resetUrl)
      .replace(/{{frontendUrl}}/g, frontendUrl);

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
              <p>You can use this username to log in to your QuoteBid account at <a href="${process.env.FRONTEND_URL || 'https://quotebid.co'}">quotebid.co</a></p>
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
 * Send opportunity notification emails (last call only - no price drops)
 */
export async function sendOpportunityNotificationEmail(
  emails: string[],
  template: "LAST_CALL",
  opportunityTitle: string,
  currentPrice: string
): Promise<boolean> {
  const resendInstance = getResendInstance();
  
  if (!resendInstance) {
    console.error('❌ Resend not initialized for opportunity notification');
    return false;
  }

  // Filter emails based on user preferences
  const allowedEmails = [];
  for (const email of emails) {
    const allowed = await checkUserEmailPreference(email, 'alerts');
    if (allowed) {
      allowedEmails.push(email);
    } else {
      console.log(`📧 Skipping ${template} email to ${email} due to preferences`);
    }
  }

  if (allowedEmails.length === 0) {
    console.log(`📧 No users want ${template} emails, skipping send`);
    return true; // Return true since this isn't an error
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';

  const emailConfig = {
    LAST_CALL: {
      subject: "⏰ Last call for pitches - Opportunity closing soon",
      html: `
        <!-- QuoteBid Last Call Alert - Bulletproof Table Layout -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="#F9FAFB">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
                     style="width:600px;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#374151;">
                
                <!-- HEADER -->
                <tr>
                  <td align="left" style="padding:32px 32px 0 32px;">
                    <img src="https://quotebid.co/logo-light.png" width="140" alt="QuoteBid" style="display:block;border:0;">
                  </td>
                </tr>
                <tr><td style="line-height:0;height:24px;">&nbsp;</td></tr>

                <!-- URGENT BADGE -->
                <tr>
                  <td style="padding:0 32px 16px 32px;">
                    <span style="background:#DC2626;color:#FFFFFF;padding:8px 16px;border-radius:16px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                      ⏰ Last Call Alert
                    </span>
                  </td>
                </tr>

                <!-- HEADLINE -->
                <tr>
                  <td style="padding:0 32px 24px 32px;font-size:24px;line-height:32px;font-weight:700;color:#DC2626;">
                    Time is running out!
                  </td>
                </tr>

                <!-- OPPORTUNITY INFO -->
                <tr>
                  <td style="padding:0 32px 0 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FEF2F2;border:2px solid #DC2626;border-radius:12px;">
                      <tr>
                        <td style="padding:24px;">
                          <div style="font-size:16px;line-height:24px;color:#7F1D1D;margin-bottom:8px;">Closing Soon</div>
                          <div style="font-size:20px;line-height:28px;font-weight:700;color:#991B1B;margin-bottom:16px;">${opportunityTitle}</div>
                          
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="text-align:center;vertical-align:top;">
                                <div style="font-size:14px;line-height:20px;color:#B91C1C;font-weight:600;margin-bottom:4px;">Current Price</div>
                                <div style="font-size:32px;line-height:36px;font-weight:800;color:#DC2626;">$${currentPrice}</div>
                                <div style="font-size:12px;line-height:16px;color:#7F1D1D;margin-top:4px;">⏰ Deadline approaching</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- SECTION SPACER -->
                <tr><td style="line-height:0;height:32px;">&nbsp;</td></tr>

                <!-- URGENT MESSAGE -->
                <tr>
                  <td style="padding:0 32px 24px 32px;font-size:16px;line-height:24px;color:#374151;">
                    An opportunity you're interested in is closing soon! Don't miss out - submit your pitch now before this opportunity expires. Once it's gone, it may not be available again.
                  </td>
                </tr>

                <!-- CTA BUTTON -->
                <tr>
                  <td align="center" style="padding:0 32px 16px 32px;">
                    <a href="${frontendUrl}/opportunities"
                       style="background:#DC2626;color:#FFFFFF;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">
                       Submit Pitch Now →
                    </a>
                  </td>
                </tr>

                <!-- URGENCY NOTE -->
                <tr>
                  <td align="center" style="padding:0 32px 32px 32px;font-size:14px;line-height:20px;color:#DC2626;font-weight:600;">
                    ⚡ Act fast - this opportunity may not be available much longer!
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td align="center" style="padding:0 32px 32px 32px;font-size:12px;line-height:18px;color:#6B7280;">
                    You're receiving this because you've shown interest in this opportunity.<br>
                    © 2025 QuoteBid Inc. ·
                    <a href="https://quotebid.co/terms" style="color:#6B7280;text-decoration:none;">Terms</a> ·
                    <a href="https://quotebid.co/privacy" style="color:#6B7280;text-decoration:none;">Privacy</a><br>
                    <a href="${frontendUrl}/notifications/settings" style="color:#6B7280;text-decoration:none;">Manage alerts</a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      `,
    },
  };

  try {
    const { subject, html } = emailConfig[template];
    
    console.log(`📧 Sending ${template} opportunity notification to ${allowedEmails.length} users (${emails.length - allowedEmails.length} opted out)`);
    
    const { data, error } = await resendInstance.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: allowedEmails,
      subject,
      html,
    });

    if (error) {
      console.error('❌ Opportunity notification error:', error);
      return false;
    }

    console.log('✅ Opportunity notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending opportunity notification:', error);
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

  // Check user preference for notifications
  const allowed = await checkUserEmailPreference(email, 'notifications');
  if (!allowed) {
    console.log(`📧 Skipping notification email to ${email} due to user preferences`);
    return true; // Return true since this isn't an error
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
 * Send media coverage notification email
 */
export async function sendMediaCoverageEmail(
  email: string,
  userName: string,
  articleTitle: string,
  articleUrl: string,
  publicationName: string
): Promise<boolean> {
  const resendInstance = getResendInstance();
  
  if (!resendInstance) {
    console.error('❌ Resend not initialized for media coverage email');
    return false;
  }

  // Check user preference for notifications (media coverage is a notification)
  const allowed = await checkUserEmailPreference(email, 'notifications');
  if (!allowed) {
    console.log(`📧 Skipping media coverage email to ${email} due to user preferences`);
    return true; // Return true since this isn't an error
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';
    
    // Use HTML template
    const fs = await import('fs');
    const path = await import('path');
    
    const emailHtml = fs.readFileSync(path.join(process.cwd(), 'server/email-templates/media-coverage-added.html'), 'utf8')
      .replace(/{{publicationName}}/g, publicationName)
      .replace(/{{articleTitle}}/g, articleTitle)
      .replace(/{{articleUrl}}/g, articleUrl)
      .replace(/{{frontendUrl}}/g, frontendUrl);

    console.log('📧 Sending media coverage email to:', email);
    
    const { data, error } = await resendInstance.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <no-reply@quotebid.co>',
      to: [email],
      subject: '🎉 Your Article is Now Live! - QuoteBid',
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Media coverage email error:', error);
      return false;
    }

    console.log('✅ Media coverage email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending media coverage email:', error);
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
    const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';
    
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
    
    // Use HTML template
    const fs = await import('fs');
    const path = await import('path');
    
    const emailHtml = fs.readFileSync(path.join(process.cwd(), 'server/email-templates/welcome.html'), 'utf8')
      .replace(/{{userFirstName}}/g, userFirstName || 'there')
      .replace(/{{frontendUrl}}/g, frontendUrl);

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