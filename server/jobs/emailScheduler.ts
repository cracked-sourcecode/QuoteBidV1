// Email Scheduler Job - Database-based email scheduling
// This replaces the setTimeout approach which was lost on server restart

import { eq, and, lt, isNull, or } from 'drizzle-orm';
import { getDb } from '../db';
import { opportunities } from '@shared/schema';
import { storage } from '../storage';

let schedulerInterval: NodeJS.Timeout | null = null;

// Environment-specific email delay configuration
export function computeEmailDelay(): number {
  // SEND IMMEDIATELY - No delays for opportunity emails
  return 0;
}

export function startEmailScheduler() {
  console.log('📧 Starting email scheduler background job...');
  
  // Check for pending emails every minute
  schedulerInterval = setInterval(async () => {
    await checkAndSendPendingEmails();
  }, 60000); // 60 seconds

  // Also run immediately on startup to catch any emails that should have been sent
  setTimeout(async () => {
    await checkAndSendPendingEmails();
  }, 5000); // Wait 5 seconds for server to be ready
}

export function stopEmailScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('📧 Email scheduler stopped');
  }
}

async function checkAndSendPendingEmails() {
  try {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));
    const db = getDb();
    
    // Find opportunities that need emails sent:
    // 1. Regular scheduled emails: email_scheduled_at <= now AND email_sent_at IS NULL AND email_send_attempted = false
    // 2. FAIL-SAFE: email_scheduled_at IS NULL AND email_sent_at IS NULL AND created_at <= 10 minutes ago
    const pendingOpportunities = await db
      .select()
      .from(opportunities)
      .where(
        or(
          // Regular scheduled emails that are due
          and(
            lt(opportunities.email_scheduled_at, now),
            isNull(opportunities.email_sent_at),
            eq(opportunities.email_send_attempted, false)
          ),
          // FAIL-SAFE: opportunities that were never scheduled but are older than 10 minutes
          and(
            isNull(opportunities.email_scheduled_at),
            isNull(opportunities.email_sent_at),
            lt(opportunities.createdAt, tenMinutesAgo)
          )
        )
      );

    if (pendingOpportunities.length === 0) {
      // Only log if we're in development mode to avoid spam
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 No pending emails to send');
      }
      return;
    }

    console.log(`📧 Found ${pendingOpportunities.length} pending opportunity emails to send`);

    // Process each opportunity
    for (const opportunity of pendingOpportunities) {
      await processPendingEmail(opportunity);
    }

  } catch (error) {
    console.error('❌ Error in email scheduler:', error);
  }
}

async function processPendingEmail(opportunity: any) {
  try {
    console.log(`📧 Processing email for opportunity ID ${opportunity.id}: "${opportunity.title}"`);

    const db = getDb();
    
    // Mark as attempted immediately to prevent duplicate processing
    await db
      .update(opportunities)
      .set({ email_send_attempted: true })
      .where(eq(opportunities.id, opportunity.id));

    // Send the email alerts to matching users
    await sendOpportunityEmails(opportunity.id);

    // Mark as sent successfully
    await db
      .update(opportunities)
      .set({ email_sent_at: new Date() })
      .where(eq(opportunities.id, opportunity.id));

    console.log(`✅ Email sent successfully for opportunity ID ${opportunity.id}`);

  } catch (error) {
    console.error(`❌ Failed to send email for opportunity ID ${opportunity.id}:`, error);
    
    // Note: We keep email_send_attempted = true to prevent retries
    // You could implement retry logic here if needed
  }
}

// Helper function to schedule an email for a new opportunity
export async function scheduleOpportunityEmail(opportunityId: number, delayMinutes: number = computeEmailDelay()) {
  try {
    // DEVELOPMENT MODE: Send immediately for faster testing
    if (delayMinutes === 0) {
      console.log(`🚀 DEVELOPMENT MODE: Sending opportunity alert immediately for ID ${opportunityId}`);
      
      const db = getDb();
      
      // Mark as scheduled for now in database
      await db
        .update(opportunities)
        .set({ 
          email_scheduled_at: new Date(), // Schedule for immediate send
          email_send_attempted: false,
          email_sent_at: null 
        })
        .where(eq(opportunities.id, opportunityId));
      
      // Send immediately
      try {
        await sendOpportunityEmails(opportunityId);
        
        // Mark as sent
        await db
          .update(opportunities)
          .set({ email_sent_at: new Date() })
          .where(eq(opportunities.id, opportunityId));
          
        console.log(`✅ Development email sent immediately for opportunity ID ${opportunityId}`);
      } catch (emailError) {
        console.error(`❌ Immediate send failed for ID ${opportunityId}:`, emailError);
      }
      return;
    }
    
    // PRODUCTION MODE: Schedule with delay
    const scheduledTime = new Date();
    scheduledTime.setMinutes(scheduledTime.getMinutes() + delayMinutes);

    const db = getDb();
    
    await db
      .update(opportunities)
      .set({ 
        email_scheduled_at: scheduledTime,
        email_send_attempted: false,
        email_sent_at: null 
      })
      .where(eq(opportunities.id, opportunityId));

    console.log(`📅 Email scheduled for opportunity ID ${opportunityId} to be sent at ${scheduledTime.toISOString()}`);
    
  } catch (error) {
    console.error(`❌ Failed to schedule email for opportunity ID ${opportunityId}:`, error);
  }
}

// Send opportunity emails to all users with matching industry
async function sendOpportunityEmails(opportunityId: number) {
  try {
    console.log(`📧 Starting opportunity alert email process for ID ${opportunityId}`);
    
    // Get the opportunity with publication data
    const opportunity = await storage.getOpportunityWithPublication(opportunityId);
    if (!opportunity) {
      console.error(`❌ Opportunity ${opportunityId} not found`);
      return;
    }
    
    if (!opportunity.industry) {
      console.log(`⚠️ Opportunity ${opportunityId} has no industry, skipping email alerts`);
      return;
    }
    
    console.log(`🎯 Finding users with industry: ${opportunity.industry}`);
    
    // Get all users with matching industry
    const matchingUsers = await storage.getUsersByIndustry(opportunity.industry);
    
    if (matchingUsers.length === 0) {
      console.log(`📭 No users found with industry: ${opportunity.industry}`);
      return;
    }
    
    console.log(`📬 Found ${matchingUsers.length} users with matching industry: ${opportunity.industry}`);
    
    // Send email to each matching user
    const { sendNewOpportunityAlertEmail } = await import('../lib/email-production');
    
    const emailPromises = matchingUsers.map(async (user) => {
      try {
        // Calculate deadline display
        const deadline = opportunity.deadline ? new Date(opportunity.deadline) : new Date();
        const now = new Date();
        const timeDiff = deadline.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const deadlineDisplay = daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left` : 'Today';
        
        const result = await sendNewOpportunityAlertEmail({
          userFirstName: user.fullName?.split(' ')[0] || user.username || 'Expert',
          email: user.email,
          bidDeadline: deadlineDisplay,
          publicationType: opportunity.publication?.name || "Top Publication",
          title: opportunity.title,
          requestType: opportunity.requestType || "Expert Request",
          opportunityId: opportunity.id
        });
        
        console.log(`✅ Sent opportunity alert email to ${user.email} (${user.fullName || user.username})`);
        return result;
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${user.email}:`, emailError);
      }
    });
    
    await Promise.all(emailPromises);
    console.log(`🎉 Completed opportunity alert email process for ${matchingUsers.length} users`);
    
  } catch (error) {
    console.error(`❌ Error in sendOpportunityEmails for ID ${opportunityId}:`, error);
  }
} 