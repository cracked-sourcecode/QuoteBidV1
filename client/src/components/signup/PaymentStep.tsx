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
import { Loader2, CheckCircle, Lock, CreditCard, AlertCircle } from 'lucide-react';
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

// Stripe element styling for better mobile experience
const stripeElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
      padding: '12px',
    },
    invalid: {
      color: '#9e2146',
      iconColor: '#9e2146',
    },
  },
};

function CheckoutForm({ onComplete }: PaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { refreshStage, setStage } = useSignupWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<{
    cardNumber?: string;
    cardExpiry?: string;
    cardCvc?: string;
  }>({});
  const email = getSignupEmail();
  const [, setLocation] = useLocation();

  // Handle Stripe element changes for real-time validation
  const handleElementChange = (elementType: string) => (event: any) => {
    if (event.error) {
      setCardErrors(prev => ({ ...prev, [elementType]: event.error.message }));
    } else {
      setCardErrors(prev => ({ ...prev, [elementType]: undefined }));
    }
  };

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
        billing_details: {
          email: email,
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }
      
      // Store payment method ID in localStorage
      localStorage.setItem('signup_payment', JSON.stringify({ paymentMethodId: paymentMethod.id }));

      // Complete the payment stage
      const completeCurrentStage = await advanceSignupStage(email, 'payment', { paymentMethodId: paymentMethod.id });
      
      if (completeCurrentStage.stage === 'profile') {
        setStage('profile');
        toast({ 
          title: 'Payment Information Saved', 
          description: 'Your payment method has been securely saved.' 
        });
        onComplete();
      } else {
        const backendMsg = completeCurrentStage.message || 'Failed to advance to profile step.';
        setErrorMessage(backendMsg);
        throw new Error(backendMsg);
      }
    } catch (error: any) {
      const message = error.message || 'There was an error processing your payment. Please try again.';
      setErrorMessage(message);
      toast({ 
        title: 'Payment Error', 
        description: message, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left: Payment Form */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Complete Your Subscription</h2>
            <p className="text-gray-600">Subscribe to QuoteBid Membership to access all media opportunities</p>
          </div>

          {/* Payment Information Section */}
          <div className="border border-gray-200 rounded-xl p-4 md:p-6 mb-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-700" />
                <span className="font-semibold text-lg">Payment Information</span>
              </div>
              <span className="text-green-600 text-sm flex items-center gap-1">
                <Lock className="h-4 w-4" /> 
                Secure
              </span>
            </div>

            <div className="space-y-4">
              {/* Card Number */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Card Number
                </label>
                <div className="border border-gray-300 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <CardNumberElement 
                    options={stripeElementOptions}
                    onChange={handleElementChange('cardNumber')}
                  />
                </div>
                {cardErrors.cardNumber && (
                  <p className="mt-1 text-sm text-red-600">{cardErrors.cardNumber}</p>
                )}
              </div>

              {/* Expiry and CVC */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Expiration Date
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <CardExpiryElement 
                      options={stripeElementOptions}
                      onChange={handleElementChange('cardExpiry')}
                    />
                  </div>
                  {cardErrors.cardExpiry && (
                    <p className="mt-1 text-sm text-red-600">{cardErrors.cardExpiry}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Security Code
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <CardCvcElement 
                      options={stripeElementOptions}
                      onChange={handleElementChange('cardCvc')}
                    />
                  </div>
                  {cardErrors.cardCvc && (
                    <p className="mt-1 text-sm text-red-600">{cardErrors.cardCvc}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="mt-4 flex items-center gap-2 text-xs text-green-600">
              <Lock className="h-3 w-3" />
              <span>Your payment information is encrypted and secure</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Legal Text */}
          <p className="text-xs text-gray-500 mb-6">
            By completing your purchase, you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-700">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>.
          </p>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 md:h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base md:text-lg font-semibold rounded-xl transition-all duration-200"
            disabled={!stripe || !elements || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Continue to Profile Setup'
            )}
          </Button>
        </div>

        {/* Right: Membership Summary */}
        <div className="w-full lg:w-96">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl p-6 md:p-8 shadow-lg">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">QuoteBid Membership</h3>
                <span className="bg-white/20 backdrop-blur text-xs px-3 py-1 rounded-full font-semibold">
                  FULL ACCESS
                </span>
              </div>
              
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-bold">$99.99</span>
                  <span className="text-lg opacity-90">/month</span>
                </div>
                <p className="text-sm opacity-90 mt-1">Cancel anytime</p>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              {[
                'Unlimited access to all media opportunities',
                'Direct messaging with journalists',
                'Premium placement in search results',
                'Advanced analytics and reporting',
                'Expert profile optimization',
                'Priority customer support'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span className="text-sm md:text-base">{feature}</span>
                </div>
              ))}
            </div>

            {/* Money Back Guarantee */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-sm text-center opacity-90">
                30-day money-back guarantee
              </p>
            </div>
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