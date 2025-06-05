import React from "react";
import { usePushSubscribe } from "@/hooks/usePushSubscribe";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Smartphone } from "lucide-react";

export function PushNotificationBanner() {
  const { user } = useAuth();
  const { 
    permission, 
    isSubscribed, 
    isLoading, 
    isSupported, 
    requestPermission, 
    subscribe, 
    unsubscribe 
  } = usePushSubscribe();

  // Only show to logged-in users
  if (!user) return null;

  // Don't show if push notifications aren't supported
  if (!isSupported) return null;

  // Don't show if already subscribed and permission granted
  if (permission === 'granted' && isSubscribed) return null;

  // Don't show if permission was explicitly denied
  if (permission === 'denied') return null;

  const handleEnableNotifications = async () => {
    if (permission === 'default') {
      await requestPermission();
    }
    
    if (permission === 'granted' && !isSubscribed) {
      await subscribe();
    }
  };

  const handleDisableNotifications = async () => {
    await unsubscribe();
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Smartphone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {isSubscribed ? "Push Notifications Active" : "Enable Price Alerts"}
              </h3>
              <p className="text-sm text-gray-600">
                {isSubscribed 
                  ? "You'll receive instant notifications for price drops and deadlines"
                  : "Get instant browser notifications when opportunity prices drop"
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isSubscribed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableNotifications}
                disabled={isLoading}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <BellOff className="h-4 w-4 mr-2" />
                Disable
              </Button>
            ) : (
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Bell className="h-4 w-4 mr-2" />
                {isLoading ? "Enabling..." : "Enable Alerts"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 