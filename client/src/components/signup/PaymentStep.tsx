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
import { conditionalToast } from '@/lib/mobile-utils';
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
        conditionalToast(toast, { 
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
      conditionalToast(toast, { 
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
      <div className="flex items-center justify-center min-h-screen md:min-h-[80vh] px-4 md:px-6 py-4 md:py-8">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-stretch">
            {/* Left Column - Payment Form */}
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-8 h-full">
              <form onSubmit={handleSubmit} className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-lg md:text-xl font-bold text-white">Payment Information</h3>
                  <div className="flex items-center gap-2 text-green-400">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Secure</span>
        </div>
      </div>
                  
                <div className="space-y-4 flex-grow">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-3">
                      Credit Card Information
                    </label>
                    <div className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-600 px-4 py-3 sm:px-5 sm:py-3 w-full">
                      <CardNumberElement 
                        options={{
                          style: {
                            base: {
                              fontSize: '14px',
                              color: '#ffffff',
                              fontWeight: '400',
                              fontFamily: 'Inter, sans-serif',
                              backgroundColor: 'transparent',
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
                      <label className="block text-sm font-medium text-gray-200 mb-3">
                        Expiration
                      </label>
                      <div className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-600 px-4 py-3 sm:px-5 sm:py-3 w-full">
                        <CardExpiryElement 
                          options={{
                            style: {
                              base: {
                                fontSize: '14px',
                                color: '#ffffff',
                                fontWeight: '400',
                                fontFamily: 'Inter, sans-serif',
                                backgroundColor: 'transparent',
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
                      <label className="block text-sm font-medium text-gray-200 mb-3">
                        CVC
                      </label>
                      <div className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-600 px-4 py-3 sm:px-5 sm:py-3 w-full">
                        <CardCvcElement 
                          options={{
                            style: {
                              base: {
                                fontSize: '14px',
                                color: '#ffffff',
                                fontWeight: '400',
                                fontFamily: 'Inter, sans-serif',
                                backgroundColor: 'transparent',
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
                  
                  <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-400/30 px-4 py-3 rounded-xl">
                    <Lock className="h-4 w-4" />
                    <p className="text-sm font-medium">Your card information is encrypted</p>
                  </div>
                </div>
              
                {errorMessage && (
                  <div className="mt-4 bg-red-500/10 border border-red-400/30 text-red-400 px-4 py-3 rounded-xl">
                    <p className="text-sm">{errorMessage}</p>
                  </div>
                )}
                
                <div className="mt-6">
                  <Button
                    type="submit"
                    disabled={!stripe || isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Subscribe & Continue'
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-300 mt-4">
                    By completing your purchase, you agree to the <a href="/legal/terms" className="text-blue-400 hover:underline">Terms of Service</a> and the <a href="/legal/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>.
                  </p>
                </div>
              </form>
            </div>
          
            {/* Right Column - Membership Card */}
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8 h-full">
              <div className="w-full h-full flex flex-col">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white">QuoteBid</h3>
                      <p className="text-blue-300 text-sm">Membership</p>
                    </div>
                    <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                      FULL ACCESS
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-white">$99.99</span>
                    <span className="text-lg text-blue-300">/month</span>
                  </div>
                  
                  <p className="text-blue-300 text-sm">Cancel anytime</p>
                </div>
                
                <div className="space-y-3 flex-grow">
                  <h4 className="text-white font-bold text-sm mb-4">What's included:</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Full access to all live media opportunities</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Dynamic pricing — no retainers, no fixed fees</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">New opportunities added daily</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Interactive market chart with live price updates</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Track pitch status and history</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Record and submit pitches with your voice</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Fast, minimal UI built for professionals</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/20">
                  <p className="text-blue-300 text-sm text-center">
                    Join thousands of experts getting featured in top publications
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage && !clientSecret) {
  return (
      <div className="flex items-center justify-center min-h-[80vh] px-6 py-8">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Left Column - Payment Form */}
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8 h-full">
              <form onSubmit={handleSubmit} className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Payment Information</h3>
                  <div className="flex items-center gap-2 text-green-400">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Secure</span>
                  </div>
                </div>
                  
                <div className="space-y-4 flex-grow">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-3">
                      Credit Card Information
                    </label>
                    <div className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-600 px-4 py-3 sm:px-5 sm:py-3 w-full">
                      <CardNumberElement 
                        options={{
                          style: {
                            base: {
                              fontSize: '14px',
                              color: '#ffffff',
                              fontWeight: '400',
                              fontFamily: 'Inter, sans-serif',
                              backgroundColor: 'transparent',
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
                      <label className="block text-sm font-medium text-gray-200 mb-3">
                        Expiration
                      </label>
                      <div className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-600 px-4 py-3 sm:px-5 sm:py-3 w-full">
                        <CardExpiryElement 
                          options={{
                            style: {
                              base: {
                                fontSize: '14px',
                                color: '#ffffff',
                                fontWeight: '400',
                                fontFamily: 'Inter, sans-serif',
                                backgroundColor: 'transparent',
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
                      <label className="block text-sm font-medium text-gray-200 mb-3">
                        CVC
                      </label>
                      <div className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-600 px-4 py-3 sm:px-5 sm:py-3 w-full">
                        <CardCvcElement 
                          options={{
                            style: {
                              base: {
                                fontSize: '14px',
                                color: '#ffffff',
                                fontWeight: '400',
                                fontFamily: 'Inter, sans-serif',
                                backgroundColor: 'transparent',
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
                  
                  <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-400/30 px-4 py-3 rounded-xl">
                    <Lock className="h-4 w-4" />
                    <p className="text-sm font-medium">Your card information is encrypted</p>
                  </div>
                </div>
              
                {errorMessage && (
                  <div className="mt-4 bg-red-500/10 border border-red-400/30 text-red-400 px-4 py-3 rounded-xl">
                    <p className="text-sm">{errorMessage}</p>
                  </div>
                )}
                
                <div className="mt-6">
                  <Button
                    type="submit"
                    disabled={!stripe || isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Subscribe & Continue'
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-300 mt-4">
                    By completing your purchase, you agree to the <a href="/legal/terms" className="text-blue-400 hover:underline">Terms of Service</a> and the <a href="/legal/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>.
                  </p>
                </div>
              </form>
            </div>
          
            {/* Right Column - Membership Card */}
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8 h-full">
              <div className="w-full h-full flex flex-col">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white">QuoteBid</h3>
                      <p className="text-blue-300 text-sm">Membership</p>
                    </div>
                    <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                      FULL ACCESS
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-white">$99.99</span>
                    <span className="text-lg text-blue-300">/month</span>
                  </div>
                  
                  <p className="text-blue-300 text-sm">Cancel anytime</p>
                </div>
                
                <div className="space-y-3 flex-grow">
                  <h4 className="text-white font-bold text-sm mb-4">What's included:</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Full access to all live media opportunities</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Dynamic pricing — no retainers, no fixed fees</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">New opportunities added daily</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Interactive market chart with live price updates</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Track pitch status and history</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Record and submit pitches with your voice</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white text-sm">Fast, minimal UI built for professionals</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/20">
                  <p className="text-blue-300 text-sm text-center">
                    Join thousands of experts getting featured in top publications
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center min-h-[80vh] px-6 pt-4 pb-8">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Left Column - Payment Form */}
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8 h-full">
            <form onSubmit={handleSubmit} className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Payment Information</h3>
                <div className="flex items-center gap-2 text-green-400">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">Secure</span>
                </div>
              </div>
                
              <div className="space-y-4 flex-grow">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-3">
                    Credit Card Information
                  </label>
                  <div className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-600 px-4 py-3 sm:px-5 sm:py-3 w-full">
                    <CardNumberElement 
                      options={{
                        style: {
                          base: {
                            fontSize: '14px',
                            color: '#ffffff',
                            fontWeight: '400',
                            fontFamily: 'Inter, sans-serif',
                            backgroundColor: 'transparent',
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
                    <label className="block text-sm font-medium text-gray-200 mb-3">
                      Expiration
                    </label>
                    <div className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-600 px-4 py-3 sm:px-5 sm:py-3 w-full">
                      <CardExpiryElement 
                        options={{
                          style: {
                            base: {
                              fontSize: '14px',
                              color: '#ffffff',
                              fontWeight: '400',
                              fontFamily: 'Inter, sans-serif',
                              backgroundColor: 'transparent',
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
                    <label className="block text-sm font-medium text-gray-200 mb-3">
                      CVC
                    </label>
                    <div className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-600 px-4 py-3 sm:px-5 sm:py-3 w-full">
                      <CardCvcElement 
                        options={{
                          style: {
                            base: {
                              fontSize: '14px',
                              color: '#ffffff',
                              fontWeight: '400',
                              fontFamily: 'Inter, sans-serif',
                              backgroundColor: 'transparent',
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
                
                <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-400/30 px-4 py-3 rounded-xl">
                  <Lock className="h-4 w-4" />
                  <p className="text-sm font-medium">Your card information is encrypted</p>
                </div>
              </div>
            
              {errorMessage && (
                <div className="mt-4 bg-red-500/10 border border-red-400/30 text-red-400 px-4 py-3 rounded-xl">
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}
              
              <div className="mt-6">
                <Button
                  type="submit"
                  disabled={!stripe || isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white py-4 rounded-xl font-bold transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Subscribe & Continue'
                  )}
                </Button>
                
                <p className="text-xs text-gray-300 mt-4">
                  By completing your purchase, you agree to the <a href="/legal/terms" className="text-blue-400 hover:underline">Terms of Service</a> and the <a href="/legal/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>.
                </p>
              </div>
            </form>
          </div>
        
          {/* Right Column - Membership Card */}
          <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8 h-full">
            <div className="w-full h-full flex flex-col">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">QuoteBid</h3>
                    <p className="text-blue-300 text-sm">Membership</p>
                  </div>
                  <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                    FULL ACCESS
                  </span>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-white">$99.99</span>
                  <span className="text-lg text-blue-300">/month</span>
                </div>
                
                <p className="text-blue-300 text-sm">Cancel anytime</p>
              </div>
              
              <div className="space-y-3 flex-grow">
                <h4 className="text-white font-bold text-sm mb-4">What's included:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white text-sm">Full access to all live media opportunities</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white text-sm">Dynamic pricing — no retainers, no fixed fees</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white text-sm">New opportunities added daily</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white text-sm">Interactive market chart with live price updates</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white text-sm">Track pitch status and history</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white text-sm">Record and submit pitches with your voice</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white text-sm">Fast, minimal UI built for professionals</span>
                  </li>
                </ul>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/20">
                <p className="text-blue-300 text-sm text-center">
                  Join thousands of experts getting featured in top publications
                </p>
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