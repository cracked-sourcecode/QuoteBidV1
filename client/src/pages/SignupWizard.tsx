import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { SignupWizard as SignupWizardComponent } from '@/components/signup/SignupWizard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SignupWizardProvider, useSignupWizard } from '@/contexts/SignupWizardContext';
import { AgreementStep } from '@/components/signup/AgreementStep';
import { PaymentStep } from '@/components/signup/PaymentStep';
import { ProfileStep } from '@/components/signup/ProfileStep';
import { post } from '@/lib/api';

function SignupWizardContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentStage, setStage, email } = useSignupWizard();
  const [inputEmail, setInputEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Map stage to step number
  const stageOrder = ['agreement', 'payment', 'profile'];
  const currentStep = stageOrder.indexOf(currentStage) + 1;

  // Enforce tab and step on back navigation
  const enforceLocation = () => {
    const highest = Number(localStorage.getItem('signup_highest_step') || String(currentStep));
    const url = new URL(window.location.href);
    const tab = url.searchParams.get('tab');
    const stepParam = Number(url.searchParams.get('step') || '1');
    if (tab !== 'signup' || stepParam < highest) {
      setRedirecting(true);
      setLocation(`/auth?tab=signup&step=${highest}`, { replace: true });
    }
  };

  useEffect(() => enforceLocation(), [currentStep]);

  useEffect(() => {
    const handlePop = () => enforceLocation();
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Update highest step reached in localStorage
  useEffect(() => {
    const prev = Number(localStorage.getItem('signup_highest_step') || '1');
    if (currentStep > prev) {
      localStorage.setItem('signup_highest_step', String(currentStep));
    }
  }, [currentStep]);

  // Prevent navigating back to previous steps via URL or reload
  useEffect(() => {
    const highestStep = Number(localStorage.getItem('signup_highest_step') || '1');
    const url = new URL(window.location.href);
    const stepParam = url.searchParams.get('step');
    if (stepParam && Number(stepParam) < highestStep) {
      setRedirecting(true);
      setStage(stageOrder[highestStep - 1]);
      setLocation(`/auth?tab=signup&step=${highestStep}`, { replace: true });
    }
  }, [currentStage, setStage, setLocation]);

  const handleStartSignup = async () => {
    if (!inputEmail || !inputEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address to begin.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      await post('/api/auth/register', { email: inputEmail });
      setStage('agreement');
    } catch (err: any) {
      toast({ title: 'Signup Error', description: err.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleAgreementComplete = () => setStage('payment');
  const handlePaymentComplete = () => setStage('profile');
  const handleProfileComplete = (jwt: string) => {
    setStage('ready');
    localStorage.setItem('token', jwt);
    setTimeout(() => {
      setLocation('/opportunities', { replace: true });
    }, 1500);
  };

  if (redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show email entry form only if no email and at agreement step
  if (currentStage === 'agreement' && !email) {
      return (
        <div className="bg-white shadow-md rounded-lg p-8 mb-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Welcome to QuoteBid</h1>
          <p className="mb-6 text-center">
            Enter your email address to start the streamlined signup process.
          </p>
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your email address"
              required
            />
          </div>
          <div className="flex justify-center">
            <Button 
              onClick={handleStartSignup}
              className="bg-[#004684] hover:bg-[#003a70] px-8"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Start Signup Process"
              )}
            </Button>
          </div>
        </div>
      );
    }

    switch (currentStage) {
      case 'agreement':
        return <AgreementStep onComplete={handleAgreementComplete} />;
      case 'payment':
        return <PaymentStep onComplete={handlePaymentComplete} />;
      case 'profile':
        return <ProfileStep onComplete={handleProfileComplete} />;
      case 'ready':
        return (
          <div className="bg-white shadow-md rounded-lg p-8 mb-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Setup Complete!</h1>
            <p className="mb-6">Redirecting you to the dashboard...</p>
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        );
      default:
        return (
          <div className="bg-white shadow-md rounded-lg p-8 mb-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="mb-6">We couldn't determine your current signup stage.</p>
            <Button 
            onClick={() => setStage('agreement')}
              className="bg-[#004684] hover:bg-[#003a70] px-8"
            >
              Restart Signup
            </Button>
          </div>
        );
    }
}

export default function SignupWizard() {
  return (
    <SignupWizardProvider>
      <SignupWizardComponent>
        <SignupWizardContent />
      </SignupWizardComponent>
    </SignupWizardProvider>
  );
}