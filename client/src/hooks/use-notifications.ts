import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { Notification } from '@shared/schema';

export function useNotifications() {
  // Fetch notifications
  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/notifications');
      return await res.json() as Notification[];
    },
  });

  // Get unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/notifications/unread-count');
      return await res.json() as { count: number };
    },
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('POST', `/api/notifications/${id}/read`);
      return id;
    },
    onSuccess: (id) => {
      // Update the notification in the cache
      queryClient.setQueryData<Notification[]>(['/api/notifications'], (oldData) => {
        if (!oldData) return [];
        return oldData.map(notification => {
          if (notification.id === id) {
            return { ...notification, isRead: true };
          }
          return notification;
        });
      });
      // Invalidate the unread count
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/notifications/mark-all-read');
    },
    onSuccess: () => {
      // Update all notifications in the cache
      queryClient.setQueryData<Notification[]>(['/api/notifications'], (oldData) => {
        if (!oldData) return [];
        return oldData.map(notification => ({ ...notification, isRead: true }));
      });
      // Invalidate the unread count
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    },
  });

  // Create sample notifications
  const createSamplesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/notifications/create-samples');
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Sample notifications created successfully',
      });
      // Invalidate queries to refetch notifications
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: (error) => {
      console.error('Error creating sample notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to create sample notifications',
        variant: 'destructive',
      });
    },
  });

  // Clear all notifications
  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/notifications/clear-all');
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'All notifications cleared successfully',
      });
      // Update cache to empty array
      queryClient.setQueryData<Notification[]>(['/api/notifications'], []);
      queryClient.setQueryData(['/api/notifications/unread-count'], { count: 0 });
    },
    onError: (error) => {
      console.error('Error clearing notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear notifications',
        variant: 'destructive',
      });
    },
  });

  return {
    notifications: notifications || [],
    unreadCount: unreadCountData?.count || 0,
    isLoading,
    error,
    markAsRead: (id: number) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    createSampleNotifications: () => createSamplesMutation.mutate(),
    clearAllNotifications: () => clearAllNotificationsMutation.mutate(),
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isCreatingSamples: createSamplesMutation.isPending,
    isClearingAll: clearAllNotificationsMutation.isPending,
  };
}