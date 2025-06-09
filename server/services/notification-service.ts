import { getDb } from '../db';
import { notifications, users, InsertNotification } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendUserNotificationEmail } from '../lib/email';

export class NotificationService {
  /**
   * Create a new notification and send corresponding email
   */
  async createNotification(data: Omit<InsertNotification, 'isRead'>) {
    const db = getDb();
    
    // Create the in-app notification
    const result = await db.insert(notifications).values({
      ...data,
      isRead: false,
    }).returning();

    // Send email notification
    try {
      // Get user information for email
      const user = await db.select({
        email: users.email,
        fullName: users.fullName,
        username: users.username
      })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

      if (user.length > 0) {
        const userData = user[0];
        const userName = userData.fullName || userData.username;
        
        // Determine link text based on notification type
        const getLinkText = () => {
          switch (data.type) {
            case 'opportunity':
              return 'View Opportunity';
            case 'pitch_status':
              return 'View My Pitches';
            case 'payment':
              return 'View Payment Details';
            case 'media_coverage':
              return 'View Media Coverage';
            case 'system':
            default:
              return 'View Details';
          }
        };

        // Send the email notification
        await sendUserNotificationEmail(
          userData.email,
          userName,
          data.type as 'system' | 'opportunity' | 'pitch_status' | 'payment' | 'media_coverage',
          data.title,
          data.message,
          data.linkUrl || undefined,
          getLinkText()
        );

        console.log(`📧 Sent ${data.type} notification email to ${userData.email} for user ${data.userId}`);
      } else {
        console.warn(`⚠️ User ${data.userId} not found for email notification`);
      }
    } catch (emailError) {
      console.error(`❌ Failed to send email notification for user ${data.userId}:`, emailError);
      // Don't throw error - notification was created successfully, email is supplementary
    }

    return result;
  }

  /**
   * Create a system notification (general announcements, reminders, etc.)
   */
  async createSystemNotification(userId: number, title: string, message: string, linkUrl?: string) {
    return this.createNotification({
      userId,
      type: 'system',
      title,
      message,
      linkUrl,
      icon: 'info',
      iconColor: 'blue',
    });
  }

  /**
   * Create a notification for a new opportunity matching user's interests
   */
  async createOpportunityNotification(userId: number, opportunityId: number, title: string, message: string) {
    return this.createNotification({
      userId,
      type: 'opportunity',
      title,
      message,
      linkUrl: `/opportunities/${opportunityId}`,
      relatedId: opportunityId,
      relatedType: 'opportunity',
      icon: 'tag',
      iconColor: 'blue',
    });
  }

  /**
   * Create a notification for a pitch status change
   */
  async createPitchStatusNotification(userId: number, pitchId: number, status: string, title: string, message: string) {
    // Determine icon and color based on status
    let icon = 'info';
    let iconColor = 'blue';

    if (status === 'accepted' || status === 'approved') {
      icon = 'check-circle';
      iconColor = 'green';
    } else if (status === 'rejected' || status === 'declined') {
      icon = 'x-circle';
      iconColor = 'red';
    } else if (status === 'pending' || status === 'in_review') {
      icon = 'clock';
      iconColor = 'amber';
    }

    return this.createNotification({
      userId,
      type: 'pitch_status',
      title,
      message,
      linkUrl: `/my-pitches?pitchId=${pitchId}`,
      relatedId: pitchId,
      relatedType: 'pitch',
      icon,
      iconColor,
    });
  }

  /**
   * Create a notification for a successful payment
   */
  async createPaymentNotification(userId: number, pitchId: number, amount: number, publicationName: string) {
    return this.createNotification({
      userId,
      type: 'payment',
      title: `Payment successful - $${amount}`,
      message: `Your payment for the ${publicationName} article has been processed.`,
      linkUrl: `/my-pitches?pitchId=${pitchId}`,
      relatedId: pitchId,
      relatedType: 'payment',
      icon: 'credit-card',
      iconColor: 'green',
    });
  }
}

export const notificationService = new NotificationService();
