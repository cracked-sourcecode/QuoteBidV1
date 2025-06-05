/**
 * Notification Helper
 * 
 * Sends price drop and last call notifications via Resend email and web push
 */

import { Resend } from "resend";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import { config } from "dotenv";
import { opportunities } from "../../shared/schema";
import { sendWebPush } from "../../lib/sendWebPush";

// Load environment variables
config();

// Initialize Resend (optional)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

  // Configure email content based on template
  const emailConfig = {
    PRICE_DROP: {
      subject: "🔥 Price dropped on an opportunity you're interested in",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">💰 Price Drop Alert!</h2>
          <p>Great news! The price has dropped on an opportunity you've shown interest in:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${opportunityTitle}</h3>
            <p style="margin: 0; font-size: 18px; color: #059669;">
              <strong>New Price: $${currentPrice}</strong>
            </p>
          </div>
          
          <p>This could be a great opportunity to submit your pitch at a better price point.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://quotebid.com'}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Opportunity
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            You're receiving this because you've previously shown interest in this opportunity.
          </p>
        </div>
      `,
    },
    LAST_CALL: {
      subject: "⏰ Last call for pitches - Opportunity closing soon",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">⏰ Last Call!</h2>
          <p>Time is running out! An opportunity you're interested in is closing soon:</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${opportunityTitle}</h3>
            <p style="margin: 0; color: #dc2626;">
              <strong>Closing Soon - Current Price: $${currentPrice}</strong>
            </p>
          </div>
          
          <p>Don't miss out! Submit your pitch now before this opportunity expires.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://quotebid.com'}" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Submit Pitch Now
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Act fast - this opportunity may not be available much longer!
          </p>
        </div>
      `,
    },
  };

  const { subject, html } = emailConfig[template];

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

  // Send email notifications if Resend is configured
  if (!resend) {
    console.log(`📭 Resend not configured, skipping email for ${template} notification for opportunity ${opportunityId}`);
    return;
  }

  try {
    // Send email to all interested users
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "QuoteBid <noreply@quotebid.com>",
      to: emails,
      subject,
      html,
    });

    console.log(`✅ Sent ${template} email notification to ${emails.length} users for opportunity ${opportunityId}`);

  } catch (error) {
    console.error(`❌ Failed to send ${template} email notification:`, error);
    throw error;
  }
} 