import { getDb } from '../db';
import { users, opportunities, publications } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';

interface OpportunityEmailJob {
  opportunityId: number;
  delay: number; // in milliseconds
}

// In-memory job storage (could be upgraded to Redis/database later)
const scheduledJobs = new Map<number, NodeJS.Timeout>();

/**
 * Schedule a delayed opportunity alert email
 * @param opportunityId - The opportunity to send alerts for
 * @param delayMinutes - Delay in minutes (5-10 for front-running prevention)
 */
export function scheduleOpportunityAlert(opportunityId: number, delayMinutes: number = 7) {
  console.log(`📅 Scheduling opportunity alert for ID ${opportunityId} with ${delayMinutes} minute delay`);
  
  // PRODUCTION FIX: Add immediate send option for testing
  if (process.env.NODE_ENV === 'development' || delayMinutes === 0) {
    console.log(`🚀 IMMEDIATE SEND: Sending opportunity alert immediately for ID ${opportunityId}`);
    sendOpportunityAlertEmails(opportunityId).catch(error => {
      console.error(`❌ Immediate send failed for ID ${opportunityId}:`, error);
    });
    return;
  }
  
  // Clear any existing job for this opportunity
  if (scheduledJobs.has(opportunityId)) {
    clearTimeout(scheduledJobs.get(opportunityId)!);
    scheduledJobs.delete(opportunityId);
  }
  
  const delayMs = delayMinutes * 60 * 1000;
  
  const jobTimeout = setTimeout(async () => {
    try {
      console.log(`🚨 Executing delayed opportunity alert for ID ${opportunityId}`);
      await sendOpportunityAlertEmails(opportunityId);
      scheduledJobs.delete(opportunityId);
    } catch (error) {
      console.error(`❌ Failed to send opportunity alert emails for ID ${opportunityId}:`, error);
      scheduledJobs.delete(opportunityId);
    }
  }, delayMs);
  
  scheduledJobs.set(opportunityId, jobTimeout);
  console.log(`✅ Scheduled opportunity alert job for ID ${opportunityId} (executing in ${delayMinutes} minutes)`);
}

/**
 * Cancel a scheduled opportunity alert
 * @param opportunityId - The opportunity ID to cancel alerts for
 */
export function cancelOpportunityAlert(opportunityId: number) {
  if (scheduledJobs.has(opportunityId)) {
    clearTimeout(scheduledJobs.get(opportunityId)!);
    scheduledJobs.delete(opportunityId);
    console.log(`🚫 Cancelled scheduled opportunity alert for ID ${opportunityId}`);
  }
}

/**
 * Send opportunity alert emails to all users matching the opportunity's industry
 * @param opportunityId - The opportunity to send alerts for
 */
async function sendOpportunityAlertEmails(opportunityId: number) {
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
    
    // Get live pricing data for the opportunity
    const livePriceData = await getLivePricingData(opportunityId);
    
    // Send email to each matching user
    const emailPromises = matchingUsers.map(async (user) => {
      try {
        await sendOpportunityAlertEmail(user, opportunity, livePriceData);
        console.log(`✅ Sent opportunity alert email to ${user.email} (${user.fullName || user.username})`);
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${user.email}:`, emailError);
      }
    });
    
    await Promise.all(emailPromises);
    console.log(`🎉 Completed opportunity alert email process for ${matchingUsers.length} users`);
    
  } catch (error) {
    console.error(`❌ Error in sendOpportunityAlertEmails for ID ${opportunityId}:`, error);
  }
}

/**
 * Get live pricing data for an opportunity
 */
async function getLivePricingData(opportunityId: number) {
  try {
    // This would integrate with your live pricing system
    // For now, return mock data similar to welcome email format
    return {
      currentPrice: "$450",
      trend: "+12%",
      status: "rising"
    };
  } catch (error) {
    console.error(`Failed to get live pricing for opportunity ${opportunityId}:`, error);
    return {
      currentPrice: "$350",
      trend: "stable",
      status: "stable"
    };
  }
}

/**
 * Send opportunity alert email to a specific user
 */
async function sendOpportunityAlertEmail(user: { id: number; email: string; fullName?: string; username?: string }, opportunity: any, livePriceData: any) {
  // Calculate deadline display
  const deadline = opportunity.deadline ? new Date(opportunity.deadline) : new Date();
  const now = new Date();
  const timeDiff = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  const deadlineDisplay = daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left` : 'Today';
  
  // Use the new production email system
  const { sendNewOpportunityAlertEmail } = await import('../lib/email-production');
  
  const result = await sendNewOpportunityAlertEmail({
    userFirstName: user.fullName?.split(' ')[0] || user.username || 'Expert',
    email: user.email,
    bidDeadline: deadlineDisplay,
    publicationType: opportunity.publication?.name || "Top Publication",
    title: opportunity.title,
    requestType: opportunity.requestType || "Expert Request",
    opportunityId: opportunity.id
  });
  
  console.log(`📧 New opportunity alert email sent to ${user.email}:`, result);
  
  return result;
}

export default {
  scheduleOpportunityAlert,
  cancelOpportunityAlert,
}; 