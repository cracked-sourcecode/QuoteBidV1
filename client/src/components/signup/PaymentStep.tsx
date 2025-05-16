import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { advanceSignupStage, getSignupEmail } from '@/lib/signup-wizard';
import { useSignupWizard } from '@/contexts/SignupWizardContext';
import { apiRequest } from '@/lib/queryClient';

// Get Stripe public key from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentStepProps {
  onComplete: () => void;
}

function CheckoutForm({ onComplete }: PaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { refreshStage, setStage } = useSignupWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const email = getSignupEmail();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !email) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      const cardExpiryElement = elements.getElement(CardExpiryElement);
      const cardCvcElement = elements.getElement(CardCvcElement);
      if (!cardNumberElement || !cardExpiryElement || !cardCvcElement) {
        throw new Error('Card fields not found');
      }
      // Create payment method
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {},
      });
      if (error) throw new Error(error.message);
      if (!paymentMethod) throw new Error('Failed to create payment method');
      // Store payment method ID in localStorage
      localStorage.setItem('signup_payment', JSON.stringify({ paymentMethodId: paymentMethod.id }));

      // First complete the current stage (payment)
      const completeCurrentStage = await advanceSignupStage(email, 'payment', { paymentMethodId: paymentMethod.id });
      console.log('Complete current stage response:', completeCurrentStage);
      
      if (completeCurrentStage.stage === 'profile') {
        setStage('profile');
        toast({ title: 'Payment Information Saved', description: 'Your payment method is saved for registration.' });
        onComplete();
      } else {
        const backendMsg = completeCurrentStage.message || 'Failed to advance to profile step.';
        setErrorMessage(backendMsg);
        throw new Error(backendMsg);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'There was an error processing your payment. Please try again.');
      toast({ title: 'Payment Error', description: error.message || 'There was an error processing your payment. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto px-4 py-8 bg-white rounded-2xl shadow-lg">
      {/* Left: Payment Form */}
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold mb-2">Complete Your Subscription</h2>
        <p className="text-gray-600 mb-6">Subscribe to QuoteBid Membership to access all media opportunities</p>
        <div className="border border-gray-200 rounded-xl p-6 mb-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-lg">Payment Information</span>
            <span className="text-green-600 text-sm flex items-center gap-1"><Lock className="h-4 w-4" /> Secure Payment</span>
          </div>
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <label className="block text-sm font-medium mb-2">Credit Card Information</label>
            <div className="mb-4">
              <CardNumberElement options={{
                style: { base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } }, invalid: { color: '#9e2146' } },
              }} className="stripe-input px-3 py-2 border rounded-md w-full" />
                </div>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs mb-1">Expiration</label>
                <CardExpiryElement options={{
                  style: { base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } }, invalid: { color: '#9e2146' } },
                }} className="stripe-input px-3 py-2 border rounded-md w-full" />
              </div>
              <div className="flex-1">
                <label className="block text-xs mb-1">CVC</label>
                <CardCvcElement options={{
                  style: { base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } }, invalid: { color: '#9e2146' } },
                }} className="stripe-input px-3 py-2 border rounded-md w-full" />
          </div>
        </div>
            <div className="text-xs text-green-600 mt-1">Your card information is encrypted</div>
          </div>
          {/* Error message */}
          {errorMessage && (
            <div className="text-red-500 text-sm mt-3 mb-1">{errorMessage}</div>
          )}
          {/* Legal text */}
          <div className="text-xs text-gray-500 mt-3 mb-4">
            By completing your purchase, you agree to the Terms of Service and the Privacy Policy.
          </div>
          {/* Submit button */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-lg font-semibold"
            disabled={!stripe || !elements || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Continue to Profile</>
            )}
          </Button>
        </div>
      </div>
      {/* Right: Membership Summary */}
      <div className="w-full md:w-96 bg-gradient-to-b from-blue-600 to-blue-500 text-white rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl font-extrabold">QuoteBid Membership</span>
            <span className="ml-2 bg-white/30 text-xs px-3 h-7 flex items-center font-bold tracking-wide rounded-full whitespace-nowrap" style={{fontSize:'13px',lineHeight:'1.2'}}>FULL ACCESS</span>
          </div>
          <div className="text-5xl font-black mb-2 leading-tight">$99.99<span className="text-2xl font-semibold">/month</span></div>
          <div className="text-base mb-2 font-medium">Cancel anytime</div>
          <div className="mb-2 mt-6">
            <div className="flex items-center gap-3 mb-4 text-lg font-semibold"><CheckCircle className="h-6 w-6 text-green-300" /> Unlimited access to all media opportunities</div>
            <div className="flex items-center gap-3 mb-4 text-lg font-semibold"><CheckCircle className="h-6 w-6 text-green-300" /> Direct messaging with journalists</div>
            <div className="flex items-center gap-3 mb-4 text-lg font-semibold"><CheckCircle className="h-6 w-6 text-green-300" /> Premium placement in search results</div>
            <div className="flex items-center gap-3 mb-4 text-lg font-semibold"><CheckCircle className="h-6 w-6 text-green-300" /> Advanced analytics and reporting</div>
            <div className="flex items-center gap-3 mb-2 text-lg font-semibold"><CheckCircle className="h-6 w-6 text-green-300" /> Expert profile optimization</div>
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