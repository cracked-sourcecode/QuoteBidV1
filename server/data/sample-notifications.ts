/**
 * Real notifications are now created automatically based on platform events
 * This function is disabled in favor of event-driven notifications
 */
export async function createSampleNotifications(userId: number): Promise<boolean> {
  console.log(`[NOTIFICATIONS] Sample notification creation disabled. Real notifications are created automatically based on events for user ${userId}`);
  return false;
}
