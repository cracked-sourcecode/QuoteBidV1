import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import { apiRequest } from '@/lib/queryClient';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

// Get Stripe public key from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const createSubscription = async () => {
      if (!user?.email) {
        setErrorMessage('User not found. Please try logging in again.');
        return;
      }

      try {
        const response = await apiRequest('POST', '/api/stripe/subscription', { 
          email: user.email 
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          let errorMessage = 'Unable to set up payment. Please try again.';
          
          if (errorData.error === 'stripe_config_error') {
            errorMessage = 'Payment system is temporarily unavailable. Please try again later.';
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
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !user?.email || !clientSecret) {
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
            email: user.email,
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

      toast({
        title: 'Payment Successful!',
        description: 'Your subscription has been activated.',
      });
      
      onSuccess();
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-4 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}>
            Setting up secure payment...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage && !clientSecret) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className={`text-lg font-semibold mb-2 ${
            theme === 'dark' ? 'text-red-400' : 'text-red-700'
          }`}>
            Payment Setup Error
          </h3>
          <p className={`mb-6 ${
            theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
          }`}>
            {errorMessage}
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className={theme === 'dark' 
                ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100' 
                : ''
              }
            >
              Cancel
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              className={`${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="text-center mb-6">
        <h3 className={`text-lg font-semibold mb-2 ${
          theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
        }`}>
          Update Your Subscription
        </h3>
        <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}>
          Enter your payment information to reactivate your QuoteBid membership
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className={`text-sm font-semibold ${
            theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
          }`}>
            Payment Information
          </h4>
          <div className="flex items-center gap-1 text-green-600">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Secure</span>
          </div>
        </div>
          
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Card Number
            </label>
            <div className={`border rounded-lg p-3 transition-all ${
              theme === 'dark' 
                ? 'border-slate-600 bg-slate-800 hover:border-slate-500 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20' 
                : 'border-gray-300 bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
            }`}>
              <CardNumberElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: theme === 'dark' ? '#e2e8f0' : '#374151',
                      '::placeholder': {
                        color: theme === 'dark' ? '#64748b' : '#9CA3AF'
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Expiration
              </label>
              <div className={`border rounded-lg p-3 transition-all ${
                theme === 'dark' 
                  ? 'border-slate-600 bg-slate-800 hover:border-slate-500 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20' 
                  : 'border-gray-300 bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
              }`}>
                <CardExpiryElement 
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: theme === 'dark' ? '#e2e8f0' : '#374151',
                        '::placeholder': {
                          color: theme === 'dark' ? '#64748b' : '#9CA3AF'
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                CVC
              </label>
              <div className={`border rounded-lg p-3 transition-all ${
                theme === 'dark' 
                  ? 'border-slate-600 bg-slate-800 hover:border-slate-500 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20' 
                  : 'border-gray-300 bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
              }`}>
                <CardCvcElement 
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: theme === 'dark' ? '#e2e8f0' : '#374151',
                        '::placeholder': {
                          color: theme === 'dark' ? '#64748b' : '#9CA3AF'
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 text-green-600 px-3 py-2.5 rounded-lg ${
            theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
          }`}>
            <Lock className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">Your card information is encrypted and secure</p>
          </div>
        </div>

        {errorMessage && (
          <div className={`border px-3 py-2.5 rounded-lg ${
            theme === 'dark' 
              ? 'bg-red-900/20 border-red-800 text-red-400' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        <div className={`pt-4 ${
          theme === 'dark' ? 'border-t border-slate-700' : 'border-t border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-medium ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-900'
            }`}>
              QuoteBid Membership
            </span>
            <span className={`text-lg font-bold ${
              theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
            }`}>
              $99.99/month
            </span>
          </div>
          <p className={`text-xs mb-4 ${
            theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
          }`}>
            By completing payment, you agree to our Terms of Service and Privacy Policy. Cancel anytime.
          </p>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={`flex-1 ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100' 
                  : ''
              }`}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || isLoading}
              className={`flex-1 text-white ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Activate Subscription
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { theme } = useTheme();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-lg ${
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-700' 
          : 'bg-white border-gray-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${
            theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
          }`}>
            <CreditCard className={`h-5 w-5 ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            }`} />
            Subscription Payment
          </DialogTitle>
          <DialogDescription className={
            theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
          }>
            Complete your payment to access all QuoteBid features.
          </DialogDescription>
        </DialogHeader>
        
        <Elements stripe={stripePromise}>
          <PaymentForm onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </DialogContent>
    </Dialog>
  );
} 