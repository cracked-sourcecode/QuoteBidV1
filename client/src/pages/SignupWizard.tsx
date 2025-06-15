import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { SignupWizard as SignupWizardComponent } from '@/components/signup/SignupWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SignupWizardProvider, useSignupWizard } from '@/contexts/SignupWizardContext';
import { PaymentStep } from '@/components/signup/PaymentStep';
import { ProfileStep } from '@/components/signup/ProfileStep';
import { post } from '@/lib/api';
import { SignupStage, storeSignupEmail, storeSignupData } from '@/lib/signup-wizard';
import { INDUSTRY_OPTIONS } from '@/lib/constants';
import { queryClient } from '@/lib/queryClient';
import { useTheme } from '@/hooks/use-theme';


// Password validation utility
const validatePassword = (password: string) => {
  const requirements = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const strength = Object.values(requirements).filter(Boolean).length;
  const isValid = Object.values(requirements).every(Boolean);

  return {
    requirements,
    strength,
    isValid,
    strengthText: strength === 0 ? '' : 
                  strength <= 2 ? 'Weak' : 
                  strength <= 3 ? 'Fair' : 
                  strength === 4 ? 'Good' : 'Strong',
    strengthColor: strength === 0 ? '' : 
                   strength <= 2 ? 'text-red-400' : 
                   strength <= 3 ? 'text-yellow-400' : 
                   strength === 4 ? 'text-blue-400' : 'text-green-400'
  };
};

function SignupWizardContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currentStage, setStage, email } = useSignupWizard();
  const { refreshThemeFromDatabase } = useTheme();
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

  // Password validation state
  const passwordValidation = validatePassword(password);

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

    // Validate password requirements
    if (!passwordValidation.isValid) {
      toast({
        title: 'Password Requirements Not Met',
        description: 'Please ensure your password meets all security requirements.',
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
    
    // FORCE dark theme for new users
    console.log('🎨 [SIGNUP] Forcing dark theme for new user...');
    localStorage.setItem('quotebid-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.backgroundColor = '#0f172a';
    
    // Invalidate user query to force refetch with new token
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    
    // Refresh theme from database after successful signup completion
    console.log('🎨 [SIGNUP] Profile complete, refreshing theme from database...');
    try {
      await refreshThemeFromDatabase();
    } catch (error) {
      console.log('🎨 [SIGNUP] Theme refresh failed:', error);
    }
    
    // Use client-side navigation after a short delay
    setTimeout(() => {
      console.log('[SignupWizard] Navigating to /opportunities');
      navigate('/opportunities');
    }, 2000);
  };

  if (redirecting) {
    return (
      <div className="p-8 mb-8 text-center">
        <h1 className="text-3xl font-black mb-4 text-white">Redirecting...</h1>
        <p className="mb-6 text-blue-100 text-lg">Please wait while we redirect you to the correct step.</p>
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-300" />
      </div>
    );
  }

  // If no email, show registration form
  if (!email && !savedEmail) {
    return (
      <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-violet-900 rounded-3xl shadow-2xl p-8 mb-8">
        <h1 className="text-3xl font-black mb-6 text-white">Start Your QuoteBid Journey</h1>
        <div className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-lg font-semibold text-white mb-3">
              Full Name
            </label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white text-black border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label htmlFor="username" className="block text-lg font-semibold text-white mb-3">
              Username
            </label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-white text-black border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label htmlFor="email" className="block text-lg font-semibold text-white mb-3">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              placeholder="Enter your email"
              className="bg-white text-black border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-lg font-semibold text-white mb-3">
              Password
            </label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white text-black border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            
            {/* Password strength indicator */}
            {password && (
              <div className="mt-4 space-y-3">
                {/* Password strength indicator */}
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">Password Strength</span>
                    {passwordValidation.strengthText && (
                      <span className={`text-sm font-bold ${passwordValidation.strengthColor}`}>
                        {passwordValidation.strengthText}
                      </span>
                    )}
                  </div>
                  
                  {/* Strength bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordValidation.strength === 0 ? 'w-0' :
                        passwordValidation.strength <= 2 ? 'w-2/5 bg-red-400' :
                        passwordValidation.strength <= 3 ? 'w-3/5 bg-yellow-400' :
                        passwordValidation.strength === 4 ? 'w-4/5 bg-blue-400' :
                        'w-full bg-green-400'
                      }`}
                    />
                  </div>

                  {/* Requirements checklist */}
                  <div className="space-y-2 text-sm">
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.minLength ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.minLength ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.uppercase ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.uppercase ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least one uppercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.lowercase ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.lowercase ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least one lowercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.number ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.number ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least one number</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.special ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.special ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least one special character (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="companyName" className="block text-lg font-semibold text-white mb-3">
              Company Name
            </label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-white text-black border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-lg font-semibold text-white mb-3">
              Phone
            </label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white text-black border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label htmlFor="industry" className="block text-lg font-semibold text-white mb-3">
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
            disabled={isLoading || !passwordValidation.isValid}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-blue-700 text-white py-4 rounded-xl text-lg font-bold shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
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
      <div className="p-12 mb-8 text-center">
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-black mb-4 text-white">Welcome to QuoteBid!</h1>
          <p className="text-xl text-blue-100 mb-6 font-medium">Your account has been successfully created.</p>
          <p className="text-blue-200">Redirecting you to opportunities in a moment...</p>
        </div>
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-300" />
      </div>
    );
  } else {
    // If the stage is missing or invalid, restart at payment step
    setStage('payment');
    return (
      <div className="p-8 mb-8 text-center">
        <h1 className="text-3xl font-black mb-4 text-white">Restarting Signup...</h1>
        <p className="mb-6 text-blue-100 text-lg">We couldn't determine your current signup stage. Restarting at payment step.</p>
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-300" />
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