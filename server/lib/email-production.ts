import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db';
import { users, adminUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';

console.log('🚀 PRODUCTION EMAIL SYSTEM LOADING...');

// Initialize Resend with proper error handling
function getResendInstance(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured - email sending will be disabled in production');
    return null;
  }
  
  console.log('✅ Resend initialized with API key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Helper function to check if user wants to receive a specific type of email
 */
async function checkUserEmailPreference(
  email: string, 
  preferenceType: 'alerts' | 'notifications' | 'billing'
): Promise<boolean> {
  try {
    // Initialize database if not already initialized
    try {
      const { initializeDatabase, getDb } = await import('../db');
      
      // Check if database is initialized, if not initialize it
      let db;
      try {
        db = getDb();
      } catch (dbError) {
        console.log('📊 Database not initialized, initializing now...');
        await initializeDatabase();
        db = getDb();
      }
      
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
      }

      return preferences[preferenceType] !== false;
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      console.log(`⚠️ Database error checking preferences for ${email}, allowing by default:`, errorMessage);
      return true; // Default to allowing if database check fails
    }
  } catch (error) {
    console.error(`❌ Error checking email preference for ${email}:`, error);
    return true; // Default to allowing if anything fails
  }
}

// Secure template loader with validation
function loadTemplate(templateName: string, variables: Record<string, any>): string {
  try {
    const templatePath = path.join(process.cwd(), 'server/email-templates', `${templateName}.html`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}.html`);
    }
    
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Replace all {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(placeholder, String(value || ''));
    });
    
    console.log(`✅ Template loaded: ${templateName}.html`);
    return template;
  } catch (error) {
    console.error(`❌ Failed to load template ${templateName}:`, error);
    throw error;
  }
}

// Generic email sender with comprehensive error handling
async function sendEmail(config: {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, any>;
  preferenceType?: 'alerts' | 'notifications' | 'billing';
  skipPreferenceCheck?: boolean;
}): Promise<{ success: boolean; id?: string; skipped?: boolean; error?: string }> {
  try {
    const resend = getResendInstance();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

    // Check user preferences unless skipped
    if (!config.skipPreferenceCheck && config.preferenceType) {
      const allowed = await checkUserEmailPreference(config.to, config.preferenceType);
      if (!allowed) {
        console.log(`📧 Skipping email to ${config.to} due to user preferences`);
        return { success: true, skipped: true };
      }
    }

    // Load and process template
    const htmlContent = loadTemplate(config.template, {
      frontendUrl: process.env.FRONTEND_URL || 'https://quotebid.co',
      ...config.variables
    });

    // Send email
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'QuoteBid <noreply@quotebid.co>',
      to: [config.to],
      subject: config.subject,
      html: htmlContent,
    });

    if (result.error) {
      console.error(`❌ Resend error:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`✅ Email sent successfully: ${config.template} to ${config.to} (ID: ${result.data?.id})`);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error(`❌ Failed to send email:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ====== ALL 12 EMAIL TEMPLATE FUNCTIONS ======

export async function sendWelcomeEmail(data: {
  userFirstName: string;
  email: string;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Welcome to QuoteBid! 🎉',
    template: 'welcome',
    variables: {
      userFirstName: data.userFirstName
    },
    preferenceType: 'notifications'
  });
}

export async function sendArticlePublishedEmail(data: {
  userFirstName: string;
  email: string;
  articleTitle: string;
  publicationName: string;
  articleUrl: string;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Your Story is Live! 🎉',
    template: 'article-published',
    variables: {
      userFirstName: data.userFirstName,
      articleTitle: data.articleTitle,
      publicationName: data.publicationName,
      articleUrl: data.articleUrl
    },
    preferenceType: 'notifications'
  });
}

export async function sendBillingConfirmationEmail(data: {
  userFirstName: string;
  email: string;
  receiptNumber: string;
  articleTitle: string;
  articleUrl: string;
  publicationName: string;
  publishDate: string;
  billingDate: string;
  totalAmount: string;
  cardBrand: string;
  cardLast4: string;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Payment Confirmation - QuoteBid 💳',
    template: 'billing-confirmation',
    variables: data,
    preferenceType: 'billing'
  });
}

export async function sendDraftReminderEmail(data: {
  userFirstName: string;
  email: string;
  opportunityTitle: string;
  publicationName: string;
  opportunityDescription: string;
  currentPrice: string;
  timeLeft: string;
  requestType: string;
  opportunityId: number;
}) {
  return sendEmail({
    to: data.email,
    subject: '⏰ Complete Your Draft - Don\'t Miss Out!',
    template: 'draft-reminder',
    variables: data,
    preferenceType: 'notifications'
  });
}

export async function sendPitchSubmittedEmail(data: {
  userFirstName: string;
  email: string;
  opportunityTitle: string;
  publicationName: string;
  securedPrice: string;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Pitch Submitted Successfully! ✅',
    template: 'pitch-submitted',
    variables: data,
    preferenceType: 'notifications'
  });
}

export async function sendPitchRejectedEmail(data: {
  userFirstName: string;
  email: string;
  opportunityTitle: string;
  publicationName: string;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Pitch Update - Not Selected',
    template: 'pitch-rejected',
    variables: data,
    preferenceType: 'notifications'
  });
}

export async function sendPitchSentEmail(data: {
  userFirstName: string;
  email: string;
  opportunityTitle: string;
  publicationName: string;
  securedPrice: string;
  pitchId: number;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Pitch Received - Under Review! 📤',
    template: 'pitch-sent',
    variables: data,
    preferenceType: 'notifications'
  });
}

export async function sendPitchInterestedEmail(data: {
  userFirstName: string;
  email: string;
  opportunityTitle: string;
  publicationName: string;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Great News! Reporter Interested! 👍',
    template: 'pitch-interested',
    variables: data,
    preferenceType: 'notifications'
  });
}

export async function sendNewOpportunityAlertEmail(data: {
  userFirstName: string;
  email: string;
  publicationType: string;
  title: string;
  requestType: string;
  bidDeadline: string;
  opportunityId: number;
}) {
  return sendEmail({
    to: data.email,
    subject: 'New Opportunity Alert! 🔥',
    template: 'new-opportunity-alert',
    variables: {
      ...data,
      frontendUrl: process.env.FRONTEND_URL || 'https://quotebid.co'
    },
    preferenceType: 'alerts'
  });
}

export async function sendSubscriptionRenewalFailedEmail(data: {
  userFirstName: string;
  email: string;
  subscriptionPlan: string;
  monthlyAmount: string;
  cardLast4: string;
  nextAttemptDate: string;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Payment Issue - Action Required ⚠️',
    template: 'subscription-renewal-failed',
    variables: data,
    preferenceType: 'billing',
    skipPreferenceCheck: true // Always send billing issues
  });
}

export async function sendSavedOpportunityAlertEmail(data: {
  userFirstName: string;
  email: string;
  opportunityTitle: string;
  publicationType: string;
  bidDeadline: string;
  opportunityId: number;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Don\'t Miss Out - Submit Your Pitch! ⏰',
    template: 'saved-opportunity-alert',
    variables: data,
    preferenceType: 'alerts'
  });
}

export async function sendPasswordResetEmail(data: {
  userFirstName: string;
  userEmail: string;
  email: string;
  resetUrl: string;
}) {
  return sendEmail({
    to: data.email,
    subject: 'Reset Your QuoteBid Password 🔐',
    template: 'password-reset',
    variables: {
      userFirstName: data.userFirstName,
      userEmail: data.userEmail,
      resetUrl: data.resetUrl
    },
    skipPreferenceCheck: true // Always send password resets
  });
}

export async function sendAdminPitchNotification(data: {
  // Pitch details
  pitchId: number;
  pitchContent: string;
  pitchType: string;
  bidAmount: number;
  submittedAt: string;
  
  // User details
  userFullName: string;
  userEmail: string;
  userUsername: string;
  userTitle?: string;
  userCompany?: string;
  
  // Opportunity details
  opportunityTitle: string;
  publicationName: string;
  industry?: string;
  currentPrice: string;
  deadline?: string;
}) {
  try {
    // Get specific admin email (ID 5 - Juan)
    const admin = await getDb().select({ email: adminUsers.email }).from(adminUsers).where(eq(adminUsers.id, 5)).limit(1);
    
    if (admin.length === 0) {
      console.error('❌ Admin user ID 5 not found in database');
      return { success: false, error: 'Admin user not found' };
    }
    
    const adminEmail = admin[0].email;
    if (!adminEmail || !adminEmail.trim()) {
      return { success: false, error: 'Admin email is empty' };
    }

    // Truncate opportunity title for email header if too long
    const truncateForHeader = (text: string, maxLength: number = 120): string => {
      if (!text || text.length <= maxLength) return text;
      return text.substring(0, maxLength).trim() + '...';
    };

    // Use the same pattern as other working email functions
    return await sendEmail({
      to: adminEmail,
      subject: `New Pitch Received ($${data.bidAmount}) - ${data.userFullName} - ${data.publicationName}`,
      template: 'admin-pitch-notification',
      variables: {
        pitchId: data.pitchId,
        pitchContent: data.pitchContent || 'No content provided',
        pitchType: data.pitchType || 'Text',
        bidAmount: data.bidAmount,
        submittedAt: data.submittedAt,
        
        userFullName: data.userFullName,
        userEmail: data.userEmail,
        userUsername: data.userUsername,
        userTitle: data.userTitle || 'Not specified',
        userCompany: data.userCompany || 'Not specified',
        
        opportunityTitle: truncateForHeader(data.opportunityTitle),
        publicationName: data.publicationName,
        industry: data.industry || 'Not specified',
        currentPrice: data.currentPrice,
        deadline: data.deadline || 'Not specified',
        
        currentYear: new Date().getFullYear()
      },
      skipPreferenceCheck: true // Admin emails should always be sent
    });
  } catch (error) {
    console.error('❌ Failed to send admin pitch notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ====== VALIDATION FUNCTIONS ======

export async function validateEmailTemplates(): Promise<{ 
  valid: boolean; 
  missing: string[]; 
  errors: string[] 
}> {
  const templateNames = [
    'welcome',
    'article-published', 
    'billing-confirmation',
    'draft-reminder',
    'pitch-submitted',
    'pitch-rejected',
    'pitch-sent',
    'pitch-interested',
    'new-opportunity-alert',
    'subscription-renewal-failed',
    'saved-opportunity-alert',
    'password-reset',
    'admin-pitch-notification'
  ];

  const missing: string[] = [];
  const errors: string[] = [];

  for (const templateName of templateNames) {
    const templatePath = path.join(process.cwd(), 'server/email-templates', `${templateName}.html`);
    
    if (!fs.existsSync(templatePath)) {
      missing.push(`${templateName}.html`);
    } else {
      try {
        const content = fs.readFileSync(templatePath, 'utf8');
        if (content.length < 100) {
          errors.push(`${templateName}.html appears to be empty or too short`);
        }
      } catch (error) {
        errors.push(`Failed to read ${templateName}.html: ${error}`);
      }
    }
  }

  const valid = missing.length === 0 && errors.length === 0;
  
  console.log(`📧 Email template validation: ${valid ? '✅ PASSED' : '❌ FAILED'}`);
  if (missing.length > 0) console.log(`❌ Missing templates:`, missing);
  if (errors.length > 0) console.log(`❌ Template errors:`, errors);

  return { valid, missing, errors };
}

export async function validateEmailConfiguration(): Promise<{ 
  valid: boolean; 
  issues: string[] 
}> {
  const issues: string[] = [];

  // Check required environment variables
  if (!process.env.RESEND_API_KEY) {
    issues.push('RESEND_API_KEY not set');
  }
  
  if (!process.env.EMAIL_FROM) {
    issues.push('EMAIL_FROM not set (will use default)');
  }
  
  if (!process.env.FRONTEND_URL) {
    issues.push('FRONTEND_URL not set (will use default)');
  }

  // Test Resend instance
  try {
    const resend = getResendInstance();
    if (!resend) {
      issues.push('Resend instance could not be created');
    }
  } catch (error) {
    issues.push(`Resend initialization failed: ${error}`);
  }

  const valid = issues.length === 0;
  
  console.log(`📧 Email configuration validation: ${valid ? '✅ PASSED' : '❌ FAILED'}`);
  if (issues.length > 0) console.log(`❌ Configuration issues:`, issues);

  return { valid, issues };
}

console.log('✅ Production email system loaded successfully'); 