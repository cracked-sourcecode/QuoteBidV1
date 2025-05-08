import { useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface SubscriptionGuardProps {
  children: ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setIsLoading(true);
        
        // If there's no user, they're not subscribed
        if (!user) {
          setIsSubscribed(false);
          return;
        }
        
        // Check the user's subscription status
        const res = await apiRequest("GET", `/api/user/${user.id}/subscription`);
        const data = await res.json();
        
        // Check if subscription is active and not expired
        if (data.isPremium) {
          // If there's an expiration date, check if it's in the past
          if (data.expiresAt) {
            const expiryDate = new Date(data.expiresAt);
            const isExpired = expiryDate < new Date();
            setIsSubscribed(!isExpired);
          } else {
            // If no expiry date but isPremium is true, consider subscribed
            setIsSubscribed(true);
          }
        } else {
          // Not premium or invalid status
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#004684] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isSubscribed) {
    // Different UI based on whether the user is logged in or not
    return (
      <div className="bg-gray-50 min-h-screen py-16 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-6">
              <svg className="w-16 h-16 text-[#004684] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              <h2 className="text-2xl font-bold text-gray-900">
                {user ? "Subscription Required" : "Login Required"}
              </h2>
              <p className="mt-2 text-gray-600">
                {user 
                  ? "You need an active subscription to access this content."
                  : "You need to log in or create an account to access this content."}
              </p>
            </div>
            
            <div className="bg-[#004684]/10 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-700 text-center">
                {user 
                  ? "Subscribe now to unlock all features of PR Marketplace, including media opportunities, voice pitching, and our bidding system."
                  : "Create an account or log in to access PR Marketplace features. Premium content requires a subscription."}
              </p>
            </div>
            
            <div className="space-y-4">
              {user ? (
                // User is logged in but not subscribed
                <Button 
                  asChild 
                  className="w-full bg-[#004684] hover:bg-[#003a70]" 
                  size="lg"
                >
                  <Link href="/subscribe">
                    Subscribe Now
                  </Link>
                </Button>
              ) : (
                // User is not logged in
                <>
                  <Button 
                    asChild 
                    className="w-full bg-[#004684] hover:bg-[#003a70]" 
                    size="lg"
                  >
                    <Link href="/auth">
                      Create Account
                    </Link>
                  </Button>
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">or</span>
                    </div>
                  </div>
                  <Button 
                    asChild 
                    variant="outline"
                    className="w-full border-[#004684] text-[#004684] hover:bg-[#004684]/5" 
                    size="lg"
                  >
                    <Link href="/auth?tab=login">
                      Log In
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}