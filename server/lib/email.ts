import { Resend } from 'resend';

// Initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
 * @returns Boolean indicating success or failure
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<boolean> {
  if (!resend) {
    console.error('Resend API key not configured');
    return false;
  }

  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://quotebid.com'}/reset-password?token=${resetToken}`;
    
    await resend.emails.send({
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
              We received a request to reset your password. Click the button below to create a new password:
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
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}