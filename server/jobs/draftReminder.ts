import { getDb } from '../db';
import { users, opportunities, publications, pitches } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';

interface DraftReminderJob {
  userId: number;
  draftId: number;
  opportunityId: number;
  createdAt: Date;
}

// In-memory job storage (could be upgraded to Redis/database later)
const scheduledDraftReminders = new Map<string, NodeJS.Timeout>();

/**
 * Schedule a draft reminder email
 * @param userId - The user who created the draft
 * @param draftId - The ID of the draft pitch
 * @param opportunityId - The opportunity the draft is for
 * @param createdAt - When the draft was created/updated
 */
export function scheduleDraftReminder(userId: number, draftId: number, opportunityId: number, createdAt: Date) {
  const jobKey = `${userId}-${draftId}`;
  
  console.log(`📅 Scheduling draft reminder for user ${userId}, draft ${draftId}, opportunity ${opportunityId}`);
  
  // Clear any existing reminder for this draft
  if (scheduledDraftReminders.has(jobKey)) {
    clearTimeout(scheduledDraftReminders.get(jobKey)!);
    scheduledDraftReminders.delete(jobKey);
  }
  
  // Calculate delay: 30 minutes from when draft was created/updated
  const thirtyMinutesMs = 30 * 60 * 1000; // 30 minutes in milliseconds
  const now = Date.now();
  const draftTime = createdAt.getTime();
  const scheduledTime = draftTime + thirtyMinutesMs;
  const delay = Math.max(0, scheduledTime - now);
  
  // For testing: use 2 minutes if in development
  const actualDelay = process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : delay;
  
  const jobTimeout = setTimeout(async () => {
    try {
      console.log(`🚨 Executing draft reminder for user ${userId}, draft ${draftId}, opportunity ${opportunityId}`);
      await sendDraftReminder(userId, draftId, opportunityId);
      scheduledDraftReminders.delete(jobKey);
    } catch (error) {
      console.error(`❌ Failed to send draft reminder for user ${userId}, draft ${draftId}:`, error);
      scheduledDraftReminders.delete(jobKey);
    }
  }, actualDelay);
  
  scheduledDraftReminders.set(jobKey, jobTimeout);
  
  const scheduledDate = new Date(Date.now() + actualDelay);
  console.log(`✅ Scheduled draft reminder for ${scheduledDate.toISOString()} (${actualDelay/1000/60} minutes from now)`);
}

/**
 * Cancel a scheduled draft reminder
 * @param userId - The user ID
 * @param draftId - The draft ID
 */
export function cancelDraftReminder(userId: number, draftId: number) {
  const jobKey = `${userId}-${draftId}`;
  
  if (scheduledDraftReminders.has(jobKey)) {
    clearTimeout(scheduledDraftReminders.get(jobKey)!);
    scheduledDraftReminders.delete(jobKey);
    console.log(`🚫 Cancelled draft reminder for user ${userId}, draft ${draftId}`);
  }
}

/**
 * Send draft reminder email to a specific user
 * @param userId - The user to remind
 * @param draftId - The draft pitch ID
 * @param opportunityId - The opportunity ID
 */
async function sendDraftReminder(userId: number, draftId: number, opportunityId: number) {
  try {
    console.log(`📧 Processing draft reminder for user ${userId}, draft ${draftId}, opportunity ${opportunityId}`);
    
    // Check if draft still exists and is still a draft
    const draftPitch = await getDb()
      .select()
      .from(pitches)
      .where(and(
        eq(pitches.id, draftId),
        eq(pitches.userId, userId),
        eq(pitches.isDraft, true),
        eq(pitches.status, 'draft')
      ))
      .limit(1);
    
    if (draftPitch.length === 0) {
      console.log(`⏭️ Draft ${draftId} no longer exists or has been submitted, skipping reminder`);
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
    
    // Calculate current price and time remaining
    const currentPrice = `$${opportunity.current_price || opportunity.minimumBid || 250}`;
    const deadline = opportunity.deadline ? new Date(opportunity.deadline) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const hoursRemaining = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60)));
    const timeLeft = hoursRemaining > 0 ? `${hoursRemaining} hours` : 'Less than 1 hour';
    
    console.log(`📧 Sending draft reminder email to ${user.email}`);
    
    await sendDraftReminderEmail(user, opportunity, currentPrice, timeLeft);
    
    console.log(`✅ Sent draft reminder email to ${user.email} for opportunity: ${opportunity.title}`);
    
  } catch (error) {
    console.error(`❌ Error in sendDraftReminder for user ${userId}, draft ${draftId}:`, error);
  }
}

/**
 * Send the actual draft reminder email
 */
async function sendDraftReminderEmail(
  user: { id: number; email: string; fullName?: string; username?: string }, 
  opportunity: any,
  currentPrice: string,
  timeLeft: string
) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://quotebid.co';
  
  // Load and render HTML email template
  const templatePath = path.join(process.cwd(), 'server/email-templates/draft-reminder.html');
  let emailHtml = fs.readFileSync(templatePath, 'utf8');
  
  // Replace template variables
  emailHtml = emailHtml
    .replace(/\{\{userFirstName\}\}/g, user.fullName?.split(' ')[0] || user.username || 'Expert')
    .replace(/\{\{opportunityTitle\}\}/g, opportunity.title)
    .replace(/\{\{opportunityDescription\}\}/g, opportunity.description || 'Expert commentary needed for this publication opportunity.')
    .replace(/\{\{publicationName\}\}/g, opportunity.publication?.name || 'Top Publication')
    .replace(/\{\{requestType\}\}/g, opportunity.requestType || 'Expert Commentary')
    .replace(/\{\{currentPrice\}\}/g, currentPrice)
    .replace(/\{\{timeLeft\}\}/g, timeLeft)
    .replace(/\{\{opportunityId\}\}/g, opportunity.id.toString())
    .replace(/\{\{frontendUrl\}\}/g, frontendUrl);
  
  // Send email using Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const emailData = {
    from: 'QuoteBid <noreply@quotebid.co>',
    to: user.email,
    subject: `Complete Your Pitch Draft - Opportunity Waiting`,
    html: emailHtml,
    text: `Hi ${user.fullName?.split(' ')[0] || user.username},\n\nYou started a pitch but haven't finished it yet. Don't lose this opportunity!\n\nComplete your pitch: ${frontendUrl}/opportunities/${opportunity.id}#pitch-form\n\nCurrent Price: ${currentPrice} • Time Left: ${timeLeft}\n\nQuoteBid`,
  };
  
  const result = await resend.emails.send(emailData);
  console.log(`📧 Draft reminder email sent to ${user.email}:`, result);
  
  return result;
}

export default {
  scheduleDraftReminder,
  cancelDraftReminder,
}; 