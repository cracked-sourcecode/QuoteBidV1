import React, { useEffect } from 'react';
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
import { SignupStage } from '@/lib/signup-wizard';

function SignupWizardContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentStage, setStage, email } = useSignupWizard();
  const [inputEmail, setInputEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  // Map stage to step number
  const stageOrder: SignupStage[] = ['agreement', 'payment', 'profile'];
  const currentStep = stageOrder.indexOf(currentStage) + 1;

  // Update highest step reached in localStorage
  useEffect(() => {
    const prev = Number(localStorage.getItem('signup_highest_step') || '1');
    if (currentStep > prev) {
      localStorage.setItem('signup_highest_step', String(currentStep));
    }
  }, [currentStep]);

  // Handle browser back button and prevent back navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      const highestStep = Number(localStorage.getItem('signup_highest_step') || '1');
      const url = new URL(window.location.href);
      const stepParam = url.searchParams.get('step');
      const tabParam = url.searchParams.get('tab');
      
      // Always ensure we're on the signup tab
      if (tabParam !== 'signup') {
        url.searchParams.set('tab', 'signup');
        url.searchParams.set('step', String(highestStep));
        window.history.replaceState(null, '', url.toString());
        setStage(stageOrder[highestStep - 1]);
        return;
      }
      
      // If trying to go back in steps, force forward
      if (stepParam && Number(stepParam) < highestStep) {
        url.searchParams.set('step', String(highestStep));
        window.history.replaceState(null, '', url.toString());
        setStage(stageOrder[highestStep - 1]);
      }
    };

    // Add event listener for popstate (back button)
    window.addEventListener('popstate', handlePopState);

    // Initial check and setup
    const highestStep = Number(localStorage.getItem('signup_highest_step') || '1');
    const url = new URL(window.location.href);
    const stepParam = url.searchParams.get('step');
    const tabParam = url.searchParams.get('tab');
    
    // Always ensure we're on the signup tab
    if (tabParam !== 'signup') {
      url.searchParams.set('tab', 'signup');
      url.searchParams.set('step', String(highestStep));
      window.history.replaceState(null, '', url.toString());
      setStage(stageOrder[highestStep - 1]);
      return;
    }
    
    // If trying to go back in steps, force forward
    if (stepParam && Number(stepParam) < highestStep) {
      url.searchParams.set('step', String(highestStep));
      window.history.replaceState(null, '', url.toString());
      setStage(stageOrder[highestStep - 1]);
    }

    // If on wrong step, redirect
    if (stepParam && Number(stepParam) !== currentStep) {
      url.searchParams.set('step', String(currentStep));
      window.history.replaceState(null, '', url.toString());
    }

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentStage, setStage, currentStep]);

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
      setLocation('/opportunities');
    }, 1500);
  };

  // If no email, show email input
  if (!email) {
    return (
      <div className="bg-white shadow-md rounded-lg p-8 mb-8">
        <h1 className="text-2xl font-bold mb-6">Start Your QuoteBid Journey</h1>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#004684] focus:border-[#004684]"
              placeholder="Enter your email"
            />
          </div>
          <Button
            onClick={handleStartSignup}
            disabled={isLoading}
            className="w-full bg-[#004684] hover:bg-[#003a70]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              'Begin Signup'
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Render current step
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