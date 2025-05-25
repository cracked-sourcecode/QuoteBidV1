import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { SignupWizard as SignupWizardComponent } from '@/components/signup/SignupWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, User, Mail, Lock, Building, Phone, Briefcase, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SignupWizardProvider, useSignupWizard } from '@/contexts/SignupWizardContext';
import { PaymentStep } from '@/components/signup/PaymentStep';
import { ProfileStep } from '@/components/signup/ProfileStep';
import { post } from '@/lib/api';
import { SignupStage, storeSignupEmail, storeSignupData } from '@/lib/signup-wizard';
import { INDUSTRY_OPTIONS } from '@/lib/constants';
import { queryClient } from '@/lib/queryClient';

// Phone number formatting function
function formatPhoneNumber(value: string): string {
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

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
  const [showPassword, setShowPassword] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  // Map stage to step number
  const stageOrder: SignupStage[] = ['payment', 'profile', 'ready'];
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (formatted.length <= 14) { // (123) 456-7890
      setPhone(formatted);
    }
  };

  const handleStartSignup = async () => {
    if (!inputEmail || !inputEmail.includes('@') || !password || !username || !fullName || !companyName || !phone || !industry) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out all required fields to begin.',
        variant: 'destructive',
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please agree to the terms and conditions to continue.',
        variant: 'destructive',
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters long.',
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
      localStorage.setItem('signup_highest_step', '2');
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
    
    // Clear signup data
    localStorage.removeItem('signup_email');
    localStorage.removeItem('signup_highest_step');
    localStorage.removeItem('signup_data');
    
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
      <div className="bg-white shadow-lg rounded-2xl p-6 md:p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            Start Your QuoteBid Journey
          </h1>
          <p className="text-gray-600">Join the premier marketplace for media coverage</p>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleStartSignup(); }} className="space-y-4">
          {/* Name and Username */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline w-4 h-4 mr-1" />
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input 
                id="fullName" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="h-12"
                required
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="johndoe"
                className="h-12"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="inline w-4 h-4 mr-1" />
              Email Address <span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              type="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              placeholder="john@example.com"
              className="h-12"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              <Lock className="inline w-4 h-4 mr-1" />
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="h-12 pr-10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-9-3.522-9-9s3.522-9 9-9c4.478 0 9 3.522 9 9 0 1.657-.448 3.219-1.232 4.567M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>

          {/* Company and Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                <Building className="inline w-4 h-4 mr-1" />
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input 
                id="companyName" 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
                className="h-12"
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="inline w-4 h-4 mr-1" />
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input 
                id="phone" 
                type="tel"
                value={phone} 
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="h-12"
                required
              />
            </div>
          </div>

          {/* Industry */}
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="inline w-4 h-4 mr-1" />
              Industry <span className="text-red-500">*</span>
            </label>
            <Select value={industry} onValueChange={(v) => setIndustry(v)}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !agreedToTerms}
            className="w-full h-12 md:h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base md:text-lg font-semibold rounded-xl transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Continue to Payment'
            )}
          </Button>
        </form>

        {/* Already have account */}
        <p className="text-center text-sm mt-6 text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
            Sign in
          </a>
        </p>
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
      <div className="bg-white shadow-lg rounded-2xl p-8 text-center max-w-md mx-auto">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
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