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
import { queryClient } from '@/lib/queryClient';

function SignupWizardContent() {
  const [, navigate] = useLocation();
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

  // Map stage to step number (ready is not a step, just a completion state)
  const stageOrder: SignupStage[] = ['payment', 'profile', 'ready'];
  const currentStep = currentStage === 'ready' ? 2 : stageOrder.indexOf(currentStage) + 1;

  // Update highest step reached in localStorage (max 2)
  useEffect(() => {
    const prev = Number(localStorage.getItem('signup_highest_step') || '1');
    const stepToStore = Math.min(currentStep, 2); // Never store step > 2
    if (stepToStore > prev) {
      localStorage.setItem('signup_highest_step', String(stepToStore));
    }
  }, [currentStep]);

  // Prevent navigation back to /register once in the wizard
  useEffect(() => {
    // Set a flag that we're in the wizard
    localStorage.setItem('in_signup_wizard', 'true');
    
    // Continuously push states to prevent back navigation
    const interval = setInterval(() => {
      if (window.location.pathname.includes('signup-wizard')) {
        window.history.pushState(null, '', window.location.href);
      }
    }, 100);
    
    // Cleanup function to remove the flag when component unmounts
    return () => {
      clearInterval(interval);
      // Only remove if we're actually leaving the wizard (not just re-rendering)
      if (!window.location.pathname.includes('signup-wizard')) {
        localStorage.removeItem('in_signup_wizard');
      }
    };
  }, []);

  // Warn users if they try to leave the signup wizard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if we're not on the ready stage (completed)
      if (currentStage !== 'ready') {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your signup progress will be lost.';
        return e.returnValue;
      }
    };

    // Prevent keyboard shortcuts for back navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Alt+Left Arrow, Backspace (when not in input), etc.
      if ((e.altKey && e.key === 'ArrowLeft') || 
          (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [currentStage]);

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
      event.stopPropagation();
      
      // Always push forward state to prevent any backward navigation
      window.history.pushState(null, '', window.location.href);
      
      // If trying to go back to /register, prevent it
      if (window.location.pathname === '/register' && localStorage.getItem('in_signup_wizard') === 'true') {
        // Force forward to the signup wizard
        window.history.pushState(null, '', '/signup-wizard');
        return;
      }
      
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

    // Override the browser's back functionality
    const preventBackNavigation = () => {
      window.history.pushState(null, '', window.location.href);
    };

    // Push multiple states to make it harder to go back
    preventBackNavigation();
    preventBackNavigation();
    preventBackNavigation();

    // Add event listener for popstate (back button)
    window.addEventListener('popstate', handlePopState);
    
    // Also intercept hashchange events
    const handleHashChange = (event: HashChangeEvent) => {
      event.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('hashchange', handleHashChange);

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

    // If on wrong step, redirect (but never allow step 3)
    if (stepParam && Number(stepParam) !== currentStep) {
      const correctedStep = Math.min(currentStep, 2); // Never allow step > 2
      url.searchParams.set('step', String(correctedStep));
      window.history.replaceState(null, '', url.toString());
    }
    
    // If somehow we have step=3 in the URL, fix it immediately
    if (stepParam === '3') {
      url.searchParams.set('step', '2');
      window.history.replaceState(null, '', url.toString());
    }

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
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
      const response = await post('/api/auth/signup/start', {
        email: inputEmail,
        password,
        username: username.toLowerCase(),
        name: fullName,
        companyName,
        phone,
        industry,
        hasAgreedToTerms: true,
      });
      
      // Store the JWT token if provided
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      
      storeSignupEmail(inputEmail);
      storeSignupData({ email: inputEmail, password, username: username.toLowerCase(), name: fullName, companyName, phone, industry });
      setSavedEmail(inputEmail);
      localStorage.setItem('signup_highest_step', '1'); // Starting at step 1 (payment)
      setStage('payment');
    } catch (err: any) {
      toast({ title: 'Signup Error', description: err.message, variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handlePaymentComplete = () => setStage('profile');
  const handleProfileComplete = async (jwt: string) => {
    console.log('[SignupWizard] handleProfileComplete called with JWT length:', jwt?.length);
    
    // Verify token is in localStorage
    const storedToken = localStorage.getItem('token');
    console.log('[SignupWizard] Token verification:', storedToken ? `Token exists (length: ${storedToken.length})` : 'Token missing!');
    
    // Set stage to ready
    setStage('ready');
    
    // Clear signup data and flags
    localStorage.removeItem('signup_email');
    localStorage.removeItem('signup_highest_step');
    localStorage.removeItem('signup_data');
    localStorage.removeItem('in_signup_wizard');
    
    // Invalidate user query to force refetch with new token
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    
    // Use client-side navigation after a short delay
    setTimeout(() => {
      console.log('[SignupWizard] Navigating to /opportunities');
      navigate('/opportunities');
    }, 2000);
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
  if (currentStage === 'payment') {
    return <PaymentStep onComplete={handlePaymentComplete} />;
  } else if (currentStage === 'profile') {
    return <ProfileStep onComplete={handleProfileComplete} />;
  } else if (currentStage === 'ready') {
    // The navigation is already handled in handleProfileComplete
    return (
      <div className="bg-white shadow-md rounded-lg p-8 mb-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-green-600">Welcome to QuoteBid!</h1>
          <p className="text-lg text-gray-600 mb-4">Your account has been successfully created.</p>
          <p className="text-gray-500">Redirecting you to opportunities in a moment...</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
      </div>
    );
  } else {
    // If the stage is missing or invalid, restart at payment step
    setStage('payment');
    return (
      <div className="bg-white shadow-md rounded-lg p-8 mb-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Restarting Signup...</h1>
        <p className="mb-6">We couldn't determine your current signup stage. Restarting at payment step.</p>
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
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