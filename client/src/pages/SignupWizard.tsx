import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { SignupWizard as SignupWizardComponent } from '@/components/signup/SignupWizard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getUserSignupStage, 
  storeSignupEmail, 
  getSignupEmail,
  SignupStage 
} from '@/lib/signup-wizard';
import { SignupWizardProvider } from '@/contexts/SignupWizardContext';
import { AgreementStep } from '@/components/signup/AgreementStep';
import { PaymentStep } from '@/components/signup/PaymentStep';
import { ProfileStep } from '@/components/signup/ProfileStep';

export default function SignupWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState<string>(getSignupEmail() || '');
  const [currentStage, setCurrentStage] = useState<SignupStage>('agreement');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  // Check if user already has a signup in progress
  useEffect(() => {
    const savedEmail = getSignupEmail();
    if (savedEmail && !isStarted) {
      setIsLoading(true);
      getUserSignupStage(savedEmail)
        .then(stageInfo => {
          setCurrentStage(stageInfo.stage);
          setIsStarted(true);
        })
        .catch(error => {
          console.error('Error fetching signup stage:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isStarted]);

  const handleStartSignup = () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address to begin.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    // Store the email for the signup process
    storeSignupEmail(email);
    
    // Start with the agreement step
    setCurrentStage('agreement');
    setIsStarted(true);
    setIsLoading(false);
  };

  const handleAgreementComplete = () => {
    setCurrentStage('payment');
  };

  const handlePaymentComplete = () => {
    setCurrentStage('profile');
  };

  const handleProfileComplete = (jwt: string) => {
    // Store JWT and redirect to dashboard
    localStorage.setItem('token', jwt);
    setCurrentStage('ready');
    
    // Redirect to opportunities page
    setTimeout(() => {
      setLocation('/opportunities');
    }, 1500);
  };

  const renderStageContent = () => {
    if (!isStarted) {
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              onClick={() => setIsStarted(false)}
              className="bg-[#004684] hover:bg-[#003a70] px-8"
            >
              Restart Signup
            </Button>
          </div>
        );
    }
  };

  return (
    <SignupWizardProvider>
      <SignupWizardComponent>
        {renderStageContent()}
      </SignupWizardComponent>
    </SignupWizardProvider>
  );
}