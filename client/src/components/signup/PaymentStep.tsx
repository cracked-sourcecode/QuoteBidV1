import React, { useState, useEffect } from 'react';
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
import { Loader2, CheckCircle, Lock, AlertCircle } from 'lucide-react';
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
  const { setStage } = useSignupWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const email = getSignupEmail();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const createSubscription = async () => {
      if (!email) {
        setErrorMessage('Email not found. Please restart the signup process.');
        return;
      }

      try {
        const response = await apiRequest('POST', '/api/stripe/subscription', { email });
        
        if (!response.ok) {
          const errorData = await response.json();
          
          // Handle specific error types
          let errorMessage = 'Unable to set up payment. Please try again.';
          
          if (errorData.error === 'stripe_config_error') {
            errorMessage = 'Payment system is temporarily unavailable. Please try again later or contact support.';
          } else if (errorData.error === 'missing_price_id') {
            errorMessage = 'Payment configuration is incomplete. Please contact support.';
          } else if (errorData.error === 'customer_creation_error') {
            errorMessage = 'Unable to create payment profile. Please try again.';
          } else if (errorData.error === 'subscription_creation_error') {
            errorMessage = errorData.message || 'Unable to create subscription. Please try again.';
          } else if (errorData.message && !errorData.message.includes('Internal')) {
            errorMessage = errorData.message;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setSubscriptionId(data.subscriptionId);
        } else {
          throw new Error('Unable to set up payment. Please try again.');
        }
      } catch (error: any) {
        console.error('Error creating subscription:', error);
        setErrorMessage(error.message || 'Unable to set up payment. Please try again.');
      }
    };

    createSubscription();
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !email || !clientSecret) {
      setErrorMessage('Payment system not ready. Please refresh and try again.');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        throw new Error('Card information is required');
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            email: email,
          },
        },
      });

      if (confirmError) {
        if (confirmError.type === 'card_error') {
          setErrorMessage(confirmError.message || 'Your card was declined. Please try a different card.');
        } else if (confirmError.type === 'validation_error') {
          setErrorMessage('Please check your card details and try again.');
        } else {
          setErrorMessage(confirmError.message || 'Payment failed. Please try again.');
        }
        throw confirmError;
      }

      if (paymentIntent?.status !== 'succeeded') {
        throw new Error('Payment was not successful. Please try again.');
      }

      console.log('Payment successful, advancing stage...');
      const advanceResult = await advanceSignupStage(email, 'payment', { 
        paymentIntentId: paymentIntent.id,
        subscriptionId: subscriptionId 
      });
      
      if (advanceResult.stage === 'profile') {
        setStage('profile');
        toast({ 
          title: 'Payment Successful!', 
          description: 'Your subscription is now active. Let\'s complete your profile.' 
        });
        onComplete();
      } else {
        throw new Error('Failed to advance to profile step after successful payment.');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      if (!errorMessage) {
        setErrorMessage(error.message || 'There was an error processing your payment. Please try again.');
      }
      toast({ 
        title: 'Payment Error', 
        description: errorMessage || error.message || 'There was an error processing your payment.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!clientSecret && !errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Setting up secure payment...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !clientSecret) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Payment Setup Error</h3>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <Button 
            onClick={() => {
              setErrorMessage(null);
              const createSubscription = async () => {
                if (!email) {
                  setErrorMessage('Email not found. Please restart the signup process.');
                  return;
                }

                try {
                  const response = await apiRequest('POST', '/api/stripe/subscription', { email });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    
                    let errorMessage = 'Unable to set up payment. Please try again.';
                    
                    if (errorData.error === 'stripe_config_error') {
                      errorMessage = 'Payment system is temporarily unavailable. Please try again later or contact support.';
                    } else if (errorData.error === 'missing_price_id') {
                      errorMessage = 'Payment configuration is incomplete. Please contact support.';
                    } else if (errorData.error === 'customer_creation_error') {
                      errorMessage = 'Unable to create payment profile. Please try again.';
                    } else if (errorData.error === 'subscription_creation_error') {
                      errorMessage = errorData.message || 'Unable to create subscription. Please try again.';
                    } else if (errorData.message && !errorData.message.includes('Internal')) {
                      errorMessage = errorData.message;
                    }
                    
                    throw new Error(errorMessage);
                  }
                  
                  const data = await response.json();

                  if (data.clientSecret) {
                    setClientSecret(data.clientSecret);
                    setSubscriptionId(data.subscriptionId);
                  } else {
                    throw new Error('Unable to set up payment. Please try again.');
                  }
                } catch (error: any) {
                  console.error('Error creating subscription:', error);
                  setErrorMessage(error.message || 'Unable to set up payment. Please try again.');
                }
              };

              createSubscription();
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Complete Your Subscription</h2>
      <p className="text-gray-600 text-sm mb-8">Subscribe to QuoteBid Membership to access all media opportunities</p>
      
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left Column - Payment Form */}
          <div>
          
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>
              <div className="flex items-center gap-1 text-green-600">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Secure Payment</span>
              </div>
            </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Credit Card Information
                  </label>
                  <div className="border border-gray-300 rounded-md bg-white p-3">
                    <CardNumberElement 
                      options={{
                        style: {
                          base: {
                            fontSize: '16px',
                            color: '#374151',
                            '::placeholder': {
                              color: '#9CA3AF'
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Expiration
                    </label>
                    <div className="border border-gray-300 rounded-md bg-white p-3">
                      <CardExpiryElement 
                        options={{
                          style: {
                            base: {
                              fontSize: '16px',
                              color: '#374151',
                              '::placeholder': {
                                color: '#9CA3AF'
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      CVC
                    </label>
                    <div className="border border-gray-300 rounded-md bg-white p-3">
                      <CardCvcElement 
                        options={{
                          style: {
                            base: {
                              fontSize: '16px',
                              color: '#374151',
                              '::placeholder': {
                                color: '#9CA3AF'
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-green-600">Your card information is encrypted</p>
              </div>
            
            {errorMessage && (
              <div className="mt-3 text-red-600 text-sm">
                <p>Failed to advance to profile step.</p>
              </div>
            )}
            
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-4">
                By completing your purchase, you agree to the Terms of Service and the Privacy Policy.
              </p>
              
              <Button
                type="submit"
                disabled={!stripe || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
              >
                {isLoading ? 'Processing...' : 'Continue to Profile'}
              </Button>
            </div>
          </form>
          </div>
        
        {/* Right Column - Membership Card */}
        <div>
          <div className="bg-blue-600 text-white rounded-xl p-6 relative">
            <div className="absolute top-4 right-4 bg-blue-500 text-xs font-semibold px-3 py-1 rounded-full">
              FULL ACCESS
            </div>
            
            <h3 className="text-2xl font-bold mb-1">QuoteBid</h3>
            <h4 className="text-lg mb-4">Membership</h4>
            
            <div className="mb-4">
              <span className="text-4xl font-bold">$99.99</span>
              <span className="text-lg">/month</span>
            </div>
            
            <p className="text-blue-100 mb-6 text-sm">Cancel anytime</p>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Unlimited access to all media opportunities</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Direct messaging with journalists</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Premium placement in search results</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Advanced analytics and reporting</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Expert profile optimization</span>
              </li>
            </ul>
          </div>
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