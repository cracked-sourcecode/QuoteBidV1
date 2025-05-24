import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { SignupWizard } from '@/components/signup/SignupWizard';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
          setMessage(error.message || "An error occurred with your payment.");
        } else {
          setMessage("An unexpected error occurred.");
        }
        toast({
          title: "Payment Failed",
          description: error.message || "There was an issue with your payment. Please try again.",
          variant: "destructive",
        });
      } else if (paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: "Thank you for your subscription!",
        });
        setLocation('/profile-setup');
      } else {
        setMessage(`Payment status: ${paymentIntent.status}. You will be redirected.`);
        setTimeout(() => setLocation('/profile-setup'), 2000);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setMessage("An error occurred while processing your payment.");
      toast({
        title: "Payment Error",
        description: "There was an issue with your payment. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {message && (
        <div className={`p-3 rounded-md text-sm ${message.includes('succeeded') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}
      
      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        disabled={!stripe || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay $99.99/month
          </>
        )}
      </Button>
      
      <div className="text-center text-sm text-gray-500 mt-4">
        Your payment is securely processed by Stripe. You will be redirected to complete your profile after payment.
      </div>
    </form>
  );
};

export default function Payment() {
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const initializePayment = async () => {
      if (!user?.id) return;
      
      try {
        const res = await apiRequest('GET', `/api/users/${user.id}/subscription`);
        
        if (!res.ok) {
          setError('Failed to initialize payment. Please try again.');
          return;
        }

        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Error initializing payment:', error);
        setError('There was an issue accessing your account information.');
      } finally {
        setLoading(false);
      }
    };
    
    initializePayment();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access this page.</p>
          <Button onClick={() => setLocation('/auth')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Create the page content
  const pageContent = (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="relative bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="text-center">
              <div className="mb-2">
                <span className="text-white font-bold text-3xl tracking-tight">
                  <span>Quote</span><span className="font-extrabold">Bid</span>
                </span>
              </div>
              <h2 className="text-xl font-semibold">Subscription Setup</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Complete Your Subscription</h1>
              <p className="text-gray-600">
                Access to all PR opportunities for just $99.99/month
              </p>
            </div>
            
            <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start">
                <div className="bg-blue-100 p-2 rounded-full mr-4 flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-800">Platform Access Benefits</h3>
                  <ul className="mt-2 space-y-1 text-sm text-blue-700">
                    <li className="flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-blue-500" />
                      Access to exclusive media opportunities
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-blue-500" />
                      Place bids on media requests from top-tier publications
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-blue-500" />
                      Only pay for successful media placements
                    </li>
                    <li className="flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-blue-500" />
                      Cancel anytime with no long-term commitment
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600">Preparing your payment form...</p>
              </div>
            ) : error ? (
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Payment Setup Error</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </Button>
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <CheckoutForm />
              </Elements>
            ) : (
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-yellow-700 mb-2">Something went wrong</h3>
                <p className="text-gray-600 mb-6">Unable to initialize payment system.</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 p-4 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              By subscribing, you agree to our Terms of Service and Privacy Policy.
              Your subscription will automatically renew each month until canceled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Wrap the content with the SignupWizard component when the feature flag is enabled
  return import.meta.env.VITE_NEXT_SIGNUP_WIZARD === 'true' 
    ? <SignupWizard>{pageContent}</SignupWizard>
    : pageContent;
}