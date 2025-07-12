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
  console.log('📧 Email scheduler disabled - emails send immediately on creation');
  // SCHEDULER DISABLED - No background processing
  // Emails are sent immediately when opportunities are created
}

export function stopEmailScheduler() {
  console.log('📧 Email scheduler was already disabled');
}

// Helper function to send an email for a new opportunity (immediately, no scheduling)
export async function scheduleOpportunityEmail(opportunityId: number, delayMinutes: number = computeEmailDelay()) {
  try {
    console.log(`🚀 Sending opportunity email immediately for ID ${opportunityId}`);
    
    const db = getDb();
    
    // Check if email was already sent to prevent duplicates
    const existing = await db
      .select({ email_sent_at: opportunities.email_sent_at })
      .from(opportunities)
      .where(eq(opportunities.id, opportunityId))
      .limit(1);
    
    if (existing[0]?.email_sent_at) {
      console.log(`⚠️ Email already sent for opportunity ${opportunityId}, skipping`);
      return;
    }
    
    // Mark as sending to prevent race conditions
    await db
      .update(opportunities)
      .set({ 
        email_send_attempted: true,
        email_scheduled_at: new Date()
      })
      .where(eq(opportunities.id, opportunityId));
    
    // Send immediately
    try {
      await sendOpportunityEmails(opportunityId);
      
      // Mark as sent successfully
      await db
        .update(opportunities)
        .set({ email_sent_at: new Date() })
        .where(eq(opportunities.id, opportunityId));
        
      console.log(`✅ Email sent immediately for opportunity ID ${opportunityId}`);
    } catch (emailError) {
      console.error(`❌ Immediate send failed for ID ${opportunityId}:`, emailError);
      // Keep email_send_attempted = true to prevent retries
    }
    
  } catch (error) {
    console.error(`❌ Failed to send email for opportunity ID ${opportunityId}:`, error);
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