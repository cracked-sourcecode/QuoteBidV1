import webpush from "web-push";
import { getDb } from "../server/db";
import { pricing_config, push_subscriptions } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

let webpushConfigured = false;

/**
 * Configure web-push with VAPID keys from database
 */
async function configureWebPush() {
  if (webpushConfigured) return;
  
  try {
    const db = getDb();
    const config = await db
      .select()
      .from(pricing_config)
      .where(inArray(pricing_config.key, ["vapidPublicKey", "vapidPrivateKey"]));
    
    const publicKey = config.find(c => c.key === "vapidPublicKey")?.value;
    const privateKey = config.find(c => c.key === "vapidPrivateKey")?.value;
    
    if (!publicKey || !privateKey) {
      throw new Error("VAPID keys not found in database. Run seedVapidKeys.ts first.");
    }
    
    webpush.setVapidDetails(
      "mailto:alerts@quotebid.com",
      publicKey as string,
      privateKey as string
    );
    
    webpushConfigured = true;
    console.log("🔑 Web push configured with VAPID keys");
  } catch (error) {
    console.error("❌ Failed to configure web push:", error);
    throw error;
  }
}

/**
 * Send web push notification to specific users
 */
export async function sendWebPush(userIds: number[], payload: {
  title: string;
  body: string;
  url: string;
  icon?: string;
}) {
  try {
    await configureWebPush();
    
    const db = getDb();
    const subscriptions = await db
      .select()
      .from(push_subscriptions)
      .where(inArray(push_subscriptions.user_id, userIds));
    
    if (subscriptions.length === 0) {
      console.log(`📱 No push subscriptions found for users: ${userIds.join(', ')}`);
      return { sent: 0, failed: 0 };
    }
    
    console.log(`📱 Sending push notification to ${subscriptions.length} subscriptions for users: ${userIds.join(', ')}`);
    
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            sub.subscription as any,
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              url: payload.url,
              icon: payload.icon || "/icon-192.png",
              timestamp: Date.now(),
            })
          );
          return { success: true, subscriptionId: sub.id };
        } catch (error: any) {
          console.warn(`⚠️ Failed to send push to subscription ${sub.id}:`, error.message);
          
          // Remove invalid subscriptions (410 = Gone, 400 = Bad Request)
          if (error.statusCode === 410 || error.statusCode === 400) {
            console.log(`🗑️ Removing invalid subscription ${sub.id}`);
            await db
              .delete(push_subscriptions)
              .where(eq(push_subscriptions.id, sub.id));
          }
          
          return { success: false, subscriptionId: sub.id, error: error.message };
        }
      })
    );
    
    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    console.log(`✅ Push notification results: ${sent} sent, ${failed} failed`);
    
    return { sent, failed };
  } catch (error) {
    console.error("❌ Error sending web push notifications:", error);
    throw error;
  }
}

/**
 * Get VAPID public key for client-side subscription
 */
export async function getVapidPublicKey(): Promise<string> {
  try {
    const db = getDb();
    const config = await db
      .select()
      .from(pricing_config)
      .where(eq(pricing_config.key, "vapidPublicKey"))
      .limit(1);
    
    const publicKey = config[0]?.value;
    if (!publicKey) {
      throw new Error("VAPID public key not found in database");
    }
    
    return publicKey as string;
  } catch (error) {
    console.error("❌ Error fetching VAPID public key:", error);
    throw error;
  }
} 