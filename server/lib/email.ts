console.log('🚀 EMAIL MODULE STARTING TO LOAD...');

import { Resend } from 'resend';

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
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(
  email: string,
  username: string,
  fullName?: string
): Promise<boolean> {
  const resendInstance = getResendInstance();
  
  if (!resendInstance) {
    console.error('❌ Resend not initialized for welcome email');
    return false;
  }

  try {
    const displayName = fullName || username;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to QuoteBid - Your PR Opportunity Platform</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f7fa; }
            .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #4299e1 0%, #667eea 50%, #764ba2 100%); color: white; text-align: center; padding: 40px 20px; }
            .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .subtitle { font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .welcome-section { text-align: center; margin-bottom: 40px; }
            .welcome-title { color: #2d3748; font-size: 28px; margin-bottom: 15px; }
            .welcome-text { color: #4a5568; font-size: 16px; margin-bottom: 30px; }
            .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin: 40px 0; }
            .feature-card { background: #f7fafc; padding: 25px; border-radius: 12px; text-align: center; border-left: 4px solid #4299e1; }
            .feature-icon { font-size: 32px; margin-bottom: 15px; }
            .feature-title { color: #2d3748; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .feature-text { color: #4a5568; font-size: 14px; line-height: 1.5; }
            .cta-section { background: linear-gradient(135deg, #4299e1 0%, #667eea 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 40px 0; }
            .cta-title { font-size: 24px; margin-bottom: 15px; }
            .cta-text { font-size: 16px; margin-bottom: 25px; opacity: 0.9; }
            .button { display: inline-block; background: #ffffff; color: #4299e1; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; transition: all 0.3s ease; }
            .button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            .how-it-works { margin: 40px 0; }
            .how-title { color: #2d3748; font-size: 24px; text-align: center; margin-bottom: 30px; }
            .step { display: flex; align-items: flex-start; margin-bottom: 25px; }
            .step-number { background: #4299e1; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 20px; flex-shrink: 0; }
            .step-content { flex: 1; }
            .step-title { color: #2d3748; font-weight: bold; margin-bottom: 5px; }
            .step-text { color: #4a5568; font-size: 14px; }
            .tips-section { background: #edf2f7; padding: 25px; border-radius: 12px; margin: 30px 0; }
            .tips-title { color: #2d3748; font-size: 20px; margin-bottom: 20px; text-align: center; }
            .tip { margin-bottom: 15px; }
            .tip-icon { color: #4299e1; margin-right: 10px; }
            .footer { background: #2d3748; color: white; padding: 30px; text-align: center; }
            .footer-text { margin-bottom: 15px; }
            .social-links { margin-top: 20px; }
            .social-link { color: #4299e1; text-decoration: none; margin: 0 10px; }
            @media (max-width: 600px) {
              .feature-grid { grid-template-columns: 1fr; }
              .content { padding: 20px; }
              .step { flex-direction: column; text-align: center; }
              .step-number { margin: 0 auto 15px auto; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="logo">🎯 QuoteBid</div>
              <div class="subtitle">Your AI-Powered PR Opportunity Platform</div>
            </div>

            <!-- Welcome Content -->
            <div class="content">
              <div class="welcome-section">
                <h1 class="welcome-title">Welcome to QuoteBid, ${displayName}! 🎉</h1>
                <p class="welcome-text">
                  You've just joined the future of PR pitching. QuoteBid is the world's first real-time bidding platform for PR opportunities, powered by GPT-4o intelligence to help you win more clients at better prices.
                </p>
              </div>

              <!-- Feature Grid -->
              <div class="feature-grid">
                <div class="feature-card">
                  <div class="feature-icon">🤖</div>
                  <div class="feature-title">AI Pricing Engine</div>
                  <div class="feature-text">Our GPT-4o powered engine analyzes market demand and adjusts prices in real-time, helping you find the best opportunities.</div>
                </div>
                <div class="feature-card">
                  <div class="feature-icon">💰</div>
                  <div class="feature-title">Dynamic Bidding</div>
                  <div class="feature-text">Watch prices fluctuate based on demand, competition, and time remaining. Get better deals by timing your bids perfectly.</div>
                </div>
                <div class="feature-card">
                  <div class="feature-icon">📊</div>
                  <div class="feature-title">Market Intelligence</div>
                  <div class="feature-text">Access real-time market data, competitor analysis, and pricing trends to make informed decisions.</div>
                </div>
                <div class="feature-card">
                  <div class="feature-icon">🎯</div>
                  <div class="feature-title">Quality Opportunities</div>
                  <div class="feature-text">Browse curated PR opportunities from top-tier publications and media outlets, organized by tier and industry.</div>
                </div>
              </div>

              <!-- How It Works -->
              <div class="how-it-works">
                <h2 class="how-title">How QuoteBid Works</h2>
                
                <div class="step">
                  <div class="step-number">1</div>
                  <div class="step-content">
                    <div class="step-title">Browse Live Opportunities</div>
                    <div class="step-text">Explore real-time PR opportunities with dynamic pricing. Filter by industry, tier, and budget to find your perfect match.</div>
                  </div>
                </div>

                <div class="step">
                  <div class="step-number">2</div>
                  <div class="step-content">
                    <div class="step-title">Watch AI-Powered Pricing</div>
                    <div class="step-text">Our GPT-4o engine continuously analyzes demand, competition, and deadline proximity to adjust prices every minute.</div>
                  </div>
                </div>

                <div class="step">
                  <div class="step-number">3</div>
                  <div class="step-content">
                    <div class="step-title">Place Your Bid</div>
                    <div class="step-text">Submit your pitch when the price is right. Include your expertise, angles, and why you're the perfect fit for the story.</div>
                  </div>
                </div>

                <div class="step">
                  <div class="step-number">4</div>
                  <div class="step-content">
                    <div class="step-title">Get Selected & Paid</div>
                    <div class="step-text">If chosen, you'll receive the media contact details and get paid securely through our platform once your story is published.</div>
                  </div>
                </div>
              </div>

              <!-- Pro Tips -->
              <div class="tips-section">
                <h3 class="tips-title">💡 Pro Tips to Get Started</h3>
                <div class="tip">
                  <span class="tip-icon">🔥</span>
                  <strong>Watch for Price Drops:</strong> Set up alerts for opportunities you're interested in and bid when prices drop.
                </div>
                <div class="tip">
                  <span class="tip-icon">⏰</span>
                  <strong>Time Your Bids:</strong> Prices often drop as deadlines approach, but don't wait too long!
                </div>
                <div class="tip">
                  <span class="tip-icon">✨</span>
                  <strong>Complete Your Profile:</strong> A complete profile with portfolio links increases your chances of being selected.
                </div>
                <div class="tip">
                  <span class="tip-icon">🎯</span>
                  <strong>Focus on Your Expertise:</strong> Bid on opportunities in your area of expertise for the highest success rate.
                </div>
              </div>

              <!-- CTA Section -->
              <div class="cta-section">
                <h2 class="cta-title">Ready to Start Winning? 🚀</h2>
                <p class="cta-text">
                  Your dashboard is ready and waiting. Browse live opportunities, watch real-time pricing, and start bidding on the perfect PR matches for your expertise.
                </p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5050'}/opportunities" class="button">
                  Explore Opportunities Now →
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-text">
                <strong>Need Help Getting Started?</strong><br>
                Check out our <a href="${process.env.FRONTEND_URL || 'http://localhost:5050'}/help" style="color: #4299e1;">Help Center</a> 
                or contact our support team at <a href="mailto:support@quotebid.co" style="color: #4299e1;">support@quotebid.co</a>
              </div>
              <div class="social-links">
                <a href="#" class="social-link">LinkedIn</a> | 
                <a href="#" class="social-link">Twitter</a> | 
                <a href="#" class="social-link">Help Center</a>
              </div>
              <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
                © 2024 QuoteBid. All rights reserved.<br>
                You're receiving this because you just created a QuoteBid account.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

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