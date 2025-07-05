import { getDb } from '../db';
import { notifications, users } from '@shared/schema';
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

      // ⚡ EMAIL SENDING DISABLED - Now handled by dedicated email system
      // Notifications are only stored in database, emails handled separately
      console.log(`📱 Created in-app notification only: "${params.title}" for user ${params.userId}`);

      return notification;
    } catch (error) {
      console.error(`❌ Failed to create notification:`, error);
      throw error;
    }
  }
}; 