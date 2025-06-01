import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Heart, DollarSign, Calendar, Phone, AlertTriangle, Star, CheckCircle } from 'lucide-react';

interface CancelRetentionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmCancel: () => void;
  isLoading: boolean;
}

type CancelReason = 'cost' | 'features' | 'complexity' | 'competitor' | 'pause' | 'other';

interface RetentionOffer {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  highlight?: boolean;
}

export function CancelRetentionModal({ 
  open, 
  onOpenChange, 
  onConfirmCancel, 
  isLoading 
}: CancelRetentionModalProps) {
  const [step, setStep] = useState<'reason' | 'offer' | 'final'>('reason');
  const [cancelReason, setCancelReason] = useState<CancelReason | ''>('');
  const [otherReason, setOtherReason] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<string>('');

  const reasonOptions = [
    { value: 'cost', label: 'Too expensive for my budget', icon: <DollarSign className="h-4 w-4" /> },
    { value: 'features', label: 'Not getting enough opportunities', icon: <Star className="h-4 w-4" /> },
    { value: 'complexity', label: 'Too complex or time-consuming', icon: <AlertTriangle className="h-4 w-4" /> },
    { value: 'competitor', label: 'Found a better alternative', icon: <CheckCircle className="h-4 w-4" /> },
    { value: 'pause', label: 'Need to pause temporarily', icon: <Calendar className="h-4 w-4" /> },
    { value: 'other', label: 'Other reason', icon: <Heart className="h-4 w-4" /> }
  ];

  const getRetentionOffers = (reason: CancelReason): RetentionOffer[] => {
    switch (reason) {
      case 'cost':
        return [
          {
            id: 'discount50',
            title: '50% Off Next 3 Months',
            description: 'Continue your journey with half-price access to all premium features',
            icon: <DollarSign className="h-5 w-5 text-green-600" />,
            action: 'Apply Discount',
            highlight: true
          },
          {
            id: 'pause',
            title: 'Pause Subscription',
            description: 'Take a break for up to 3 months without losing your progress',
            icon: <Calendar className="h-5 w-5 text-blue-600" />,
            action: 'Pause Account'
          },
          {
            id: 'call',
            title: 'Speak with Our Team',
            description: 'Let us discuss custom pricing options that work for your budget',
            icon: <Phone className="h-5 w-5 text-purple-600" />,
            action: 'Schedule Call'
          }
        ];
      case 'features':
        return [
          {
            id: 'premium_boost',
            title: 'Premium Boost Package',
            description: 'Get priority placement and 3 guaranteed opportunities this month',
            icon: <Star className="h-5 w-5 text-yellow-600" />,
            action: 'Activate Boost',
            highlight: true
          },
          {
            id: 'profile_review',
            title: 'Free Profile Optimization',
            description: 'Our experts will optimize your profile to increase match rates',
            icon: <CheckCircle className="h-5 w-5 text-green-600" />,
            action: 'Book Review'
          },
          {
            id: 'call',
            title: 'Strategy Session',
            description: 'Free 30-minute session to improve your success rate',
            icon: <Phone className="h-5 w-5 text-purple-600" />,
            action: 'Schedule Call'
          }
        ];
      case 'complexity':
        return [
          {
            id: 'onboarding',
            title: 'Personal Onboarding',
            description: 'Free 1-on-1 setup session to simplify everything for you',
            icon: <Phone className="h-5 w-5 text-blue-600" />,
            action: 'Book Session',
            highlight: true
          },
          {
            id: 'auto_mode',
            title: 'Auto-Pilot Mode',
            description: 'We\'ll handle applications for you based on your preferences',
            icon: <CheckCircle className="h-5 w-5 text-green-600" />,
            action: 'Enable Auto-Pilot'
          }
        ];
      case 'pause':
        return [
          {
            id: 'pause_3month',
            title: '3-Month Pause',
            description: 'Take a break and return anytime with all your data intact',
            icon: <Calendar className="h-5 w-5 text-blue-600" />,
            action: 'Pause Account',
            highlight: true
          },
          {
            id: 'reduced_plan',
            title: 'Minimal Plan ($29/month)',
            description: 'Keep access with limited features at a lower cost',
            icon: <DollarSign className="h-5 w-5 text-green-600" />,
            action: 'Switch Plan'
          }
        ];
      default:
        return [
          {
            id: 'call',
            title: 'Speak with Our Team',
            description: 'Let us understand your needs and find a solution',
            icon: <Phone className="h-5 w-5 text-purple-600" />,
            action: 'Schedule Call',
            highlight: true
          },
          {
            id: 'pause',
            title: 'Pause Subscription',
            description: 'Take a break without losing your account',
            icon: <Calendar className="h-5 w-5 text-blue-600" />,
            action: 'Pause Account'
          }
        ];
    }
  };

  const resetModal = () => {
    setStep('reason');
    setCancelReason('');
    setOtherReason('');
    setSelectedOffer('');
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  const handleReasonNext = () => {
    if (cancelReason) {
      setStep('offer');
    }
  };

  const handleOfferAction = (offerId: string) => {
    // Here you would normally implement the actual offer logic
    // For now, we'll just show a success message and close
    if (offerId === 'call') {
      window.open('https://calendly.com/rubicon-pr-group/wholesale-pr-portal-demo', '_blank');
    }
    handleClose();
  };

  const handleFinalCancel = () => {
    onConfirmCancel();
    resetModal();
  };

  const renderReasonStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          We're sorry to see you go
        </DialogTitle>
        <DialogDescription>
          Help us understand what's not working so we can make QuoteBid better for everyone.
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-6">
        <RadioGroup value={cancelReason} onValueChange={(value) => setCancelReason(value as CancelReason)}>
          <div className="space-y-3">
            {reasonOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="flex items-center gap-3 cursor-pointer flex-1">
                  {option.icon}
                  <span>{option.label}</span>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
        
        {cancelReason === 'other' && (
          <div className="mt-4">
            <Label htmlFor="other-reason">Please tell us more:</Label>
            <Textarea
              id="other-reason"
              placeholder="What could we have done better?"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              className="mt-2"
            />
          </div>
        )}
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Never mind, keep subscription
        </Button>
        <Button 
          onClick={handleReasonNext}
          disabled={!cancelReason || (cancelReason === 'other' && !otherReason.trim())}
        >
          Continue
        </Button>
      </DialogFooter>
    </>
  );

  const renderOfferStep = () => {
    const offers = getRetentionOffers(cancelReason as CancelReason);
    
    return (
      <>
        <DialogHeader>
          <DialogTitle>Wait! We have something for you</DialogTitle>
          <DialogDescription>
            Based on your feedback, here are some options that might help:
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          {offers.map((offer) => (
            <div 
              key={offer.id}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                offer.highlight 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleOfferAction(offer.id)}
            >
              <div className="flex items-start gap-3">
                {offer.icon}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{offer.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{offer.description}</p>
                  <Button 
                    size="sm" 
                    variant={offer.highlight ? "default" : "outline"}
                    className="w-full"
                  >
                    {offer.action}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Keep my subscription
          </Button>
          <Button variant="ghost" onClick={() => setStep('final')} className="text-gray-500">
            No thanks, cancel anyway
          </Button>
        </DialogFooter>
      </>
    );
  };

  const renderFinalStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Final confirmation
        </DialogTitle>
        <DialogDescription>
          This action will cancel your subscription. You'll lose access to:
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              All premium media opportunities
            </li>
            <li className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Priority journalist matching
            </li>
            <li className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Advanced profile features
            </li>
            <li className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Your current momentum and relationships
            </li>
          </ul>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Last chance:</strong> Your subscription will remain active until the end of your billing period. 
            You can still change your mind before then!
          </p>
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Keep subscription
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleFinalCancel}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cancelling...
            </>
          ) : (
            'Yes, cancel my subscription'
          )}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        {step === 'reason' && renderReasonStep()}
        {step === 'offer' && renderOfferStep()}
        {step === 'final' && renderFinalStep()}
      </DialogContent>
    </Dialog>
  );
} 