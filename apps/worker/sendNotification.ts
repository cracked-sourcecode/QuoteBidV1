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
import { sendWebPush } from "../../lib/sendWebPush";
import { sendPricingNotificationEmail } from "../../server/lib/email";

// Load environment variables
config();

// Initialize database
const neonSql = neon(process.env.DATABASE_URL!);
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

  // Send web push notifications (always attempt, doesn't require configuration)
  try {
    await sendWebPush(userIds, pushPayload[template]);
    console.log(`📱 Sent ${template} push notification to ${userIds.length} users for opportunity ${opportunityId}`);
  } catch (pushError) {
    console.warn(`⚠️ Failed to send web push notifications:`, pushError);
    // Don't fail the entire notification process if push fails
  }

  // Send email notifications using our centralized email system
  try {
    const success = await sendPricingNotificationEmail(
      emails,
      template,
      opportunityTitle,
      currentPrice
    );

    if (success) {
      console.log(`✅ Sent ${template} email notification to ${emails.length} users for opportunity ${opportunityId}`);
    } else {
      console.error(`❌ Failed to send ${template} email notification for opportunity ${opportunityId}`);
    }

  } catch (error) {
    console.error(`❌ Failed to send ${template} email notification:`, error);
    // TODO: send Slack DM via webhook so you know instantly
    // Example: await fetch(process.env.SLACK_WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ text: `QuoteBid email failed: ${error}` }) });
    throw error;
  }
} 