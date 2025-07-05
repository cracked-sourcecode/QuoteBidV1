import { getDb } from '../db';
import { users, opportunities, publications, savedOpportunities, pitches } from '@shared/schema';
import { eq, and, gte, isNull } from 'drizzle-orm';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';

interface SavedOpportunityJob {
  userId: number;
  opportunityId: number;
  savedAt: Date;
}

// In-memory job storage (could be upgraded to Redis/database later)
const scheduledReminders = new Map<string, NodeJS.Timeout>();

/**
 * Schedule a saved opportunity reminder email
 * @param userId - The user who saved the opportunity
 * @param opportunityId - The opportunity that was saved
 * @param savedAt - When the opportunity was saved
 */
export function scheduleSavedOpportunityReminder(userId: number, opportunityId: number, savedAt: Date) {
  const jobKey = `${userId}-${opportunityId}`;
  
  console.log(`📅 Scheduling saved opportunity reminder for user ${userId}, opportunity ${opportunityId}`);
  
  // Clear any existing reminder for this user/opportunity
  if (scheduledReminders.has(jobKey)) {
    clearTimeout(scheduledReminders.get(jobKey)!);
    scheduledReminders.delete(jobKey);
  }
  
  // Calculate delay: 6 hours from when saved
  const sixHoursMs = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  const now = Date.now();
  const savedTime = savedAt.getTime();
  const scheduledTime = savedTime + sixHoursMs;
  const delay = Math.max(0, scheduledTime - now);
  
  // For testing: use 30 seconds if in development
  const actualDelay = process.env.NODE_ENV === 'development' ? 30 * 1000 : delay;
  
  const jobTimeout = setTimeout(async () => {
    try {
      console.log(`🚨 Executing saved opportunity reminder for user ${userId}, opportunity ${opportunityId}`);
      await sendSavedOpportunityReminder(userId, opportunityId);
      scheduledReminders.delete(jobKey);
    } catch (error) {
      console.error(`❌ Failed to send saved opportunity reminder for user ${userId}, opportunity ${opportunityId}:`, error);
      scheduledReminders.delete(jobKey);
    }
  }, actualDelay);
  
  scheduledReminders.set(jobKey, jobTimeout);
  
  const scheduledDate = new Date(Date.now() + actualDelay);
  console.log(`✅ Scheduled saved opportunity reminder for ${scheduledDate.toISOString()} (${actualDelay/1000/60} minutes from now)`);
}

/**
 * Cancel a scheduled saved opportunity reminder
 * @param userId - The user ID
 * @param opportunityId - The opportunity ID
 */
export function cancelSavedOpportunityReminder(userId: number, opportunityId: number) {
  const jobKey = `${userId}-${opportunityId}`;
  
  if (scheduledReminders.has(jobKey)) {
    clearTimeout(scheduledReminders.get(jobKey)!);
    scheduledReminders.delete(jobKey);
    console.log(`🚫 Cancelled saved opportunity reminder for user ${userId}, opportunity ${opportunityId}`);
  }
}

/**
 * Send saved opportunity reminder email to a specific user
 * @param userId - The user to remind
 * @param opportunityId - The opportunity they saved
 */
async function sendSavedOpportunityReminder(userId: number, opportunityId: number) {
  try {
    console.log(`📧 Processing saved opportunity reminder for user ${userId}, opportunity ${opportunityId}`);
    
    // Check if user has already pitched for this opportunity
    const existingPitch = await getDb()
      .select({ id: pitches.id })
      .from(pitches)
      .where(and(
        eq(pitches.userId, userId),
        eq(pitches.opportunityId, opportunityId)
      ))
      .limit(1);
    
    if (existingPitch.length > 0) {
      console.log(`⏭️ User ${userId} already pitched for opportunity ${opportunityId}, skipping reminder`);
      return;
    }
    
    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      console.error(`❌ User ${userId} not found`);
      return;
    }
    
    // Get opportunity with publication data
    const opportunity = await storage.getOpportunityWithPublication(opportunityId);
    if (!opportunity) {
      console.error(`❌ Opportunity ${opportunityId} not found`);
      return;
    }
    
    // Check if opportunity is still open
    if (opportunity.status !== 'open') {
      console.log(`⏭️ Opportunity ${opportunityId} is no longer open (${opportunity.status}), skipping reminder`);
      return;
    }
    
    // Calculate deadline display
    const deadline = opportunity.deadline ? new Date(opportunity.deadline) : new Date();
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const deadlineDisplay = daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left` : 'Today';
    
    console.log(`📧 Sending saved opportunity reminder email to ${user.email}`);
    
    await sendSavedOpportunityReminderEmail(user, opportunity, deadlineDisplay);
    
    console.log(`✅ Sent saved opportunity reminder email to ${user.email} for opportunity: ${opportunity.title}`);
    
  } catch (error) {
    console.error(`❌ Error in sendSavedOpportunityReminder for user ${userId}, opportunity ${opportunityId}:`, error);
  }
}

/**
 * Send the actual reminder email
 */
async function sendSavedOpportunityReminderEmail(
  user: { id: number; email: string; fullName?: string; username?: string }, 
  opportunity: any, 
  deadlineDisplay: string
) {
  // Use the new production email system
  const { sendSavedOpportunityAlertEmail } = await import('../lib/email-production');
  
  const result = await sendSavedOpportunityAlertEmail({
    userFirstName: user.fullName?.split(' ')[0] || user.username || 'Expert',
    email: user.email,
    opportunityTitle: opportunity.title,
    publicationType: opportunity.publication?.name || "Top Publication",
    bidDeadline: deadlineDisplay,
    opportunityId: opportunity.id
  });
  
  console.log(`📧 Saved opportunity reminder email sent to ${user.email}:`, result);
  
  return result;
}

export default {
  scheduleSavedOpportunityReminder,
  cancelSavedOpportunityReminder,
}; 