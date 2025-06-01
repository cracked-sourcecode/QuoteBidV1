import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowRight } from "lucide-react";

export default function Subscribe() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Extract return path from URL if present
  const returnPath = new URLSearchParams(window.location.search).get('returnPath');

  useEffect(() => {
    // If user is not logged in, redirect to login
    if (!user) {
      setLocation('/auth/login');
      return;
    }
  }, [user, setLocation]);

  const handleGoToAccount = () => {
    setLocation('/account');
  };

  const handleGoToReturnPath = () => {
    setLocation(returnPath || '/opportunities');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Subscription Required
        </h1>
        
        <p className="text-gray-600 mb-8">
          Please update your subscription in your account settings to continue accessing QuoteBid features.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={handleGoToAccount}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Manage Subscription
          </Button>
          
          {returnPath && (
            <Button 
              onClick={handleGoToReturnPath}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Continue to {returnPath === '/opportunities' ? 'Opportunities' : 'App'}
            </Button>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">What's Included</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Unlimited PR opportunity submissions</li>
            <li>• AI-powered pitch writing assistance</li>
            <li>• Real-time opportunity notifications</li>
            <li>• Campaign tracking & analytics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}