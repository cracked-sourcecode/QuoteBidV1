import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { opportunities, publications } from '@shared/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';

// Initialize Resend only if API key is available
function getResendInstance() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured - email sending will be disabled');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// Template loader that replaces placeholders with actual data
function loadTemplate(templateName: string, variables: Record<string, any>): string {
  const templatePath = path.join(process.cwd(), 'server/email-templates', `${templateName}.html`);
  let template = fs.readFileSync(templatePath, 'utf8');
  
  // Replace all {{variable}} placeholders with actual values
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(placeholder, String(value || ''));
  });
  
  return template;
}

// Fetch a live opportunity to show in welcome emails
async function fetchLiveOpportunity(userIndustry?: string) {
  try {
    console.log('🔍 Fetching live opportunity for industry:', userIndustry);
    
    const db = getDb();
    
    // Try to find an opportunity matching user's industry first
    let query = db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        description: opportunities.description,
        industry: opportunities.industry,
        tier: opportunities.tier,
        requestType: opportunities.requestType,
        currentPrice: opportunities.current_price,
        deadline: opportunities.deadline,
        createdAt: opportunities.createdAt,
        publicationId: opportunities.publicationId,
        publicationName: publications.name,
        publicationLogo: publications.logo
      })
      .from(opportunities)
      .leftJoin(publications, eq(opportunities.publicationId, publications.id))
      .where(and(
        eq(opportunities.status, 'open'),
        isNull(opportunities.closedAt)
      ))
      .orderBy(desc(opportunities.createdAt))
      .limit(5);

    const allOpportunities = await query;
    console.log(`📊 Found ${allOpportunities.length} total opportunities`);
    
    if (allOpportunities.length === 0) {
      // Return a fallback example if no opportunities exist
      return {
        id: 1,
        title: 'AI Startup Experts Needed for Series A Funding Story',
        description: 'Looking for AI startup founders and VCs to comment on the current Series A market dynamics and emerging AI technologies affecting venture capital decisions in 2025.',
        industry: userIndustry || 'Technology',
        tier: 'Tier 1',
        requestType: 'Expert Request',
        currentPrice: '342',
        deadline: '2 days left',
        publicationName: 'TechCrunch',
        publicationLogo: 'T',
        trend: '📈 +$45 past hour'
      };
    }

    // Prefer opportunities matching user's industry
    let selectedOpp = allOpportunities.find(opp => 
      opp.industry && userIndustry && 
      opp.industry.toLowerCase().includes(userIndustry.toLowerCase())
    ) || allOpportunities[0];

    // Calculate days until deadline
    let deadlineText = '2 days left';
    if (selectedOpp.deadline) {
      const daysLeft = Math.ceil((new Date(selectedOpp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      deadlineText = daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed';
    }

    // Generate price trend (simulated for demo)
    const priceChange = Math.floor(Math.random() * 100) + 20;
    const trendText = `📈 +$${priceChange} past hour`;

    // Get publication logo initial
    const pubLogo = selectedOpp.publicationLogo || selectedOpp.publicationName?.charAt(0) || 'P';

    const formattedOpp = {
      id: selectedOpp.id,
      title: selectedOpp.title,
      description: selectedOpp.description?.substring(0, 150) + '...' || 'Expert insights needed for upcoming story.',
      industry: selectedOpp.industry || userIndustry || 'General',
      tier: selectedOpp.tier || 'Tier 1',
      requestType: selectedOpp.requestType || 'Expert Request',
      currentPrice: selectedOpp.currentPrice?.toString() || '250',
      deadline: deadlineText,
      publicationName: selectedOpp.publicationName || 'Major Publication',
      publicationLogo: pubLogo,
      trend: trendText
    };

    console.log('✅ Selected opportunity:', formattedOpp.title);
    return formattedOpp;
    
  } catch (error) {
    console.error('❌ Error fetching live opportunity:', error);
    
    // Return fallback opportunity on error
    return {
      id: 1,
      title: 'AI Startup Experts Needed for Series A Funding Story',
      description: 'Looking for AI startup founders and VCs to comment on the current Series A market dynamics and emerging AI technologies...',
      industry: userIndustry || 'Technology',
      tier: 'Tier 1',
      requestType: 'Expert Request',
      currentPrice: '342',
      deadline: '2 days left',
      publicationName: 'TechCrunch',
      publicationLogo: 'T',
      trend: '📈 +$45 past hour'
    };
  }
}

export async function sendWelcomeEmail(data: {
  userFirstName: string;
  username: string;
  email: string;
  frontendUrl: string;
  userIndustry?: string;
}) {
  try {
    console.log('📧 Preparing welcome email for:', data.email);
    
    const resend = getResendInstance();
    if (!resend) {
      console.log('📧 Email sending disabled - no API key configured');
      return { success: false, error: 'Email service not configured' };
    }
    
    const htmlContent = loadTemplate('welcome', {
      userFirstName: data.userFirstName,
      username: data.username,
      frontendUrl: data.frontendUrl
    });

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <noreply@quotebid.co>',
      to: [data.email],
      subject: 'Welcome to QuoteBid! 🎉',
      html: htmlContent,
    });

    console.log('✅ Welcome email sent successfully:', result.data?.id);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    throw error;
  }
}

export async function sendOpportunityAlertEmail(data: {
  userFirstName: string;
  userEmail: string;
  frontendUrl: string;
  opportunity: {
    id: number;
    title: string;
    description: string;
    publicationName: string;
    industry: string;
    currentPrice: string;
    deadline: string;
    trend: string;
  };
}) {
  try {
    const resend = getResendInstance();
    if (!resend) {
      console.log('📧 Email sending disabled - no API key configured');
      return { success: false, error: 'Email service not configured' };
    }
    
    const htmlContent = loadTemplate('opportunity-alert', {
      userFirstName: data.userFirstName,
      frontendUrl: data.frontendUrl,
      'opportunity.id': data.opportunity.id,
      'opportunity.title': data.opportunity.title,
      'opportunity.description': data.opportunity.description,
      'opportunity.publicationName': data.opportunity.publicationName,
      'opportunity.industry': data.opportunity.industry,
      'opportunity.currentPrice': data.opportunity.currentPrice,
      'opportunity.deadline': data.opportunity.deadline,
      'opportunity.trend': data.opportunity.trend,
    });

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <noreply@quotebid.co>',
      to: [data.userEmail],
      subject: `🚨 New Opportunity: ${data.opportunity.title}`,
      html: htmlContent,
    });

    console.log('✅ Opportunity alert email sent successfully:', result.data?.id);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ Failed to send opportunity alert email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(data: {
  userFirstName: string;
  userEmail: string;
  resetUrl: string;
  frontendUrl: string;
}) {
  try {
    const resend = getResendInstance();
    if (!resend) {
      console.log('📧 Email sending disabled - no API key configured');
      return { success: false, error: 'Email service not configured' };
    }
    
    const htmlContent = loadTemplate('password-reset', {
      userFirstName: data.userFirstName,
      userEmail: data.userEmail,
      resetUrl: data.resetUrl,
      frontendUrl: data.frontendUrl
    });

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <noreply@quotebid.co>',
      to: [data.userEmail],
      subject: 'Reset Your QuoteBid Password 🔐',
      html: htmlContent,
    });

    console.log('✅ Password reset email sent successfully:', result.data?.id);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw error;
  }
}

// Generic notification email using the welcome template structure
export async function sendNotificationEmail(data: {
  userFirstName: string;
  userEmail: string;
  subject: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  frontendUrl: string;
}) {
  try {
    const resend = getResendInstance();
    if (!resend) {
      console.log('📧 Email sending disabled - no API key configured');
      return { success: false, error: 'Email service not configured' };
    }
    
    // Create a simple notification template based on welcome structure
    const htmlContent = `
    <!-- QuoteBid Notification Email - Bulletproof Table Layout -->
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

            <!-- HEADLINE -->
            <tr>
              <td style="padding:0 32px 24px 32px;font-size:24px;line-height:32px;font-weight:700;color:#0F172A;">
                ${data.subject}
              </td>
            </tr>

            <!-- GREETING -->
            <tr>
              <td style="padding:0 32px 16px 32px;font-size:16px;line-height:24px;color:#374151;">
                Hi ${data.userFirstName},
              </td>
            </tr>

            <!-- MESSAGE -->
            <tr>
              <td style="padding:0 32px 24px 32px;font-size:16px;line-height:24px;color:#374151;white-space:pre-line;">
                ${data.message}
              </td>
            </tr>

            ${data.ctaText && data.ctaUrl ? `
            <!-- CTA BUTTON -->
            <tr>
              <td align="center" style="padding:0 32px 32px 32px;">
                <a href="${data.ctaUrl}"
                   style="background:#FF7000;color:#FFFFFF;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">
                   ${data.ctaText} →
                </a>
              </td>
            </tr>
            ` : '<tr><td style="line-height:0;height:16px;">&nbsp;</td></tr>'}

            <!-- FOOTER SPACER -->
            <tr><td style="line-height:0;height:32px;">&nbsp;</td></tr>

            <!-- FOOTER -->
            <tr>
              <td align="center" style="padding:0 32px 32px 32px;font-size:12px;line-height:18px;color:#6B7280;">
                © 2025 QuoteBid Inc. ·
                <a href="https://quotebid.co/terms" style="color:#6B7280;text-decoration:none;">Terms</a> ·
                <a href="https://quotebid.co/privacy" style="color:#6B7280;text-decoration:none;">Privacy</a><br>
                <a href="${data.frontendUrl}/unsubscribe" style="color:#6B7280;text-decoration:none;">Unsubscribe</a>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>`;

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <noreply@quotebid.co>',
      to: [data.userEmail],
      subject: data.subject,
      html: htmlContent,
    });

    console.log('✅ Notification email sent successfully:', result.data?.id);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ Failed to send notification email:', error);
    throw error;
  }
}

export async function sendBillingPaymentEmail(data: {
  userFirstName: string;
  userEmail: string;
  publicationName: string;
  articleTitle: string;
  articleUrl: string;
  billingAmount: string;
  paymentMethod: string;
  stripeReceiptUrl: string;
  frontendUrl: string;
}) {
  try {
    console.log('📧 Preparing billing payment email for:', data.userEmail);
    
    const resend = getResendInstance();
    if (!resend) {
      console.log('📧 Email sending disabled - no API key configured');
      return { success: false, error: 'Email service not configured' };
    }
    
    const htmlContent = loadTemplate('billing-payment', {
      userFirstName: data.userFirstName,
      userEmail: data.userEmail,
      publicationName: data.publicationName,
      articleTitle: data.articleTitle,
      articleUrl: data.articleUrl,
      billingAmount: data.billingAmount,
      paymentMethod: data.paymentMethod,
      stripeReceiptUrl: data.stripeReceiptUrl,
      frontendUrl: data.frontendUrl
    });

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <noreply@quotebid.co>',
      to: [data.userEmail],
      subject: `Payment Processed - Published in ${data.publicationName}`,
      html: htmlContent,
    });

    console.log('✅ Billing payment email sent successfully:', result.data?.id);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ Failed to send billing payment email:', error);
    throw error;
  }
} 