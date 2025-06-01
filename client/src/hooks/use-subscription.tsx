import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionData {
  isPremium: boolean;
  status: string;
  expiresAt: string | null;
  subscriptionId: string | null;
}

export function useSubscription() {
  const { user } = useAuth();

  const {
    data: subscription,
    isLoading,
    error,
    refetch
  } = useQuery<SubscriptionData>({
    queryKey: [`/api/user/${user?.id}/subscription`],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      const response = await apiRequest("GET", `/api/user/${user.id}/subscription`);
      return await response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  const hasActiveSubscription = subscription?.isPremium || false;
  const subscriptionStatus = subscription?.status || 'free';
  
  // Check if subscription is expired
  const isExpired = subscription?.expiresAt 
    ? new Date(subscription.expiresAt) < new Date() 
    : false;

  const canPitch = hasActiveSubscription && !isExpired;

  return {
    subscription,
    hasActiveSubscription,
    subscriptionStatus,
    isExpired,
    canPitch,
    isLoading,
    error,
    refetch
  };
} 