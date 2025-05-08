import React, { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, FileText, Mic, ShieldCheck, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { advanceSignupStage, getSignupEmail } from '@/lib/signup-wizard';
import { useSignupWizard } from '@/contexts/SignupWizardContext';
import { apiRequest } from '@/lib/queryClient';

// Get Stripe public key from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Simplified Stripe logo for the trust badge
const StripeLogo = () => (
  <svg 
    width="41" 
    height="17" 
    viewBox="0 0 41 17" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block ml-1"
  >
    <path d="M17.5 7.2C17.5 6.5 18 6.1 18.9 6.1C20.2 6.1 21.9 6.6 23.3 7.5V4.1C21.8 3.4 20.3 3.1 18.9 3.1C15.9 3.1 13.8 4.8 13.8 7.3C13.8 11.1 18.8 10.4 18.8 12.1C18.8 12.9 18.1 13.3 17.1 13.3C15.7 13.3 13.8 12.6 12.3 11.6V15C13.9 15.8 15.6 16.1 17.1 16.1C20.2 16.1 22.5 14.5 22.5 11.9C22.5 7.8 17.5 8.7 17.5 7.2Z" fill="#6b7280"/>
    <path d="M28.4 1.2L28.3 1L28 1.2C27.8 1.3 23.5 3.7 23.5 8.9C23.5 14.1 27.8 16.4 28 16.5L28.4 16.8L28.7 16.5C28.9 16.4 33.2 14 33.2 8.9C33.2 3.8 28.9 1.4 28.7 1.3L28.4 1.2ZM28.4 13C27.5 12.4 26.4 11.1 26.4 8.9C26.4 6.7 27.5 5.4 28.4 4.8C29.3 5.4 30.4 6.7 30.4 8.9C30.4 11.1 29.3 12.4 28.4 13Z" fill="#6b7280"/>
    <path d="M7.7 3.6H4.2V13.7H7.7C10.5 13.7 12.6 11.5 12.6 8.7C12.6 5.8 10.5 3.6 7.7 3.6ZM7.7 10.9H7.1V6.3H7.7C8.9 6.3 9.7 7.4 9.7 8.6C9.7 9.8 8.9 10.9 7.7 10.9Z" fill="#6b7280"/>
    <path d="M38.3 9.3C37.3 8.9 36.9 8.7 36.9 8.4C36.9 8 37.2 7.8 37.7 7.8C38.4 7.8 39.2 8.1 39.8 8.5L40.6 6C39.9 5.6 38.9 5.4 38 5.4C36.2 5.4 34.8 6.4 34.8 8.5C34.8 10.1 35.9 10.8 37.1 11.3C38 11.6 38.3 11.9 38.3 12.2C38.3 12.6 37.9 12.9 37.3 12.9C36.5 12.9 35.5 12.5 34.9 12.1L34.1 14.6C34.9 15.1 36.1 15.4 37.2 15.4C39.2 15.4 40.5 14.3 40.5 12.3C40.5 10.5 39.3 9.8 38.3 9.3Z" fill="#6b7280"/>
    <path d="M1.1 3.6L1 3.7V15.2H3.1V3.6H1.1Z" fill="#6b7280"/>
  </svg>
);

interface PaymentStepProps {
  onComplete: () => void;
}

function CheckoutForm({ onComplete }: PaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { refreshStage } = useSignupWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const email = getSignupEmail();

  const features = [
    { icon: DollarSign, text:'No retainers, no flat fees' },
    { icon: FileText,  text:'Pay only when published' },
    { icon: Mic,       text:'AI voice pitch recorder' },
    { icon: ShieldCheck, text:'Verified media requests daily' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !email) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Get the CardElement
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create a payment method using the Stripe API format
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        element: cardElement
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      // Send payment method ID to server
      await apiRequest('POST', `/api/signup-stage/${encodeURIComponent(email)}/advance`, {
        action: 'payment',
        paymentMethodId: paymentMethod.id
      });

      // Update signup stage
      await advanceSignupStage(email, 'payment');
      
      // Refresh the context state
      await refreshStage();

      toast({
        title: 'Payment Information Saved',
        description: 'Your subscription is now active!',
      });

      // Call the onComplete callback to move to the next step
      onComplete();
      
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setErrorMessage(error.message || 'There was an error processing your payment. Please try again.');
      toast({
        title: 'Payment Error',
        description: error.message || 'There was an error processing your payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2">Subscribe to QuoteBid</h2>
      <p className="text-gray-600 mb-6">Unlock the full marketplace — unlimited bids, AI tools, real-time analytics</p>
      
      <div className="md:flex md:gap-8">
        {/* Left column: Value props & bullets */}
        <div className="md:w-1/2 mb-6 md:mb-0">
          <h3 className="text-lg font-semibold mb-5">Bid for coverage. Pay only for results.</h3>
          
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start">
                <div className="bg-sky-100 text-sky-600 p-2 rounded-full mr-3 flex-shrink-0">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right column: Price + card form */}
        <div className="md:w-1/2 max-w-lg mx-auto">
          {/* Price hero card */}
          <div className="bg-gradient-to-r from-sky-100 to-blue-50 rounded-2xl p-6 shadow-lg">
            <p className="text-4xl font-extrabold text-sky-800">$99.99<span className="text-lg font-medium"> /month</span></p>
            <p className="text-sm text-sky-600 mt-1">Cancel anytime</p>
          </div>
          
          {/* Card input */}
          <div className="border border-gray-300 rounded-lg p-4 shadow-inner mt-6 focus-within:ring-2 focus-within:ring-sky-500">
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
                hidePostalCode: true,
              }}
            />
          </div>
          
          {/* Error message */}
          {errorMessage && (
            <div className="text-red-500 text-sm mt-3 mb-1">
              {errorMessage}
            </div>
          )}
          
          {/* Legal text */}
          <div className="text-xs text-gray-500 mt-3 mb-4">
            By subscribing, you authorize QuoteBid to charge your card for this subscription. 
            Your subscription will automatically renew at the current rate until canceled.
          </div>
          
          {/* Submit button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-sky-600 to-sky-700 hover:brightness-110 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-lg font-semibold"
            disabled={!stripe || !elements || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Start My Membership
              </>
            )}
          </button>
          
          {/* Trust signals */}
          <div className="bg-gray-50 py-2 mt-4 rounded-lg text-xs text-gray-500 flex items-center justify-center">
            <Lock className="h-3 w-3 mr-1" /> Secure • Powered by <StripeLogo />
          </div>
        </div>
      </div>
    </form>
  );
}

export function PaymentStep({ onComplete }: PaymentStepProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm onComplete={onComplete} />
    </Elements>
  );
}