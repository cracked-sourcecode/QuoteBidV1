import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function SubscriptionSuccess() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  // Type definition expanded to include debug fields from our enhanced server response
  const [subscriptionData, setSubscriptionData] = useState<{
    status: string;
    current_period_end?: string;
    userId?: number;
    paymentStatus?: string;
    paymentAmount?: number;
    paymentId?: string;
    _debug?: {
      isTestMode?: boolean;
      paymentMethod?: string[];
      errorHandled?: boolean;
      originalErrorType?: string;
    };
  } | null>(null);

  // Extract the session ID or payment intent ID from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const paymentIntentId = urlParams.get('payment_intent');
  
  // Special debug mode for direct verification
  const directPiVerification = urlParams.get('direct_pi') === 'true';
  if (directPiVerification && paymentIntentId) {
    console.log('🔍 DIRECT VERIFICATION MODE: Attempting to verify payment intent directly:', paymentIntentId);
  }

  useEffect(() => {
    const verifySubscription = async () => {
      if (!sessionId && !paymentIntentId) {
        toast({
          title: 'Missing Payment Information',
          description: 'No payment information was provided. Please contact support if this issue persists.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      try {
        // Log verification data
        console.log('Verifying payment with data:', { sessionId, paymentIntentId });
        
        // Check if user is authenticated first
        const userResponse = await fetch('/api/user');
        console.log('User auth check response:', userResponse.status);
        
        if (!userResponse.ok) {
          console.error('User not authenticated. Getting user response:', await userResponse.text());
          throw new Error('Authentication required. Please log in and try again.');
        }
        
        const userData = await userResponse.json();
        console.log('User data retrieved:', { id: userData.id, username: userData.username });
        
        // Verify the payment with the server
        const response = await apiRequest('POST', '/api/verify-subscription', {
          sessionId,
          paymentIntentId
        });
        
        // Log response status and full response for debugging
        console.log('Verification response status:', response.status);
        
        // Try to get the response body as text for debugging
        const responseText = await response.clone().text();
        console.log('Verification response body:', responseText);
        
        if (!response.ok) {
          console.error('Verification failed with status:', response.status);
          console.error('Verification response:', responseText);
          
          try {
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.message || 'Failed to verify subscription');
          } catch (parseError) {
            throw new Error(`Failed to verify subscription: ${responseText}`);
          }
        }

        const data = await response.json();
        setSubscriptionData(data);

        // Update the user's premium status
        await apiRequest('POST', `/api/users/${data.userId}/update-premium-status`, {
          status: 'active',
          expiry: data.current_period_end,
        });

        toast({
          title: 'Subscription Activated',
          description: 'Your subscription has been successfully activated!',
        });
      } catch (error: any) {
        console.error('Subscription verification error:', error);
        toast({
          title: 'Verification Error',
          description: error.message || 'There was an error verifying your subscription. Please contact support.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    verifySubscription();
  }, [sessionId, paymentIntentId, toast]);

  const handleContinue = () => {
    // Go to profile setup page to complete account before opportunities
    navigate('/profile-setup');
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen flex flex-col items-center justify-center p-4">
      
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {loading ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 text-qpurple animate-spin mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verifying Your Subscription</h2>
            <p className="text-gray-600">Please wait while we confirm your payment details...</p>
          </div>
        ) : subscriptionData ? (
          <div className="flex flex-col items-center py-8">
            <div className="bg-green-100 p-3 rounded-full mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Subscription Confirmed!</h2>
            <p className="text-gray-600 mb-8">
              Thank you for subscribing to QuoteBid. Your account is now active and you have full access to all premium features.
            </p>
            
            <div className="border border-gray-200 rounded-lg p-4 mb-8 w-full">
              <h3 className="font-semibold text-lg mb-2">Subscription Details</h3>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
              {subscriptionData.current_period_end && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Next billing date:</span>
                  <span className="font-medium">{new Date(subscriptionData.current_period_end).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleContinue} 
              className="w-full bg-qpurple hover:bg-qpurple-dark"
            >
              Complete Your Account
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8">
            <div className="bg-red-100 p-3 rounded-full mb-6">
              <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4">Verification Failed</h2>
            <p className="text-gray-600 mb-8">
              We couldn't verify your subscription. Please contact our support team for assistance.
            </p>
            <Button 
              onClick={() => navigate('/subscribe')} 
              variant="outline"
              className="mb-4"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => navigate('/profile-setup')} 
              variant="link"
            >
              Complete Your Account
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}