import { db } from '../db';
import { notificationService } from '../services/notification-service';

/**
 * Creates a set of sample notifications for testing purposes
 */
export async function createSampleNotifications(userId: number): Promise<boolean> {
  try {
    // Create a variety of different notification types for testing
    const notificationPromises = [
      // New opportunity notification
      notificationService.createNotification({
        userId,
        type: 'opportunity',
        title: 'New Real Estate opportunity',
        message: 'A new opportunity matching your industry interests is available',
        icon: 'tag',
        iconColor: 'blue',
        linkUrl: '/opportunities',
      }),

      // Pitch status notification - Accepted
      notificationService.createNotification({
        userId,
        type: 'pitch_status',
        title: 'Pitch accepted',
        message: 'Your pitch to Forbes has been accepted',
        icon: 'check-circle',
        iconColor: 'green',
        linkUrl: '/my-pitches',
        relatedId: 1, // Mock pitch ID
        relatedType: 'pitch',
      }),

      // Pitch status notification - Rejected
      notificationService.createNotification({
        userId,
        type: 'pitch_status',
        title: 'Pitch declined',
        message: 'Your pitch to Bloomberg was not selected this time',
        icon: 'x-circle',
        iconColor: 'red',
        linkUrl: '/my-pitches',
        relatedId: 2, // Mock pitch ID
        relatedType: 'pitch',
      }),

      // Payment notification - Successful
      notificationService.createNotification({
        userId,
        type: 'payment',
        title: 'Payment successful - $500',
        message: 'Your payment for the Wall Street Journal article has been processed',
        icon: 'credit-card',
        iconColor: 'green',
        linkUrl: '/my-pitches',
        relatedId: 3, // Mock pitch ID
        relatedType: 'payment',
      }),

      // System notification
      notificationService.createNotification({
        userId,
        type: 'system',
        title: 'Profile incomplete',
        message: 'Please complete your profile to increase your chances of being selected',
        icon: 'info',
        iconColor: 'amber',
        linkUrl: '/account',
      }),
      
      // Placement notification
      notificationService.createNotification({
        userId,
        type: 'placement',
        title: 'New article published',
        message: 'Your article has been published in The New York Times',
        icon: 'thumbs-up',
        iconColor: 'purple',
        linkUrl: '/my-pitches',
        relatedId: 4, // Mock placement ID
        relatedType: 'placement',
      }),
    ];

    await Promise.all(notificationPromises);
    return true;
  } catch (error) {
    console.error('Error creating sample notifications:', error);
    return false;
  }
}
