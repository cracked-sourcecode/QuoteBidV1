import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

// Utility function to convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushSubscriptionState {
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushSubscribe() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [state, setState] = useState<PushSubscriptionState>({
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
    error: null,
  });

  // Initialize permission state
  useEffect(() => {
    if ('Notification' in window) {
      setState(prev => ({
        ...prev,
        permission: Notification.permission,
      }));
    }
  }, []);

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('📱 Push notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted') {
        toast({
          title: "🔔 Notifications enabled!",
          description: "You'll receive price alerts and updates",
        });
        return true;
      } else {
        toast({
          title: "🔕 Notifications blocked",
          description: "You can enable them later in your browser settings",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to request permission' 
      }));
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribe = async (): Promise<void> => {
    if (!user?.id) {
      console.log('📱 User not authenticated, skipping push subscription');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('📱 Push messaging not supported');
      setState(prev => ({ 
        ...prev, 
        error: 'Push messaging not supported' 
      }));
      return;
    }

    // Prevent multiple concurrent subscription attempts
    if (state.isLoading || state.isSubscribed) {
      console.log('📱 Subscription already in progress or active, skipping');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission if not granted
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Get VAPID public key
      const response = await fetch('/api/push/vapid-public');
      if (!response.ok) {
        throw new Error('Failed to fetch VAPID public key');
      }
      
      const { key } = await response.json();
      console.log('🔑 VAPID public key received');

      // Register service worker
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      await navigator.serviceWorker.ready;
      console.log('🔧 Service worker registered');

      // Check if already subscribed first
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push manager
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key)
        });
        console.log('📱 Push subscription created');
      } else {
        console.log('📱 Existing push subscription found');
      }

      // Send subscription to server
      const subscribeResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });

      if (!subscribeResponse.ok) {
        const errorData = await subscribeResponse.json();
        throw new Error(errorData.message || 'Failed to register subscription');
      }

      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        isLoading: false 
      }));

      console.log('✅ Push subscription registered with server');
      
      toast({
        title: "🎉 Push notifications active!",
        description: "You'll get instant alerts for price drops and deadlines",
      });

    } catch (error: any) {
      console.error('❌ Error subscribing to push notifications:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Subscription failed' 
      }));

      toast({
        title: "❌ Subscription failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async (): Promise<void> => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Unsubscribe from push manager
          await subscription.unsubscribe();

          // Remove from server
          await fetch('/api/push/unsubscribe', {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
        }
      }

      setState(prev => ({ 
        ...prev, 
        isSubscribed: false, 
        isLoading: false 
      }));

      toast({
        title: "🔕 Push notifications disabled",
        description: "You can re-enable them anytime",
      });

    } catch (error: any) {
      console.error('❌ Error unsubscribing from push notifications:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Unsubscribe failed' 
      }));
    }
  };

  // Auto-subscribe for logged-in users with permission  
  useEffect(() => {
    // Prevent infinite loops with additional checks
    if (!user?.id || state.permission !== 'granted' || state.isSubscribed || state.isLoading) {
      return;
    }

    // Additional safety check - don't auto-subscribe if permission was just granted
    // to avoid double subscription attempts
    let isActive = true;
    
    const timeoutId = setTimeout(() => {
      if (isActive && user?.id && state.permission === 'granted' && !state.isSubscribed && !state.isLoading) {
        console.log('📱 Auto-subscribing user with granted permission');
        subscribe();
      }
    }, 500); // Increased delay to prevent rapid-fire attempts

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [user?.id, state.permission, state.isSubscribed, state.isLoading]);

  // Check existing subscription on mount
  useEffect(() => {
    if (user?.id && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration()
        .then(registration => {
          if (registration) {
            return registration.pushManager.getSubscription();
          }
          return null;
        })
        .then(subscription => {
          setState(prev => ({ 
            ...prev, 
            isSubscribed: !!subscription 
          }));
        })
        .catch(error => {
          console.warn('⚠️ Error checking existing subscription:', error);
        });
    }
  }, [user?.id]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
  };
} 