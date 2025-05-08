import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm({ onSuccess, clientSecret }: { onSuccess: () => void, clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // Check if session is still valid
      const { error: fetchError, paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
      
      if (fetchError) {
        console.error('Error retrieving payment intent:', fetchError);
        throw new Error(fetchError.message);
      }
      
      console.log('Current payment intent status:', paymentIntent.status);
      
      // Consider any of these statuses as acceptable for testing
      const successStatuses = ['succeeded', 'processing', 'requires_capture'];
      if (successStatuses.includes(paymentIntent.status)) {
        console.log(`Payment in acceptable status: ${paymentIntent.status}, redirecting to success page`);
        window.location.href = `${window.location.origin}/subscription-success?payment_intent=${paymentIntent.id}&direct_pi=true&debug=true`;
        return;
      }
      
      // Otherwise confirm the payment
      const { error, paymentIntent: confirmedIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        throw new Error(error.message || "An unexpected error occurred.");
      } 
      
      if (confirmedIntent) {
        console.log('Payment confirmation received with status:', confirmedIntent.status);
        
        // Check if payment is in any acceptable state for our test scenario
        const acceptablePostConfirmStatuses = ['succeeded', 'processing', 'requires_capture'];
        if (acceptablePostConfirmStatuses.includes(confirmedIntent.status)) {
          console.log('Payment in acceptable post-confirmation status:', confirmedIntent.status);
          // Add debug=true to URL for troubleshooting information display
          window.location.href = `${window.location.origin}/subscription-success?payment_intent=${confirmedIntent.id}&debug=true`;
          return;
        }
      } else {
        // Handle other status cases
        console.log('Payment status after confirmation:', confirmedIntent?.status);
        // Still redirect for processing_intent, requires_action etc.
        toast({
          title: "Payment processing",
          description: "Your payment is being processed. You will be redirected shortly.",
          variant: "default",
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full bg-qpurple hover:bg-qpurple-dark text-white py-2 px-4 rounded"
        disabled={!stripe || isLoading}
      >
        {isLoading ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}

export default function Subscribe() {
  const { toast } = useToast();
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [, setLocation] = useLocation();
  
  // Extract return path from URL if present (for redirecting after subscription)
  const [returnPath, setReturnPath] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('returnPath');
  });

  useEffect(() => {
    // Check if the user has signed the agreement
    const signatureData = localStorage.getItem('agreement_signature');
    
    if (!signatureData) {
      // Redirect to agreement page if signature is not found
      toast({
        title: "Agreement Required",
        description: "Please read and sign the platform agreement before subscribing.",
      });
      
      setTimeout(() => {
        setLocation('/agreement');
      }, 1500);
      
      return;
    }
    
    try {
      // Verify the signature data is properly formatted
      const signatureInfo = JSON.parse(signatureData);
      if (!signatureInfo.signature || !signatureInfo.name || !signatureInfo.timestamp) {
        throw new Error("Invalid signature data");
      }
    } catch (error) {
      // If there's an error parsing the data or missing fields, redirect to agreement
      toast({
        title: "Agreement Error",
        description: "There was an issue with your agreement signature. Please sign again.",
        variant: "destructive"
      });
      
      setTimeout(() => {
        setLocation('/agreement');
      }, 1500);
      
      return;
    }
    
    // Create payment intent for direct subscription
    const createSubscription = async () => {
      try {
        setLoadingSubscription(true);
        
        // Create a payment intent for a $1.00 subscription (testing purposes)
        const response = await apiRequest('POST', '/api/create-payment-intent', {
          // Fixed at $1.00 for testing as requested
          amount: 1.00
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create payment intent');
        }
        
        const data = await response.json();
        
        // Set up embedded payment form with client secret
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('No client secret provided for payment');
        }
      } catch (error: any) {
        console.error('Subscription error:', error);
        toast({
          title: "Subscription Error",
          description: error.message || "Could not initialize subscription. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoadingSubscription(false);
      }
    };

    createSubscription();
  }, [toast, setLocation]);

  const handlePaymentSuccess = () => {
    setPaymentComplete(true);
    setTimeout(() => {
      setLocation('/subscription-success');
    }, 1000);
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="relative bg-qpurple text-white">
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Join the PR Revolution
            </h1>
            <p className="text-xl max-w-3xl mx-auto mb-4">
              Create your account to access the first true marketplace for media coverage
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">QuoteBid Platform Access</h2>
              <div className="mt-4 flex justify-center">
                <span className="text-5xl font-extrabold text-qpurple">$99.99</span>
                <span className="ml-2 text-xl text-gray-600 self-end pb-1">/month</span>
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4 text-center">Everything You Need to Get Published</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-qpurple mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-base">Unlimited access to all journalist requests from top-tier publications</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-qpurple mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-base">Voice recording with AI transcription for effortless pitching</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-qpurple mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-base">Dynamic bidding platform with strategic pricing advantages</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-qpurple mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-base">Real-time bid tracking and outbid notifications</span>
                </li>

                <li className="flex items-start">
                  <svg className="w-6 h-6 text-qpurple mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-base">Payment only when your quotes get published - guaranteed</span>
                </li>
              </ul>
            </div>

            <div className="bg-qpurple/5 p-5 rounded-lg mb-6 text-center">
              <p className="text-sm font-medium text-gray-700">
                Cancel anytime. No contracts. Your subscription is required to create an account and unlock the full power of the marketplace.
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-qpurple mb-4">
                "Built for experts. Powered by results. PR without the fluff, noise, or BS."
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            {loadingSubscription ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Preparing your subscription...</p>
                  <p className="text-sm text-gray-500 mt-2">The payment form will appear shortly.</p>
                </div>
              </div>
            ) : paymentComplete ? (
              <div className="h-80 flex items-center justify-center flex-col">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">Payment Successful!</p>
                  <p className="text-gray-600 mt-2">Redirecting you to your account...</p>
                </div>
              </div>
            ) : clientSecret ? (
              <div className="min-h-[400px]">
                <h2 className="text-xl font-semibold mb-4">Complete Your Subscription</h2>
                <div className="p-6 border rounded-md">
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm onSuccess={handlePaymentSuccess} clientSecret={clientSecret} />
                  </Elements>
                </div>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center flex-col">
                <p className="text-red-600 mb-4">Failed to load payment system</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Your payment information is securely processed by Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}