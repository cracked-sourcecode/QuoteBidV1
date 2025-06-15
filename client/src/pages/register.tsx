import React, { useRef, useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import SignupCard from '@/components/SignupCard';
import Field from '@/components/FormFieldWrapper';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { INDUSTRY_OPTIONS } from '@/lib/constants';
import { CheckCircle, X } from 'lucide-react';
import { conditionalToast } from '@/lib/mobile-utils';

// Add custom CSS for animations
const customStyles = `
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;

// Country codes list - Most commonly used countries (reduced for mobile)
const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
];

// Debounce helper
function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: any;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

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

export default function RegisterPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  /* Reset body opacity on mount and scroll to top */
  useEffect(() => {
    document.body.style.opacity = "1";
    document.body.classList.remove("navigating");
    window.scrollTo(0, 0);
    return () => {
      document.body.style.opacity = "1";
    };
  }, []);
  
  // Check if user is already in signup wizard and redirect them back
  useEffect(() => {
    // Initial check
    if (localStorage.getItem('in_signup_wizard') === 'true') {
      // User is trying to go back to register from the wizard, redirect them
      navigate('/signup-wizard');
      return;
    }
    
    // Set up an interval to continuously check
    const interval = setInterval(() => {
      if (localStorage.getItem('in_signup_wizard') === 'true') {
        navigate('/signup-wizard');
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [navigate]);
  
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    companyName: '',
    phone: '',
    industry: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [countryCode, setCountryCode] = useState('+1'); // Default to US/Canada
  const [errors, setErrors] = useState<any>({});
  const ruleToastOpen = useRef({ username: false, email: false, phone: false });
  const [usernameUnique, setUsernameUnique] = useState(true);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [emailUnique, setEmailUnique] = useState(true);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailValid, setEmailValid] = useState(true);
  const [phoneUnique, setPhoneUnique] = useState(true);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneValid, setPhoneValid] = useState(true);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // Password validation state
  const passwordValidation = validatePassword(form.password);

  // Email validation regex
  const emailRegex = /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/;

  // Debounced uniqueness check
  const checkUsernameUnique = React.useCallback(
    debounce(async (username: string) => {
      if (!username || username.length < 3) {
        setUsernameUnique(true);
        setUsernameChecking(false);
        return;
      }
      setUsernameChecking(true);
      try {
        const res = await fetch(`/api/users/check-unique?field=username&value=${encodeURIComponent(username)}`);
        const data = await res.json();
        setUsernameUnique(!!data.unique);
      } catch {
        setUsernameUnique(true); // fallback to allow
      }
      setUsernameChecking(false);
    }, 400),
    []
  );

  // Debounced uniqueness check for email
  const checkEmailUnique = React.useCallback(
    debounce(async (email: string) => {
      if (!email) {
        setEmailUnique(true);
        setEmailChecking(false);
        setEmailValid(true); // Don't show error for empty field
        return;
      }
      if (!emailRegex.test(email)) {
        setEmailUnique(true);
        setEmailChecking(false);
        setEmailValid(false);
        return;
      }
      // Email format is valid, set this immediately
      setEmailValid(true);
      setEmailChecking(true);
      try {
        const res = await fetch(`/api/users/check-unique?field=email&value=${encodeURIComponent(email)}`);
        const data = await res.json();
        setEmailUnique(!!data.unique);
      } catch {
        setEmailUnique(true); // fallback to allow
      }
      setEmailChecking(false);
    }, 400),
    [emailRegex]
  );

  // Debounced uniqueness check for phone
  const checkPhoneUnique = React.useCallback(
    debounce(async (phone: string) => {
      // Get just the digits from the formatted phone number
      const digitsOnly = phone.replace(/\D/g, '');
      
      // Check minimum length based on country
      let minLength = 7; // default minimum
      if (countryCode === '+1') minLength = 10; // US/Canada
      else if (countryCode === '+44') minLength = 10; // UK
      else if (countryCode === '+61') minLength = 9; // Australia
      
      if (!phone || digitsOnly.length < minLength) {
        setPhoneUnique(true);
        setPhoneChecking(false);
        setPhoneValid(false);
        return;
      }
      
      setPhoneValid(true);
      setPhoneChecking(true);
      
      try {
        // Send the full international number for checking
        const fullPhone = countryCode + digitsOnly;
        const res = await fetch(`/api/users/check-unique?field=phone&value=${encodeURIComponent(fullPhone)}`);
        const data = await res.json();
        setPhoneUnique(!!data.unique);
      } catch {
        setPhoneUnique(true); // fallback to allow
      }
      setPhoneChecking(false);
    }, 400),
    [countryCode]
  );

  // Watch username and phone changes (but NOT email - email only validates on blur)
  useEffect(() => {
    if (form.username) {
      checkUsernameUnique(form.username);
    }
    if (form.phone) {
      checkPhoneUnique(form.phone);
    }
  }, [form.username, checkUsernameUnique, form.phone, checkPhoneUnique]);

  // Track if form has been submitted to show errors
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Update errors when uniqueness/validity states change - but only after form submission
  useEffect(() => {
    if (formSubmitted) {
      const errs = validate();
      setErrors(errs);
    }
  }, [usernameUnique, emailUnique, emailValid, phoneUnique, phoneValid, passwordValidation.isValid, passwordsMatch, form, countryCode, formSubmitted]);

  // Handle email errors in real-time - both showing and clearing
  useEffect(() => {
    if (!form.email) {
      // Clear error for empty field
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    } else if (form.email && !emailChecking) {
      // Only update errors when not currently checking
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        
        // Check format first using the same regex as validation
        if (!emailRegex.test(form.email)) {
          newErrors.email = 'Please enter a valid email address.';
        } else if (!emailValid) {
          newErrors.email = 'Please enter a valid email address.';
        } else if (!emailUnique) {
          newErrors.email = 'Email is already in use.';
        } else {
          // Email is valid and unique - clear any errors
          delete newErrors.email;
        }
        
        return newErrors;
      });
    }
  }, [emailValid, emailUnique, emailChecking, form.email, emailRegex]);

  // Validation helpers
  const validate = () => {
    const errs: any = {};
    if (!form.fullName) errs.fullName = 'Full name is required.';
    
    // Username validation - format AND uniqueness
    if (!/^[a-z0-9_-]{3,30}$/.test(form.username)) {
      errs.username = 'Invalid username.';
    } else if (!usernameUnique) {
      errs.username = 'Username is already taken.';
    }
    
    // Email validation - format AND uniqueness AND validity  
    if (!form.email || !emailRegex.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    } else if (!emailValid) {
      errs.email = 'Please enter a valid email address.';
    } else if (!emailUnique) {
      errs.email = 'Email is already in use.';
    }
    
    if (!form.companyName) errs.companyName = 'Company name is required.';
    
    // Phone validation based on country - format AND uniqueness AND validity
    const phoneDigits = form.phone.replace(/\D/g, '');
    let minPhoneLength = 7; // default
    if (countryCode === '+1') minPhoneLength = 10;
    else if (countryCode === '+44') minPhoneLength = 10;
    else if (countryCode === '+61') minPhoneLength = 9;
    
    if (!form.phone || phoneDigits.length < minPhoneLength) {
      errs.phone = `Please enter a valid phone number (${minPhoneLength} digits required).`;
    } else if (!phoneValid) {
      errs.phone = `Please enter a valid phone number (${minPhoneLength} digits required).`;
    } else if (!phoneUnique) {
      errs.phone = 'Phone number is already in use.';
    }
    
    if (!form.industry) errs.industry = 'Please select your industry.';
    if (!passwordValidation.isValid) errs.password = 'Password must meet all security requirements.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!form.agreeTerms) errs.agreeTerms = 'You must agree to the terms.';
    return errs;
  };

  // Handle field blur - validate individual field and show error if needed
  const handleBlur = (field: string) => {
    // Validate the specific field and update errors
    const currentErrors = { ...errors };
    
    if (field === 'fullName') {
      if (!form.fullName) currentErrors.fullName = 'Full name is required.';
      else delete currentErrors.fullName;
    }
    
    if (field === 'username') {
      if (!/^[a-z0-9_-]{3,30}$/.test(form.username)) {
        currentErrors.username = 'Invalid username.';
      } else if (!usernameUnique) {
        currentErrors.username = 'Username is already taken.';
      } else {
        delete currentErrors.username;
      }
    }
    
    if (field === 'email') {
      // Trigger email validation on blur
      checkEmailUnique(form.email);
      
      // Don't set any errors here - let the async validation handle it
      // This prevents race conditions between immediate validation and async validation
    }
    
    if (field === 'companyName') {
      if (!form.companyName) currentErrors.companyName = 'Company name is required.';
      else delete currentErrors.companyName;
    }
    
    if (field === 'phone') {
      const phoneDigits = form.phone.replace(/\D/g, '');
      let minPhoneLength = 7;
      if (countryCode === '+1') minPhoneLength = 10;
      else if (countryCode === '+44') minPhoneLength = 10;
      else if (countryCode === '+61') minPhoneLength = 9;
      
      if (!form.phone || phoneDigits.length < minPhoneLength) {
        currentErrors.phone = `Please enter a valid phone number (${minPhoneLength} digits required).`;
      } else if (!phoneValid) {
        currentErrors.phone = `Please enter a valid phone number (${minPhoneLength} digits required).`;
      } else if (!phoneUnique) {
        currentErrors.phone = 'Phone number is already in use.';
      } else {
        delete currentErrors.phone;
      }
    }
    
    if (field === 'industry') {
      if (!form.industry) currentErrors.industry = 'Please select your industry.';
      else delete currentErrors.industry;
    }
    
    if (field === 'password') {
      if (!passwordValidation.isValid) currentErrors.password = 'Password must meet all security requirements.';
      else delete currentErrors.password;
    }
    
    if (field === 'confirmPassword') {
      if (form.password !== form.confirmPassword) currentErrors.confirmPassword = 'Passwords do not match.';
      else delete currentErrors.confirmPassword;
    }
    
    setErrors(currentErrors);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(f => ({ ...f, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'phone') {
      // Only allow digits, spaces, hyphens, and parentheses
      const cleaned = value.replace(/[^\d\s\-() ]/g, '');
      
      // Format phone number as user types
      const formatted = formatPhoneNumber(cleaned, countryCode);
      setForm(f => ({ ...f, [name]: formatted }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
      
      // Check password matching when either password field changes
      if (name === 'password') {
        setPasswordsMatch(value === form.confirmPassword || form.confirmPassword === '');
      } else if (name === 'confirmPassword') {
        setPasswordsMatch(value === form.password || value === '');
      }
    }
  };

  // Phone number formatter - formats based on selected country code
  const formatPhoneNumber = (value: string, selectedCountryCode: string) => {
    // Remove all formatting to get just digits
    let digits = value.replace(/\D/g, '');
    
    // Format based on selected country code
    if (selectedCountryCode === '+1') {
      // US/Canada format - limit to 10 digits
      digits = digits.slice(0, 10);
      
      if (digits.length === 0) return '';
      if (digits.length <= 3) {
        return digits;
      }
      if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      }
      
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (selectedCountryCode === '+44') {
      // UK format - typically 10 or 11 digits after country code
      digits = digits.slice(0, 11);
      if (digits.length === 0) return '';
      
      // Remove leading 0 if present (UK convention)
      if (digits.startsWith('0')) {
        digits = digits.slice(1);
      }
      
      // Format based on UK number types
      if (digits.startsWith('7')) {
        // Mobile: 7XXX XXXXXX
        if (digits.length <= 4) return digits;
        return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
      } else if (digits.startsWith('20')) {
        // London: 20 XXXX XXXX
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
        return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
      } else {
        // Other areas: XXX XXXX XXXX or XXXX XXXXXX
        if (digits.length <= 4) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
        return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
      }
    } else if (selectedCountryCode === '+61') {
      // Australia format - 9 digits after country code
      digits = digits.slice(0, 9);
      if (digits.length === 0) return '';
      
      // Remove leading 0 if present
      if (digits.startsWith('0')) {
        digits = digits.slice(1);
      }
      
      // Mobile numbers start with 4
      if (digits.startsWith('4')) {
        // Format: 4XX XXX XXX
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
      } else {
        // Landline: X XXXX XXXX
        if (digits.length <= 1) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 1)} ${digits.slice(1)}`;
        return `${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`;
      }
    } else if (selectedCountryCode === '+91') {
      // India - 10 digits
      digits = digits.slice(0, 10);
      if (digits.length === 0) return '';
      
      // Format: XXXXX XXXXX
      if (digits.length <= 5) return digits;
      return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
    } else if (selectedCountryCode === '+86') {
      // China - 11 digits for mobile
      digits = digits.slice(0, 11);
      if (digits.length === 0) return '';
      
      // Mobile format: XXX XXXX XXXX
      if (digits.length <= 3) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
    } else if (selectedCountryCode === '+33') {
      // France - 9 digits after country code
      digits = digits.slice(0, 9);
      if (digits.length === 0) return '';
      
      // Remove leading 0 if present
      if (digits.startsWith('0')) {
        digits = digits.slice(1);
      }
      
      // Format: X XX XX XX XX
      const parts = [];
      if (digits.length > 0) parts.push(digits.slice(0, 1));
      for (let i = 1; i < digits.length; i += 2) {
        parts.push(digits.slice(i, i + 2));
      }
      return parts.join(' ');
    } else if (selectedCountryCode === '+49') {
      // Germany - variable length
      digits = digits.slice(0, 12);
      if (digits.length === 0) return '';
      
      // Remove leading 0 if present
      if (digits.startsWith('0')) {
        digits = digits.slice(1);
      }
      
      // Mobile (15X, 16X, 17X): XXX XXXXXXXX
      if (digits.match(/^1[567]/)) {
        if (digits.length <= 3) return digits;
        return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      } else {
        // Landline: vary by area code length
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
        return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
      }
    } else {
      // Generic format - limit to 15 digits (ITU standard)
      digits = digits.slice(0, 15);
      if (digits.length === 0) return '';
      
      // Format in groups of 3-4
      if (digits.length <= 4) return digits;
      if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      if (digits.length <= 11) return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)} ${digits.slice(11)}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      try {
        const res = await fetch('/api/auth/signup/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            username: form.username,
            name: form.fullName,
            companyName: form.companyName,
            phone: countryCode + form.phone.replace(/\D/g, ''), // Combine country code with digits only
            industry: form.industry,
            hasAgreedToTerms: form.agreeTerms,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          
          // Store the JWT token if provided
          if (data.token) {
            localStorage.setItem('token', data.token);
          }
          
          // FORCE dark theme for new users immediately
          console.log('🎨 [REGISTER] Forcing dark theme for new user...');
          localStorage.setItem('quotebid-theme', 'dark');
          document.documentElement.setAttribute('data-theme', 'dark');
          document.documentElement.style.backgroundColor = '#0f172a';
          
          localStorage.setItem('signup_email', form.email);
          conditionalToast(toast, { title: 'Account created!', description: 'Continue to payment...', variant: 'default' });
          setTimeout(() => {
            navigate('/signup-wizard');
          }, 1200);
        } else {
          const data = await res.json();
          conditionalToast(toast, { title: 'Signup Error', description: data.message || 'Failed to create account', variant: 'destructive' });
        }
      } catch (err) {
        conditionalToast(toast, { title: 'Signup Error', description: 'Failed to create account', variant: 'destructive' });
      }
    }
  };

  // Check if all required fields are filled and valid
  const isFormComplete =
    !!form.fullName &&
    !!form.username && usernameUnique && !usernameChecking &&
    !!form.email && emailUnique && !emailChecking && emailValid &&
    !!form.companyName &&
    !!form.phone && phoneUnique && !phoneChecking && phoneValid &&
    !!form.industry &&
    passwordValidation.isValid &&
    !!form.confirmPassword && passwordsMatch &&
    form.agreeTerms;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen relative font-inter text-gray-900 overflow-hidden">
        {/* ——— Premium dark gradient backdrop ——— */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900" />
        {/* Overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
        {/* Animated mesh gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        {/* ——— PREMIUM NAVBAR ——— */}
        <header className="absolute top-0 w-full z-30 py-2 px-6 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center group">
              <span className="text-white font-black text-3xl tracking-tight">
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
              </span>
              <div className="ml-3 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                Beta
              </div>
            </Link>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                className="text-white/80 hover:text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl transition-all duration-300"
                onClick={() => navigate('/login')}
              >
                Log In
              </Button>
            </div>
          </div>
        </header>

        <div className="relative z-20 flex flex-col lg:flex-row min-h-screen pt-4">
          {/* Mobile Header - Show on small screens */}
          <div className="lg:hidden px-4 pt-16 pb-4 text-center relative z-10">
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4 text-white">
              World's First <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">PR</span> Pricing Engine
            </h1>
            <p className="text-lg sm:text-xl text-white max-w-sm mx-auto mb-2" style={{lineHeight: '1.3'}}>
              The World's First Live Marketplace for Earned Media
            </p>
            <p className="text-lg sm:text-xl text-gray-300 max-w-sm mx-auto mb-4" style={{lineHeight: '1.3'}}>
              Built for experts — not PR agencies.
            </p>
          </div>

          {/* Left: Hero Panel - Desktop only */}
          <div className="hidden lg:flex flex-col justify-center items-start w-1/2 pl-24 pr-6 xl:pl-28 xl:pr-8 relative z-10">
            <div className="max-w-2xl w-full">
              <h1 className="text-5xl xl:text-6xl font-black leading-tight mb-4 text-white" style={{letterSpacing: '-0.01em'}}>
                World's First <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">PR</span> Pricing Engine
              </h1>
              <p className="mb-1 text-xl xl:text-xl text-white">
                The World's First Live Marketplace for Earned Media
              </p>
              <p className="mb-3 text-xl xl:text-xl text-gray-300">
                Built for experts — not PR agencies.
              </p>
              <p className="mb-8 text-lg xl:text-lg max-w-xl text-gray-300 leading-relaxed">
                QuoteBid's Pricing Engine tracks demand, deadlines, and outlet yield in real time. <span className="font-bold text-white">No retainers. No static fees. Only pay if you're published.</span>
              </p>
              <ul className="space-y-2 text-base xl:text-lg">
                <li className="flex items-start gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m5 0h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m-5 4h6m-6 4h6m-6-8h6" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">Bid on real stories in real time</div>
                    <div className="text-gray-300 mt-1">Every pitch is a bid — prices rise and fall with demand.</div>
                  </div>
                </li>
                <li className="flex items-start gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">Track live market pricing</div>
                    <div className="text-gray-300 mt-1">Our engine moves with outlet yield, deadlines, and user interest.</div>
                  </div>
                </li>
                <li className="flex items-start gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">Only pay if you're quoted</div>
                    <div className="text-gray-300 mt-1">No retainers. No upfront fees. You only pay when you're published.</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Right: Signup Card */}
          <div className="flex flex-col justify-center items-center w-full lg:w-1/2 px-3 py-4 lg:px-8 lg:py-4 relative z-10">
            <div className="w-full max-w-[420px] sm:max-w-[480px] lg:max-w-[620px] bg-slate-800/95 backdrop-blur-2xl border border-slate-600/50 rounded-2xl sm:rounded-3xl shadow-2xl pt-3 px-4 pb-8 sm:pt-4 sm:px-6 sm:pb-10 lg:pt-5 lg:px-8 lg:pb-12">
              <div className="text-center mb-3 sm:mb-1">
                <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2">
                  <span className="text-white font-black text-xl sm:text-2xl lg:text-4xl tracking-tight">
                    <span className="text-white">Quote</span>
                    <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
                  </span>
                  <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs sm:text-sm font-bold uppercase tracking-wider backdrop-blur-sm">
                    Beta
                  </div>
                </div>
                <p className="text-gray-400 text-sm sm:text-base lg:text-lg font-medium mb-3 sm:mb-4">Built for Experts, Not PR Agencies</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-1 sm:space-y-0.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2">
                    <Field error={errors.fullName}>
                    <input 
                      name="fullName" 
                      value={form.fullName} 
                      onChange={handleChange} 
                      onBlur={() => handleBlur('fullName')}
                      placeholder="Full Name" 
                      className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-700/60 px-3 py-2.5 sm:px-5 sm:py-2.5 w-full text-sm text-white placeholder-gray-400 transition-all hover:border-slate-500/50 focus:border-blue-400/50 focus:ring-0 focus:outline-none h-10 sm:h-11" 
                    />
                  </Field>
                  <Field error={errors.username}>
                    <input
                      name="username"
                      value={form.username}
                      onChange={e => {
                        // Allow uppercase but convert to lowercase, filter out invalid chars
                        const value = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
                        setForm(f => ({ ...f, username: value }));
                      }}
                      onBlur={() => handleBlur('username')}
                      placeholder="Username"
                      className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-700/60 px-3 py-2.5 sm:px-5 sm:py-2.5 w-full text-sm text-white placeholder-gray-400 transition-all hover:border-slate-500/50 focus:border-blue-400/50 focus:ring-0 focus:outline-none h-10 sm:h-11"
                    />
                  </Field>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2">
                  <Field error={errors.email}>
                    <input
                      name="email"
                      value={form.email}
                      onChange={e => {
                        // Allow uppercase but convert to lowercase for email, remove all spaces
                        const value = e.target.value.toLowerCase().replace(/\s/g, '');
                        setForm(f => ({ ...f, email: value }));
                      }}
                      onBlur={() => handleBlur('email')}
                      placeholder="Email"
                      className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-700/60 px-3 py-2.5 sm:px-5 sm:py-2.5 w-full text-sm text-white placeholder-gray-400 transition-all hover:border-slate-500/50 focus:border-blue-400/50 focus:ring-0 focus:outline-none h-10 sm:h-11"
                    />
                  </Field>
                  <Field error={errors.companyName}>
                    <input 
                      name="companyName" 
                      value={form.companyName} 
                      onChange={handleChange} 
                      onBlur={() => handleBlur('companyName')}
                      placeholder="Company Name" 
                      className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-700/60 px-3 py-2.5 sm:px-5 sm:py-2.5 w-full text-sm text-white placeholder-gray-400 transition-all hover:border-slate-500/50 focus:border-blue-400/50 focus:ring-0 focus:outline-none h-10 sm:h-11" 
                    />
                  </Field>
                </div>
                
                <div>
                  <Field error={errors.phone}>
                    <div className="flex gap-1.5 sm:gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-700/60 px-1.5 py-2.5 sm:px-2 sm:py-2.5 w-14 sm:w-16 text-xs text-white transition-all hover:border-slate-500/50 focus:border-blue-400/50 focus:ring-0 focus:outline-none h-10 sm:h-11 appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.15rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '0.8em 0.8em',
                          backgroundColor: 'rgb(51 65 85 / 0.6)'
                        }}
                      >
                        {COUNTRY_CODES.map(({ code, country, flag }) => (
                          <option key={code} value={code} className="bg-slate-800 text-white">
                            {code}
                          </option>
                        ))}
                      </select>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        onBlur={() => handleBlur('phone')}
                        placeholder="Phone number"
                        className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-700/60 px-3 py-2.5 sm:px-5 sm:py-2.5 w-full text-sm text-white placeholder-gray-400 transition-all hover:border-slate-500/50 focus:border-blue-400/50 focus:ring-0 focus:outline-none h-10 sm:h-11"
                        required
                      />
                    </div>
                  </Field>
                </div>
                
                <div>
                  <Field error={errors.industry}>
                    <div className="relative">
                      <select
                        name="industry"
                        value={form.industry}
                        onChange={handleChange}
                        onBlur={() => handleBlur('industry')}
                        className="w-full rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-5 sm:py-2.5 text-sm text-white bg-slate-700/60 border border-slate-600/30 transition-all hover:border-slate-500/50 focus:border-blue-400/50 focus:ring-0 focus:outline-none appearance-none h-10 sm:h-11"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.75rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.2em 1.2em'
                        }}
                      >
                        <option value="" disabled className="bg-slate-800 text-gray-400">Select your industry</option>
                        {INDUSTRY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2">
                  <Field error={errors.password}>
                    <input 
                      name="password" 
                      type="password" 
                      value={form.password} 
                      onChange={handleChange} 
                      onBlur={() => handleBlur('password')}
                      placeholder="Create password" 
                      className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-700/60 px-3 py-2.5 sm:px-5 sm:py-2.5 w-full text-sm text-white placeholder-gray-400 transition-all hover:border-slate-500/50 focus:border-blue-400/50 focus:ring-0 focus:outline-none h-10 sm:h-11" 
                    />
                  </Field>
                  <Field error={errors.confirmPassword}>
                    <input 
                      name="confirmPassword" 
                      type="password" 
                      value={form.confirmPassword} 
                      onChange={handleChange} 
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder="Confirm password" 
                      className="rounded-lg sm:rounded-xl border border-slate-600/30 bg-slate-700/60 px-3 py-2.5 sm:px-5 sm:py-2.5 w-full text-sm text-white placeholder-gray-400 transition-all hover:border-slate-500/50 focus:border-blue-400/50 focus:ring-0 focus:outline-none h-10 sm:h-11" 
                    />
                  </Field>
                </div>
                
                {/* Password strength indicator - shown below both password fields */}
                {form.password && (
                  <div className="mt-2 sm:mt-3 space-y-1 sm:space-y-2">
                    <div className="bg-slate-700/50 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-2 border border-slate-600/30">
                      <div className="flex items-center justify-between mb-1 sm:mb-2 lg:mb-1">
                        <span className="text-xs font-medium text-white">Password Strength</span>
                        {passwordValidation.strengthText && (
                          <span className={`text-xs font-bold ${passwordValidation.strengthColor}`}>
                            {passwordValidation.strengthText}
                          </span>
                        )}
                      </div>
                      
                      {/* Strength bar */}
                      <div className="w-full bg-slate-600 rounded-full h-1 sm:h-1.5 lg:h-1 mb-2 sm:mb-3 lg:mb-2">
                        <div 
                          className={`h-1 sm:h-1.5 lg:h-1 rounded-full transition-all duration-300 ${
                            passwordValidation.strength === 0 ? 'w-0' :
                            passwordValidation.strength <= 2 ? 'w-2/5 bg-red-400' :
                            passwordValidation.strength <= 3 ? 'w-3/5 bg-yellow-400' :
                            passwordValidation.strength === 4 ? 'w-4/5 bg-blue-400' :
                            'w-full bg-green-400'
                          }`}
                        />
                      </div>

                      {/* Requirements checklist - mobile: original layout, desktop: compact grid */}
                      <div className="space-y-1 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-0.5 lg:space-y-0 text-xs">
                        <div className={`flex items-center space-x-2 lg:space-x-1.5 ${passwordValidation.requirements.minLength ? 'text-green-400' : 'text-gray-400'}`}>
                          {passwordValidation.requirements.minLength ? <CheckCircle className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" /> : <X className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" />}
                          <span className="lg:text-xs">At least 8 characters</span>
                        </div>
                        <div className={`flex items-center space-x-2 lg:space-x-1.5 ${passwordValidation.requirements.uppercase ? 'text-green-400' : 'text-gray-400'}`}>
                          {passwordValidation.requirements.uppercase ? <CheckCircle className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" /> : <X className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" />}
                          <span className="lg:text-xs"><span className="lg:hidden">At least one uppercase letter</span><span className="hidden lg:inline">Uppercase</span></span>
                        </div>
                        <div className={`flex items-center space-x-2 lg:space-x-1.5 ${passwordValidation.requirements.lowercase ? 'text-green-400' : 'text-gray-400'}`}>
                          {passwordValidation.requirements.lowercase ? <CheckCircle className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" /> : <X className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" />}
                          <span className="lg:text-xs"><span className="lg:hidden">At least one lowercase letter</span><span className="hidden lg:inline">Lowercase</span></span>
                        </div>
                        <div className={`flex items-center space-x-2 lg:space-x-1.5 ${passwordValidation.requirements.number ? 'text-green-400' : 'text-gray-400'}`}>
                          {passwordValidation.requirements.number ? <CheckCircle className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" /> : <X className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" />}
                          <span className="lg:text-xs"><span className="lg:hidden">At least one number</span><span className="hidden lg:inline">Number</span></span>
                        </div>
                        <div className={`flex items-center space-x-2 lg:space-x-1.5 ${passwordValidation.requirements.special ? 'text-green-400' : 'text-gray-400'}`}>
                          {passwordValidation.requirements.special ? <CheckCircle className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" /> : <X className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" />}
                          <span className="lg:text-xs"><span className="lg:hidden">At least one special character (!@#$%^&*)</span><span className="hidden lg:inline">Special character (!@#$%^&*)</span></span>
                        </div>
                        {form.confirmPassword && (
                          <div className={`flex items-center space-x-2 lg:space-x-1.5 ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                            {passwordsMatch ? <CheckCircle className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" /> : <X className="h-3 w-3 lg:h-2.5 lg:w-2.5 flex-shrink-0" />}
                            <span className="lg:text-xs">Passwords match</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start mt-5 sm:mt-6">
                  <input 
                    type="checkbox" 
                    name="agreeTerms" 
                    checked={form.agreeTerms} 
                    onChange={handleChange} 
                    className="accent-blue-500 w-4 h-4 border-2 border-slate-600 rounded transition-all duration-150 mr-2 outline-none focus:outline-none cursor-pointer mt-0.5 sm:mt-1" 
                    required 
                  />
                  <label htmlFor="terms" className="text-sm sm:text-base font-medium text-gray-300 select-none cursor-pointer leading-relaxed">
                    I agree to the <Link href="/legal/terms" className="text-blue-400 underline hover:text-blue-300 transition-colors">Terms of Service</Link>
                  </label>
                </div>
                
                <div className="mt-6 sm:mt-8 lg:mt-10 pt-2 sm:pt-4">
                <Button 
                  type="submit" 
                  className="w-full py-2.5 sm:py-3 text-sm sm:text-base lg:text-base font-semibold rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white transition-all duration-300 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={!isFormComplete}
                >
                  Create Account
                </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* ——— FOOTER ——— */}
        <footer className="relative z-20 bg-gradient-to-b from-transparent to-slate-900 py-16">
          {/* Background effects */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
            <div className="mb-8">
              <Link href="/" className="inline-flex items-center group">
                <span className="text-white font-black text-4xl tracking-tight">
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
                </span>
                <div className="ml-3 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  Beta
                </div>
              </Link>
              <p className="text-gray-400 mt-4 text-lg">
                The World's First Live Marketplace for Earned Media
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <Link 
                href="/legal/terms" 
                className="text-gray-300 hover:text-white transition-colors duration-300 text-lg font-medium"
              >
                Terms of Use
              </Link>
              <Link 
                href="/legal/privacy" 
                className="text-gray-300 hover:text-white transition-colors duration-300 text-lg font-medium"
              >
                Privacy
              </Link>
              <Link 
                href="/legal/editorial-integrity" 
                className="text-gray-300 hover:text-white transition-colors duration-300 text-lg font-medium"
              >
                Editorial Integrity
              </Link>
            </div>
            
            <div className="border-t border-white/20 pt-8">
              <p className="text-gray-400 text-lg">
                &copy; {new Date().getFullYear()} QuoteBid Inc. All rights reserved.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Built For Experts, Not PR Agencies.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
