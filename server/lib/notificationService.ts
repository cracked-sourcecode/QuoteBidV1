import { getDb } from '../db';
import { notifications, users } from '@shared/schema';
import { sendNotificationEmail } from './email';
import { eq } from 'drizzle-orm';

interface CreateNotificationParams {
  userId: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  relatedId?: number | null;
  relatedType?: string;
  icon?: string;
  iconColor?: string;
}

export const notificationService = {
  async createNotification(params: CreateNotificationParams) {
    try {
      // Insert notification into database
      const [notification] = await getDb()
        .insert(notifications)
        .values({
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          linkUrl: params.linkUrl || null,
          relatedId: params.relatedId || null,
          relatedType: params.relatedType || null,
          icon: params.icon || null,
          iconColor: params.iconColor || null,
          isRead: false,
          createdAt: new Date()
        })
        .returning();

      console.log(`✅ Created notification: ${params.title} for user ${params.userId}`);

      // Get user email for email notification (bypass preference check for critical notifications)
      const [user] = await getDb()
        .select({ 
          email: users.email, 
          fullName: users.fullName, 
          username: users.username 
        })
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

      if (user?.email) {
        // Send clean email notification WITHOUT brackets
        try {
          const userName = user.fullName?.split(' ')[0] || user.username || 'User';
          
          // Send notification email with clean subject (no brackets!)
          await sendNotificationEmail(
            user.email,
            params.title, // Clean title without brackets
            params.message
          );
          
          console.log(`📧 Sent clean notification email to ${user.email}: "${params.title}"`);
        } catch (emailError) {
          console.error(`❌ Failed to send notification email:`, emailError);
          // Don't fail the notification creation if email fails
        }
      }

      return notification;
    } catch (error) {
      console.error(`❌ Failed to create notification:`, error);
      throw error;
    }
  }
}; 