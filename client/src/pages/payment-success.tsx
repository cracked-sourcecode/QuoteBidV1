import { useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      return;
    }

    // Mark user as having premium access
    const updateUserStatus = async () => {
      try {
        await apiFetch(`/api/users/${user.id}/update-premium-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'active',
            // Set expiry to 30 days from now
            expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
        });
        
        // Instead of redirecting to /profile-setup, go to the next wizard step
        setTimeout(() => {
          navigate("/signup-wizard");
        }, 1000);
        
      } catch (error) {
        console.error("Failed to update user premium status", error);
        toast({
          title: "Subscription Error",
          description: "There was a problem updating your account. Please contact support.",
          variant: "destructive"
        });
      }
    };

    updateUserStatus();
  }, [user, toast, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Successful
          </h1>

          <p className="text-gray-600 mb-8">
            Thank you for your payment. Your account has been activated, and you now have full access to QuoteBid platform.
          </p>

          <div className="space-y-4">
            <Button
              className="w-full bg-qpurple hover:bg-qpurple-dark"
              onClick={() => navigate("/signup-wizard")}
            >
              Complete Your Profile
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/account")}
            >
              View My Account
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-3">
            You'll be redirected to complete your profile shortly...
          </p>
          
          <p className="text-sm text-gray-500 mt-6">
            If you have any questions, please contact{" "}
            <a
              href="mailto:support@rubicon.com"
              className="text-qpurple hover:underline"
            >
              support@rubicon.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}