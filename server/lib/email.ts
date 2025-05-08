import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured');
    return false;
  }

  try {
    const msg = {
      to: toEmails,
      from: 'admin@quotebid.com', // Your verified sender email
      subject: `New Opportunity: ${opportunity.title}`,
      text: `A new opportunity has been posted: ${opportunity.title}\n\n${opportunity.description}\n\nLogin to view more details.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #2d3748;">New Opportunity</h2>
            <h3 style="color: #4a5568;">${opportunity.title}</h3>
            <p>${opportunity.description}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="https://quotebid.com/opportunities" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Opportunity</a>
            </div>
          </div>
          <div style="text-align: center; padding: 15px; font-size: 12px; color: #718096;">
            <p>© ${new Date().getFullYear()} QuoteBid. All rights reserved.</p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending opportunity notification email:', error);
    return false;
  }
}

/**
 * Sends a password reset email
 * @param email User's email address
 * @param resetToken Unique token for password reset
 * @param username User's username
 * @returns Boolean indicating success or failure
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  username: string
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured');
    return false;
  }

  const resetLink = `https://quotebid.com/reset-password?token=${resetToken}`;

  try {
    const msg = {
      to: email,
      from: 'admin@quotebid.com', // Your verified sender email
      subject: 'QuoteBid Password Reset',
      text: `Hello ${username},\n\nWe received a request to reset your password. Please click the link below to set a new password:\n\n${resetLink}\n\nThis link will expire in 24 hours.\n\nIf you didn't request this, please ignore this email and your password will remain unchanged.\n\nThank you,\nQuoteBid Support Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #2d3748;">Password Reset Request</h2>
            <p>Hello ${username},</p>
            <p>We received a request to reset your password. Please click the button below to set a new password:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </div>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
            <p>Thank you,<br>QuoteBid Support Team</p>
          </div>
          <div style="text-align: center; padding: 15px; font-size: 12px; color: #718096;">
            <p>© ${new Date().getFullYear()} QuoteBid. All rights reserved.</p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}