import { Resend } from 'resend';

console.log('📦 Resend package imported:', typeof Resend);

// Initialize Resend if API key is available
let resend: Resend | null = null;

try {
  if (process.env.RESEND_API_KEY) {
    console.log('🔧 Initializing Resend with API key...');
    console.log('🔑 API Key length:', process.env.RESEND_API_KEY.length);
    console.log('🔑 API Key prefix:', process.env.RESEND_API_KEY.substring(0, 15));
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend initialized successfully');
  } else {
    console.log('⚠️ No RESEND_API_KEY found in environment');
  }
} catch (error) {
  console.error('❌ Failed to initialize Resend:', error);
  console.error('❌ Error details:', error);
  resend = null;
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
  if (!resend) {
    console.error('Resend API key not configured');
    return false;
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <onboarding@resend.dev>',
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
 * Sends a password reset email
 * @param email User's email address
 * @param resetToken Password reset token
 * @param username User's username (optional)
 * @returns Boolean indicating success or failure
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  username?: string
): Promise<boolean> {
  // Debug logging for Resend configuration
  console.log('🔍 EMAIL DEBUG:', {
    hasResendApiKey: !!process.env.RESEND_API_KEY,
    resendApiKeyLength: process.env.RESEND_API_KEY?.length || 0,
    resendApiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) || 'undefined',
    emailFrom: process.env.EMAIL_FROM || 'not set',
    frontendUrl: process.env.FRONTEND_URL || 'not set',
    resendInstanceExists: !!resend
  });

  if (!resend) {
    console.error('❌ Resend instance is null. Check initialization logs above.');
    console.error('❌ RESEND_API_KEY value (first 20 chars):', process.env.RESEND_API_KEY?.substring(0, 20) || 'undefined');
    return false;
  }

  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5050'}/reset-password?token=${resetToken}`;
    const displayName = username ? ` (${username})` : '';
    
    console.log('📧 Sending password reset email to:', email);
    
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <onboarding@resend.dev>',
      to: [email],
      subject: 'Reset Your QuoteBid Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #2d3748;">Reset Your Password</h2>
            <p style="color: #4a5568; line-height: 1.6;">
              Hi${displayName},<br><br>
              We received a request to reset your password for your QuoteBid account. Click the button below to create a new password:
            </p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${resetUrl}" 
                 style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #718096; font-size: 14px;">
              If you didn't request this password reset, you can safely ignore this email.
              This link will expire in 24 hours.
            </p>
            <p style="color: #718096; font-size: 12px; margin-top: 20px;">
              Reset URL: ${resetUrl}
            </p>
          </div>
        </div>
      `,
    });
    
    console.log('✅ Password reset email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
}

/**
 * Sends a username reminder email
 * @param email User's email address
 * @param username User's username
 * @returns Boolean indicating success or failure
 */
export async function sendUsernameReminderEmail(
  email: string,
  username: string
): Promise<boolean> {
  // Debug logging for Resend configuration
  console.log('🔍 EMAIL DEBUG (Username Reminder):', {
    hasResendApiKey: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM || 'not set',
    frontendUrl: process.env.FRONTEND_URL || 'not set'
  });

  if (!resend) {
    console.error('❌ Resend API key not configured. Please set RESEND_API_KEY environment variable.');
    return false;
  }

  try {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5050'}/login`;
    
    console.log('📧 Sending username reminder email to:', email);
    
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <onboarding@resend.dev>',
      to: [email],
      subject: 'Your QuoteBid Username',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #2d3748;">Your Username</h2>
            <p style="color: #4a5568; line-height: 1.6;">
              Hi there,<br><br>
              You requested a reminder of your QuoteBid username. Here it is:
            </p>
            <div style="margin: 30px 0; text-align: center; background-color: #f7fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <h3 style="color: #2d3748; margin: 0; font-size: 24px;">${username}</h3>
            </div>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${loginUrl}" 
                 style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Login to QuoteBid
              </a>
            </div>
            <p style="color: #718096; font-size: 14px;">
              If you didn't request this username reminder, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });
    
    console.log('✅ Username reminder email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to send username reminder email:', error);
    return false;
  }
}