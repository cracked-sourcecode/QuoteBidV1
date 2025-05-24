import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { SignupWizard as SignupWizardComponent } from '@/components/signup/SignupWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SignupWizardProvider, useSignupWizard } from '@/contexts/SignupWizardContext';
import { PaymentStep } from '@/components/signup/PaymentStep';
import { ProfileStep } from '@/components/signup/ProfileStep';
import { post } from '@/lib/api';
import { SignupStage, storeSignupEmail, storeSignupData } from '@/lib/signup-wizard';
import { INDUSTRY_OPTIONS } from '@/lib/constants';

function SignupWizardContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentStage, setStage, email } = useSignupWizard();
  const [inputEmail, setInputEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [industry, setIndustry] = React.useState('');
  const [savedEmail, setSavedEmail] = React.useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('signup_email');
    }
    return null;
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);

  // Map stage to step number
  const stageOrder: SignupStage[] = ['payment', 'profile'];
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
    // When rendering on the standalone /register page we don't need to enforce
    // the legacy query params used by /auth. This allows the new sign up flow to
    // work without redirecting.
    if (window.location.pathname.startsWith('/register')) {
      return;
    }
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
    if (!inputEmail || !inputEmail.includes('@') || !password || !username || !fullName || !companyName || !phone || !industry) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out all required fields to begin.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      await post('/api/auth/register', { email: inputEmail, password, username, fullName, companyName, phone, industry });
      storeSignupEmail(inputEmail);
      storeSignupData({ email: inputEmail, password, username, fullName, companyName, phone, industry });
      setSavedEmail(inputEmail);
      setStage('payment');
    } catch (err: any) {
      toast({ title: 'Signup Error', description: err.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handlePaymentComplete = () => setStage('profile');
  const handleProfileComplete = (jwt: string) => {
    setStage('ready');
    localStorage.setItem('token', jwt);
    setTimeout(() => {
      setLocation('/opportunities');
    }, 1500);
  };

  if (redirecting) {
    return (
      <div className="bg-white shadow-md rounded-lg p-8 mb-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p className="mb-6">Please wait while we redirect you to the correct step.</p>
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  // If no email, show registration form
  if (!email && !savedEmail) {
    return (
      <div className="bg-white shadow-md rounded-lg p-8 mb-8">
        <h1 className="text-2xl font-bold mb-6">Start Your QuoteBid Journey</h1>
        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <Select value={industry} onValueChange={(v) => setIndustry(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            onClick={() => setStage('payment')}
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