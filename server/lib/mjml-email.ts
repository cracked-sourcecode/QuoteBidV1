import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';
import { Resend } from 'resend';

// Initialize Resend
let resendInstance: Resend | null = null;

function getResendInstance(): Resend | null {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Template data interfaces
interface WelcomeEmailData {
  userFirstName: string;
  username: string;
  email: string;
  frontendUrl: string;
}

interface OpportunityAlertEmailData {
  userFirstName: string;
  userEmail: string;
  frontendUrl: string;
  opportunity: {
    id: number;
    title: string;
    description: string;
    publicationName: string;
    industry: string;
    deadline: string;
    currentPrice: string;
    trend: string;
  };
}

interface PasswordResetEmailData {
  userFirstName: string;
  userEmail: string;
  resetUrl: string;
  frontendUrl: string;
}

// MJML Template compiler
function compileMJMLTemplate(templateName: string, data: any): string {
  try {
    // Read MJML template
    const templatePath = path.join(process.cwd(), 'emails', 'mjml-templates', `${templateName}.mjml`);
    let mjmlContent = fs.readFileSync(templatePath, 'utf8');
    
    // Replace template variables
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      mjmlContent = mjmlContent.replace(regex, data[key]);
    });
    
    // Handle nested object properties (like opportunity.title)
    const nestedRegex = /{{(\w+)\.(\w+)}}/g;
    mjmlContent = mjmlContent.replace(nestedRegex, (match, obj, prop) => {
      return data[obj] && data[obj][prop] ? data[obj][prop] : match;
    });
    
    // Compile MJML to HTML
    const { html, errors } = mjml2html(mjmlContent, {
      validationLevel: 'soft',
      beautify: true
    });
    
    if (errors && errors.length > 0) {
      console.warn('MJML compilation warnings:', errors);
    }
    
    return html;
  } catch (error) {
    console.error(`Error compiling MJML template ${templateName}:`, error);
    throw error;
  }
}

// Email sending functions
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  const resend = getResendInstance();
  
  if (!resend) {
    console.error('Resend API key not configured');
    throw new Error('Email service not configured');
  }

  try {
    const html = compileMJMLTemplate('welcome', data);
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: [data.email],
      subject: 'Welcome to QuoteBid - The PR Pricing Engine',
      html: html,
      text: `Welcome to QuoteBid, ${data.userFirstName}!

You've joined the world's first live marketplace for earned media. No retainers, no static fees - only pay if you're published.

Explore opportunities: ${data.frontendUrl}/opportunities

How QuoteBid Works:
1. Browse Opportunities - Discover live opportunities from top-tier publications
2. Submit Your Pitch - Submit your expert insights directly to journalists
3. Get Published - Only pay when your commentary gets published

Ready to start earning media coverage?
Visit: ${data.frontendUrl}/opportunities

QuoteBid - The World's First PR Pricing Engine`
    });
    
    console.log(`Welcome email sent to ${data.email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}

export async function sendOpportunityAlertEmail(data: OpportunityAlertEmailData): Promise<void> {
  const resend = getResendInstance();
  
  if (!resend) {
    console.error('Resend API key not configured');
    throw new Error('Email service not configured');
  }

  try {
    const html = compileMJMLTemplate('opportunity-alert', data);
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: [data.userEmail],
      subject: `New Opportunity: ${data.opportunity.title} - ${data.opportunity.publicationName}`,
      html: html,
      text: `Hi ${data.userFirstName},

A new opportunity matching your interests has been posted!

${data.opportunity.title}
${data.opportunity.publicationName} - ${data.opportunity.industry}

${data.opportunity.description}

Current Price: ${data.opportunity.currentPrice}
Deadline: ${data.opportunity.deadline}
Trend: ${data.opportunity.trend}

View this opportunity: ${data.frontendUrl}/opportunities/${data.opportunity.id}

Act quickly - opportunities can fill up fast!

QuoteBid - The World's First PR Pricing Engine`
    });
    
    console.log(`Opportunity alert email sent to ${data.userEmail}`);
  } catch (error) {
    console.error('Error sending opportunity alert email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
  const resend = getResendInstance();
  
  if (!resend) {
    console.error('Resend API key not configured');
    throw new Error('Email service not configured');
  }

  try {
    const html = compileMJMLTemplate('password-reset', data);
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <ben@rubiconprgroup.com>',
      to: [data.userEmail],
      subject: 'Reset Your QuoteBid Password',
      html: html,
      text: `Hi ${data.userFirstName},

We received a request to reset the password for your QuoteBid account. If you made this request, click the link below to set a new password.

Reset your password: ${data.resetUrl}

This link will expire in 24 hours for security reasons.

Security Notice:
• If you didn't request this password reset, please ignore this email
• Your account remains secure and no changes have been made
• Never share your password reset link with anyone
• QuoteBid will never ask for your password via email

Need help? Contact our support team at ${data.frontendUrl}/support

QuoteBid - The World's First PR Pricing Engine`
    });
    
    console.log(`Password reset email sent to ${data.userEmail}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
} 