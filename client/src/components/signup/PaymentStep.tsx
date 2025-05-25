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
import { useLocation } from 'wouter';

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
  const [, setLocation] = useLocation();

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
      console.log('Calling advanceSignupStage with:', { email, action: 'payment', paymentMethodId: paymentMethod.id });
      const completeCurrentStage = await advanceSignupStage(email, 'payment', { paymentMethodId: paymentMethod.id });
      console.log('Complete current stage response:', completeCurrentStage);
      console.log('Response stage:', completeCurrentStage.stage);
      console.log('Expected stage: profile');
      
      if (completeCurrentStage.stage === 'profile') {
        setStage('profile');
        toast({ title: 'Payment Information Saved', description: 'Your payment method is saved for registration.' });
        onComplete();
      } else {
        const backendMsg = completeCurrentStage.message || 'Failed to advance to profile step.';
        console.error('Stage mismatch - expected "profile" but got:', completeCurrentStage.stage);
        console.error('Full response:', JSON.stringify(completeCurrentStage));
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

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#9e2146'
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Mobile-first layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Membership Card - Shows first on mobile */}
        <div className="order-1 lg:order-2 w-full lg:w-[400px] lg:sticky lg:top-8 h-fit">
          <div className="bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-white rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-2xl sm:text-3xl font-bold">QuoteBid<br/>Membership</h3>
              <span className="bg-white/20 backdrop-blur text-xs sm:text-sm px-3 py-1.5 rounded-full font-semibold">
                FULL ACCESS
              </span>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-bold">$99.99</span>
                <span className="text-lg sm:text-xl opacity-90">/month</span>
              </div>
              <p className="text-sm sm:text-base opacity-90 mt-1">Cancel anytime</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Unlimited access to all media opportunities</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Direct messaging with journalists</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Premium placement in search results</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Advanced analytics and reporting</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Expert profile optimization</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="order-2 lg:order-1 flex-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Complete Your Subscription</h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Subscribe to QuoteBid Membership to access all media opportunities
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Payment Information</h3>
                  <span className="text-green-600 text-sm flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    Secure Payment
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Card Number */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Card Information
                    </label>
                    <div className="bg-white border border-gray-300 rounded-lg p-3">
                      <CardNumberElement options={cardElementOptions} />
                    </div>
                  </div>

                  {/* Expiry and CVC */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiration
                      </label>
                      <div className="bg-white border border-gray-300 rounded-lg p-3">
                        <CardExpiryElement options={cardElementOptions} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVC
                      </label>
                      <div className="bg-white border border-gray-300 rounded-lg p-3">
                        <CardCvcElement options={cardElementOptions} />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Your card information is encrypted
                  </p>
                </div>
              </div>

              {/* Error message */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Legal text */}
              <p className="text-xs text-gray-500 mb-6">
                By completing your purchase, you agree to the{' '}
                <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
                {' '}and the{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:opacity-90 text-white py-4 rounded-xl text-base sm:text-lg font-semibold shadow-lg transition-all duration-200"
                disabled={!stripe || !elements || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue to Profile'
                )}
              </Button>
            </form>
          </div>

          {/* Mobile-only footer help */}
          <div className="mt-6 text-center lg:hidden">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <a href="/contact" className="text-blue-600 hover:underline">Contact support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentStep({ onComplete }: PaymentStepProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm onComplete={onComplete} />
    </Elements>
  );
}