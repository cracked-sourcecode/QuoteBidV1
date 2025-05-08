import { getDb } from '../db';
import { notifications, InsertNotification } from '@shared/schema';

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: Omit<InsertNotification, 'isRead'>) {
    const db = getDb();
    return db.insert(notifications).values({
      ...data,
      isRead: false,
    }).returning();
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
