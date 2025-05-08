import React, { useEffect, useState } from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Dialog
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, Apple, Bell, Check, CreditCard, DollarSign, 
  Loader2, Shield, Wallet, Zap, ArrowRight 
} from "lucide-react";
import { createPaymentIntent } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements,
  CardElement,
  PaymentRequestButtonElement
} from '@stripe/react-stripe-js';
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Make sure to call `loadStripe` outside of a component's render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number, intentId?: string) => void;
  outlet: string;
  amount: number;
  pitchId?: number; // Optional pitch ID to associate with payment intent
};

// The inner payment form component that uses Stripe hooks
// Using internal clientSecret variable since it's initialized from the parent component
// Custom Payment Options component
function PaymentOptions({ 
  amount, 
  outlet, 
  onClose, 
  onConfirm, 
  clientSecret 
}: {
  amount: number;
  outlet: string;
  onClose: () => void;
  onConfirm: (amount: number, intentId?: string) => void;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'new_card' | 'card_on_file' | 'apple_pay'>('new_card');
  const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<Array<{id: string, last4: string, brand: string}>>([]);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  
  // Initialize payment request for Apple Pay
  useEffect(() => {
    if (stripe) {
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: `Bid for ${outlet}`,
          amount: Math.round(amount * 100), // convert to cents
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });
      
      // Check if Apple Pay / Google Pay is available
      pr.canMakePayment().then(result => {
        if (result && (result.applePay || result.googlePay)) {
          setPaymentRequest(pr);
          setApplePayAvailable(true);
          console.log('Apple Pay or Google Pay is available');
        }
      });
      
      // Handle success events from Apple Pay
      pr.on('paymentmethod', async (e) => {
        console.log('Payment method received:', e.paymentMethod.id);
        
        try {
          // Confirm the payment intent with the payment method received 
          const { error, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            { payment_method: e.paymentMethod.id },
            { handleActions: false }
          );
          
          if (error) {
            // Show error to customer
            e.complete('fail');
            toast({
              title: "Payment failed",
              description: error.message,
              variant: "destructive",
            });
          } else {
            // Payment succeeded
            e.complete('success');
            handlePaymentSuccess(paymentIntent.id);
          }
        } catch (err: any) {
          console.error('Error confirming payment:', err);
          e.complete('fail');
          toast({
            title: "Payment failed",
            description: err.message,
            variant: "destructive",
          });
        }
      });
    }
  }, [stripe, amount, outlet, clientSecret, toast]);
  
  // Get saved cards for customer
  useEffect(() => {
    if (stripe && user?.stripeCustomerId) {
      // In a real implementation, we'd fetch these from the API
      // For now, simulate having saved cards for testing purposes
      const dummyCards = [
        { id: 'pm_1', last4: '4242', brand: 'visa' },
        { id: 'pm_2', last4: '5556', brand: 'mastercard' }
      ];
      
      setSavedCards(dummyCards);
    }
  }, [stripe, user?.stripeCustomerId]);
  
  // Handler for successful payment
  const handlePaymentSuccess = (intentId: string) => {
    setPaymentSuccess(true);
    setPaymentIntentId(intentId);
    
    // Call onConfirm with the payment intent ID
    onConfirm(amount, intentId);
    
    toast({
      title: "Payment authorized",
      description: "Your card will only be charged if your pitch is accepted",
      variant: "default",
    });
    
    // Close the dialog after showing success state for 1.5 seconds
    // This allows the user to see the success confirmation before redirect
    setTimeout(() => {
      onClose();
    }, 1500);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }
    
    setIsSubmitting(true);
    setPaymentError(null);
    
    try {
      console.log('Processing payment authorization...');
      
      let result;
      
      if (activeTab === 'card_on_file' && selectedSavedCard) {
        // Use saved card payment method
        result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedSavedCard
        });
      } else {
        // Use the payment element in the form
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.origin + '/payment-success',
          },
          redirect: 'if_required'
        });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      const intentId = result.paymentIntent?.id || clientSecret.split('_secret_')[0];
      handlePaymentSuccess(intentId);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'An error occurred with your payment. Please try again.');
      
      toast({
        title: "Payment authorization failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border-0 bg-blue-50/50 p-5">
        <div className="flex items-center mb-3">
          <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-700">Bid Summary</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Media Outlet:</span>
            <span className="font-medium">{outlet}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Bid Amount:</span>
            <div className="flex items-center">
              <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
                <Zap className="h-3 w-3 mr-1" />
                Pending
              </Badge>
              <span className="font-bold text-blue-700">${amount.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Processing Fee:</span>
            <span className="font-medium text-green-600">$0.00</span>
          </div>
          
          <div className="border-t border-blue-200 pt-3 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Pre-Authorization:</span>
              <div className="font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded border border-blue-200">
                ${amount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <div className="flex items-center mb-3">
          <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-700">Select Payment Method</h3>
        </div>
        
        {/* Custom tab buttons styled to match the screenshot */}
        <div className="flex w-full border-b mb-4">
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-3 flex-1 text-center border-b-2 transition-colors ${
              activeTab === 'new_card'
                ? 'border-blue-600 text-blue-700 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('new_card')}
          >
            <CreditCard className="h-4 w-4" />
            <span>New Card</span>
          </button>
          
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-3 flex-1 text-center border-b-2 transition-colors ${
              activeTab === 'card_on_file'
                ? 'border-blue-600 text-blue-700 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('card_on_file')}
          >
            <Wallet className="h-4 w-4" />
            <span>Card on File</span>
          </button>
          
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-3 flex-1 text-center border-b-2 transition-colors ${
              activeTab === 'apple_pay'
                ? 'border-blue-600 text-blue-700 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('apple_pay')}
          >
            <Apple className="h-4 w-4" />
            <span>Apple Pay</span>
          </button>
        </div>
        
        {/* Tab content */}
        <div className="mt-4">
          {activeTab === 'new_card' && (
            <div className="p-4 border rounded-lg">
              <PaymentElement options={{
                layout: {
                  type: 'tabs',
                  defaultCollapsed: false,
                },
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto'
                  }
                }
              }} />
              <div className="mt-2 text-right">
                <span className="text-xs text-gray-500">
                  Powered by <span className="font-medium">Stripe</span>
                </span>
              </div>
            </div>
          )}
          
          {activeTab === 'card_on_file' && (
            <div className="space-y-3">
              {savedCards.map(card => (
                <div 
                  key={card.id}
                  className={`p-4 border rounded-md cursor-pointer flex items-center ${
                    selectedSavedCard === card.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedSavedCard(card.id)}
                >
                  <div className="flex-1 flex items-center">
                    <CreditCard className="h-5 w-5 mr-3 text-blue-600" />
                    <div>
                      <p className="font-medium">{card.brand.toUpperCase()} •••• {card.last4}</p>
                      <p className="text-xs text-gray-500">Card on file</p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                    {selectedSavedCard === card.id && (
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'apple_pay' && (
            <div className="p-4">
              {applePayAvailable && paymentRequest ? (
                <div className="py-2">
                  <PaymentRequestButtonElement 
                    options={{ 
                      paymentRequest,
                      style: {
                        paymentRequestButton: {
                          theme: 'dark',
                          height: '48px'
                        }
                      }
                    }} 
                  />
                  <p className="text-sm text-center mt-4 text-gray-500">
                    Complete your payment quickly using Apple Pay
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Apple className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p>Apple Pay is not available on this device</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {paymentError && (
          <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-md flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{paymentError}</p>
          </div>
        )}
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Pending Authorization Only</p>
            <p className="text-sm text-amber-700 mt-1">
              Your card will only be charged if and when your pitch is selected and the article is published.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
              <Bell className="h-3.5 w-3.5" />
              <span>You'll receive email notification before any charge is processed.</span>
            </div>
          </div>
        </div>
      </div>
      
      <DialogFooter className="flex sm:justify-between sm:space-x-4 flex-col-reverse sm:flex-row gap-2 pt-3">
        <Button 
          type="button"
          variant="outline" 
          onClick={onClose}
          className="sm:flex-1 h-11 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={isSubmitting || paymentSuccess}
        >
          Cancel
        </Button>
        
        {/* Only show standard submit button for card and saved_card methods, not for Apple Pay */}
        {activeTab !== 'apple_pay' && (
          <Button 
            type="submit"
            disabled={
              !stripe || 
              !elements || 
              isSubmitting || 
              paymentSuccess || 
              (activeTab === 'card_on_file' && !selectedSavedCard)
            }
            className="sm:flex-[2] h-11 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : paymentSuccess ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Payment Authorized!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {activeTab === 'card_on_file' ? (
                  <Wallet className="h-4 w-4" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Authorize Bid Payment
              </span>
            )}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

export default function ConfirmBidDialog({ open, onClose, onConfirm, outlet, amount, pitchId }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Create payment intent when dialog opens
  useEffect(() => {
    const fetchPaymentIntent = async () => {
      if (open) {
        setIsLoading(true);
        setError(null);
        
        try {
          console.log('Creating payment intent with pitchId:', pitchId);
          const result = await createPaymentIntent({ 
            amount,
            metadata: {
              pitchType: 'media_coverage',
              outlet,
              userId: user?.id?.toString() || ''
            },
            pitchId: pitchId // Pass pitchId if available
          });
          setClientSecret(result.clientSecret);
          setIntentId(result.intentId);
        } catch (err) {
          console.error('Error creating payment intent:', err);
          
          // Format a user-friendly error message
          const errorMessage = err instanceof Error && err.message.includes('apple_pay')
            ? 'Apple Pay is not currently available. Please use a credit or debit card instead.'
            : 'Could not initialize payment. Please try again.';
          
          setError(errorMessage);
          toast({
            title: "Payment initialization failed",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchPaymentIntent();
  }, [open, amount, outlet, toast, user?.id, pitchId]);
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setError(null);
      setIntentId(null);
    }
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Confirm Your Bid
            </DialogTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              Secure Bid
            </Badge>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-800">Pending Authorization Only</h4>
                <p className="text-sm text-blue-700 mt-0.5">
                  Your card will only be charged if your pitch is selected and the article is published.
                </p>
              </div>
            </div>
          </div>
          
          <DialogDescription className="flex items-center gap-1">
            <span>You're bidding on coverage in <span className="font-medium">{outlet}</span>.</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="text-blue-700 font-semibold">Review payment details</span>
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(60vh-60px)] md:max-h-[calc(75vh-100px)] pb-4">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-sm text-muted-foreground">Initializing payment...</p>
            </div>
          ) : error ? (
            <div className="py-6">
              <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-start space-x-3 mb-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Payment Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
              <Button onClick={onClose} className="w-full">
                Continue with Card Payment
              </Button>
            </div>
          ) : clientSecret ? (
            <Elements 
              stripe={stripePromise} 
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#1E40AF',
                    colorBackground: '#ffffff',
                    colorText: '#1f2937',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '8px',
                    colorDanger: '#df1b41',
                  },
                  rules: {
                    '.Tab, .Input': {
                      boxShadow: '0 1px 3px 0 #e6ebf1',
                      border: '1px solid #dce1eb',
                      borderRadius: '6px',
                    },
                    '.Tab:hover': {
                      border: '1px solid #3b82f6',
                    },
                    '.Tab--selected': {
                      borderColor: '#1E40AF',
                      boxShadow: '0 0 0 1px #1E40AF',
                    }
                  }
                }
              }}
            >
              <PaymentOptions 
                amount={amount} 
                outlet={outlet} 
                onClose={onClose} 
                onConfirm={(amt, paymentIntentId) => {
                  // Make sure we handle null/undefined correctly
                  const finalIntentId = paymentIntentId || (intentId ? intentId : undefined);
                  onConfirm(amt, finalIntentId);
                }}
                clientSecret={clientSecret || ''}
              />
            </Elements>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              Could not initialize payment form.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}