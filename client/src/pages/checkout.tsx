import { useState, useEffect } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!stripe || !elements) {
      setLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <PaymentElement />
      </div>
      <Button 
        type="submit" 
        disabled={!stripe || loading} 
        className="w-full"
      >
        {loading ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();
  const [loadingPayment, setLoadingPayment] = useState(true);

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    const createPaymentIntent = async () => {
      try {
        setLoadingPayment(true);
        // $1.00 test amount as requested
        const amount = 1.00;
        const response = await apiRequest("POST", "/api/create-payment-intent", { 
          amount,
          items: [{ id: "test-payment" }]
        });
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not initialize payment. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoadingPayment(false);
      }
    };

    createPaymentIntent();
  }, [toast]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Complete Your Purchase</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          One-time payment for a full year of Qwoted Premium
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex justify-between mb-2">
              <span>Qwoted Premium Test (1 year)</span>
              <span>$1.00</span>
            </div>
            {/* Note for testing */}
            <div className="text-xs text-amber-600 mt-1">
              Test Mode - Actual price will be $99.99 in production
            </div>
          </div>
          
          <div className="flex justify-between font-medium text-lg mb-6">
            <span>Total</span>
            <span>$1.00</span>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium mb-2">What's included:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-qpurple mr-2">✓</span>
                <span>Unlimited opportunity views for 12 months</span>
              </li>
              <li className="flex items-start">
                <span className="text-qpurple mr-2">✓</span>
                <span>Voice pitch recording with AI transcription</span>
              </li>
              <li className="flex items-start">
                <span className="text-qpurple mr-2">✓</span>
                <span>Priority bidding on limited media opportunities</span>
              </li>
              <li className="flex items-start">
                <span className="text-qpurple mr-2">✓</span>
                <span>Real-time outbid notifications</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          {loadingPayment ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin w-10 h-10 border-4 border-qpurple border-t-transparent rounded-full"></div>
            </div>
          ) : clientSecret ? (
            <div>
              <h2 className="text-xl font-semibold mb-6">Payment Information</h2>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm />
              </Elements>
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
  );
}