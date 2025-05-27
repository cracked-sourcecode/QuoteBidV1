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
    <div className="min-h-[calc(100vh-240px)] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Subscription</h2>
          <p className="text-gray-600">Subscribe to QuoteBid Membership to access all media opportunities</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Column - Payment Form */}
            <div className="p-6 lg:p-8">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
                  <div className="flex items-center gap-1 text-green-600">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Secure Payment</span>
                  </div>
                </div>
                  
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Credit Card Information
                    </label>
                    <div className="border border-gray-300 rounded-lg bg-gray-50 p-3 transition-all hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
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
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Expiration
                      </label>
                      <div className="border border-gray-300 rounded-lg bg-gray-50 p-3 transition-all hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        CVC
                      </label>
                      <div className="border border-gray-300 rounded-lg bg-gray-50 p-3 transition-all hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
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
                  
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2.5 rounded-lg">
                    <Lock className="h-3.5 w-3.5" />
                    <p className="text-xs font-medium">Your card information is encrypted</p>
                  </div>
                </div>
              
                {errorMessage && (
                  <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg">
                    <p className="text-sm">{errorMessage}</p>
                  </div>
                )}
                
                <div className="mt-5">
                  <p className="text-xs text-gray-500 mb-3">
                    By completing your purchase, you agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and the <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                  </p>
                  
                  <Button
                    type="submit"
                    disabled={!stripe || isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Continue to Profile'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          
            {/* Right Column - Membership Card */}
            <div className="bg-gradient-to-br from-[#004684] to-[#003a70] p-6 lg:p-8 flex flex-col justify-center">
              <div className="w-full">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">QuoteBid</h3>
                      <p className="text-blue-200 text-sm">Membership</p>
                    </div>
                    <span className="bg-yellow-400 text-[#004684] text-xs font-bold px-2.5 py-1 rounded-full">
                      FULL ACCESS
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">$99.99</span>
                    <span className="text-lg text-blue-200">/month</span>
                  </div>
                  
                  <p className="text-blue-200 text-sm">Cancel anytime</p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-white font-semibold text-sm mb-3">What's included:</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Unlimited access to all media opportunities</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Direct messaging with journalists</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Premium placement in search results</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Advanced analytics and reporting</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Expert profile optimization</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/20">
                  <p className="text-blue-200 text-xs text-center">
                    Join thousands of experts getting featured in top publications
                  </p>
                </div>
              </div>
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