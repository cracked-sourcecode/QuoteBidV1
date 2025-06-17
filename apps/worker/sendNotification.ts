/**
 * Notification Helper
 * 
 * Sends price drop and last call notifications via Resend email and web push
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import { config } from "dotenv";
import { opportunities } from "../../shared/schema";
import { FEATURE_FLAGS } from "../../config/featureFlags";

import { sendPricingNotificationEmail } from "../../server/lib/email";
// Import database initialization for web push notifications
import { initializeDatabase } from "../../server/db";

// Load environment variables
config();

// Initialize database for web push notifications
try {
  initializeDatabase();
  console.log("✅ Database initialized for web push notifications in sendNotification worker");
} catch (error) {
  console.log("⚠️ Database initialization for web push notifications failed in sendNotification worker:", error);
}

// Email throttling: track when we last sent emails for each opportunity
const lastEmailSentMap = new Map<string, number>();

// Minimum time between emails for the same opportunity (in milliseconds)
const EMAIL_THROTTLE_MINUTES = parseInt(process.env.EMAIL_THROTTLE_MINUTES || "15");
const EMAIL_THROTTLE_MS = EMAIL_THROTTLE_MINUTES * 60 * 1000; // Default: 15 minutes

console.log(`📧 Email throttling configured: ${EMAIL_THROTTLE_MINUTES} minutes between emails for same opportunity`);

// Cleanup old throttle entries every hour to prevent memory buildup
setInterval(() => {
  const now = Date.now();
  const cutoffTime = now - (24 * 60 * 60 * 1000); // Remove entries older than 24 hours
  
  for (const [opportunityId, timestamp] of lastEmailSentMap.entries()) {
    if (timestamp < cutoffTime) {
      lastEmailSentMap.delete(opportunityId);
    }
  }
  
  if (lastEmailSentMap.size > 0) {
    console.log(`🧹 Email throttle cache cleanup: ${lastEmailSentMap.size} active throttles remaining`);
  }
}, 60 * 60 * 1000); // Every hour

// Initialize database with validation
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const neonSql = neon(connectionString);
const db = drizzle(neonSql);

/**
 * Get users who have saved or drafted pitches for an opportunity
 */
async function getUsersForOpportunity(opportunityId: string): Promise<{ id: number; email: string }[]> {
  try {
    // For now, we'll implement a basic query to get users who have pitched on this opportunity
    // In the future, this could be expanded to include users who saved/bookmarked the opportunity
    
    const result = await neonSql`
      SELECT DISTINCT u.id, u.email 
      FROM users u
      JOIN pitches p ON u.id = p.user_id 
      WHERE p.opportunity_id = ${opportunityId}
      AND u.email IS NOT NULL
      AND u.email != ''
    `;
    
    const users = result.map((row: any) => ({ 
      id: row.id, 
      email: row.email 
    })).filter(user => user.email);
    
    console.log(`👥 Found ${users.length} users for opportunity ${opportunityId}`);
    
    return users;
    
  } catch (error) {
    console.error(`❌ Failed to get users for opportunity ${opportunityId}:`, error);
    return [];
  }
}

/**
 * Get opportunity details for notification context
 */
async function getOpportunityDetails(opportunityId: string) {
  try {
    const opp = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, parseInt(opportunityId)))
      .limit(1);
    
    return opp[0] || null;
  } catch (error) {
    console.error(`❌ Failed to get opportunity details for ${opportunityId}:`, error);
    return null;
  }
}

/**
 * Send notification email to interested users
 */
export async function sendNotification(
  opportunityId: string, 
  template: "PRICE_DROP" | "LAST_CALL"
): Promise<void> {
  console.log(`📨 Sending ${template} notification for opportunity ${opportunityId}...`);

  // Check feature flags - silently return if notifications are disabled
  if (!FEATURE_FLAGS.ENABLE_PRICE_EMAILS && !FEATURE_FLAGS.ENABLE_PRICE_PUSHES) {
    console.log('🔕 Notification suppressed by feature flag');
    return; // 🔇 silenced
  }

  // Check email throttling - prevent sending emails too frequently for the same opportunity
  const now = Date.now();
  const lastEmailTime = lastEmailSentMap.get(opportunityId);
  
  if (lastEmailTime && (now - lastEmailTime) < EMAIL_THROTTLE_MS) {
    const timeRemaining = Math.ceil((EMAIL_THROTTLE_MS - (now - lastEmailTime)) / 60000);
    console.log(`⏳ Email throttled for opportunity ${opportunityId}. Last email sent ${Math.ceil((now - lastEmailTime) / 60000)} minutes ago. Will allow next email in ${timeRemaining} minutes.`);
    return;
  }

  // Get users who should receive this notification
  const users = await getUsersForOpportunity(opportunityId);
  
  if (users.length === 0) {
    console.log(`📭 No users to notify for opportunity ${opportunityId}`);
    return;
  }

  const emails = users.map(user => user.email);
  const userIds = users.map(user => user.id);

  // Get opportunity details for context
  const opportunity = await getOpportunityDetails(opportunityId);
  const opportunityTitle = opportunity?.title || "QuoteBid Opportunity";
  const currentPrice = opportunity?.current_price || "TBD";

  // Email templates are now handled by our centralized email library

  // Configure web push notification content
  const pushPayload = {
    PRICE_DROP: {
      title: "🔥 Price dropped!",
      body: `${opportunityTitle} now $${currentPrice}`,
      url: `/opportunity/${opportunityId}`,
    },
    LAST_CALL: {
      title: "⏰ Last call!",
      body: `${opportunityTitle} closes soon - $${currentPrice}`,
      url: `/opportunity/${opportunityId}`,
    },
  };

  // Send web push notifications only if enabled
  if (FEATURE_FLAGS.ENABLE_PRICE_PUSHES) {
    // DISABLED: Web push notifications not needed per user request
    /*
    try {
      await sendWebPush(userIds, pushPayload[template]);
      console.log(`📱 Sent ${template} push notification to ${userIds.length} users for opportunity ${opportunityId}`);
    } catch (pushError) {
      console.warn(`⚠️ Failed to send web push notifications:`, pushError);
      // Don't fail the entire notification process if push fails
    }
    */
    console.log(`📱 Web push notifications disabled for ${template} on opportunity ${opportunityId}`);
  } else {
    console.log('🔕 Push notification suppressed by feature flag');
  }

  // Send email notifications only if enabled
  if (FEATURE_FLAGS.ENABLE_PRICE_EMAILS) {
    try {
      const success = await sendPricingNotificationEmail(
        emails,
        template,
        opportunityTitle,
        currentPrice
      );

      if (success) {
        console.log(`✅ Sent ${template} email notification to ${emails.length} users for opportunity ${opportunityId}`);
        
        // Record successful email send time for throttling
        lastEmailSentMap.set(opportunityId, now);
        console.log(`📧 Email throttle timer set for opportunity ${opportunityId}. Next email allowed in ${EMAIL_THROTTLE_MINUTES} minutes.`);
      } else {
        console.error(`❌ Failed to send ${template} email notification for opportunity ${opportunityId}`);
      }

    } catch (error) {
      console.error(`❌ Failed to send ${template} email notification:`, error);
      // TODO: send Slack DM via webhook so you know instantly
      // Example: await fetch(process.env.SLACK_WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ text: `QuoteBid email failed: ${error}` }) });
      throw error;
    }
  } else {
    console.log('🔕 Email notification suppressed by feature flag');
  }
} 