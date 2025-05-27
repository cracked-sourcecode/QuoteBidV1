import React, { useRef, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import SignupCard from '@/components/SignupCard';
import Field from '@/components/FormFieldWrapper';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { INDUSTRY_OPTIONS } from '@/lib/constants';

// Country codes list
const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+358', country: 'Finland', flag: '🇫🇮' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+30', country: 'Greece', flag: '🇬🇷' },
  { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
  { code: '+36', country: 'Hungary', flag: '🇭🇺' },
  { code: '+40', country: 'Romania', flag: '🇷🇴' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+237', country: 'Cameroon', flag: '🇨🇲' },
  { code: '+225', country: 'Ivory Coast', flag: '🇨🇮' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', country: 'Panama', flag: '🇵🇦' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+509', country: 'Haiti', flag: '🇭🇹' },
  { code: '+1876', country: 'Jamaica', flag: '🇯🇲' },
  { code: '+1868', country: 'Trinidad', flag: '🇹🇹' },
  { code: '+1246', country: 'Barbados', flag: '🇧🇧' },
  { code: '+1242', country: 'Bahamas', flag: '🇧🇸' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+93', country: 'Afghanistan', flag: '🇦🇫' },
  { code: '+98', country: 'Iran', flag: '🇮🇷' },
  { code: '+964', country: 'Iraq', flag: '🇮🇶' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+963', country: 'Syria', flag: '🇸🇾' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+967', country: 'Yemen', flag: '🇾🇪' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+679', country: 'Fiji', flag: '🇫🇯' },
  { code: '+675', country: 'Papua New Guinea', flag: '🇵🇬' },
  { code: '+677', country: 'Solomon Islands', flag: '🇸🇧' },
  { code: '+678', country: 'Vanuatu', flag: '🇻🇺' },
  { code: '+676', country: 'Tonga', flag: '🇹🇴' },
  { code: '+685', country: 'Samoa', flag: '🇼🇸' },
  { code: '+686', country: 'Kiribati', flag: '🇰🇮' },
  { code: '+688', country: 'Tuvalu', flag: '🇹🇻' },
  { code: '+674', country: 'Nauru', flag: '🇳🇷' },
  { code: '+682', country: 'Cook Islands', flag: '🇨🇰' },
  { code: '+687', country: 'New Caledonia', flag: '🇳🇨' },
  { code: '+689', country: 'French Polynesia', flag: '🇵🇫' },
].sort((a, b) => a.country.localeCompare(b.country));

// Debounce helper
function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: any;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function RegisterPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
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
      if (!email || !emailRegex.test(email)) {
        setEmailUnique(true);
        setEmailChecking(false);
        setEmailValid(false);
        return;
      }
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
    []
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

  // Watch username, email, and phone changes
  useEffect(() => {
    if (form.username) {
      checkUsernameUnique(form.username);
    }
    if (form.email) {
      checkEmailUnique(form.email);
    }
    if (form.phone) {
      checkPhoneUnique(form.phone);
    }
  }, [form.username, checkUsernameUnique, form.email, checkEmailUnique, form.phone, checkPhoneUnique]);

  // Validation helpers
  const validate = () => {
    const errs: any = {};
    if (!form.fullName) errs.fullName = 'Full name is required.';
    if (!/^[a-z0-9_-]{3,30}$/.test(form.username)) errs.username = 'Invalid username.';
    if (!form.email || !/^[^@]+@[^@]+\.[a-zA-Z]{2,}$/.test(form.email)) errs.email = 'Please enter a valid email address.';
    if (!form.companyName) errs.companyName = 'Company name is required.';
    
    // Phone validation based on country
    const phoneDigits = form.phone.replace(/\D/g, '');
    let minPhoneLength = 7; // default
    if (countryCode === '+1') minPhoneLength = 10;
    else if (countryCode === '+44') minPhoneLength = 10;
    else if (countryCode === '+61') minPhoneLength = 9;
    
    if (!form.phone || phoneDigits.length < minPhoneLength) {
      errs.phone = `Please enter a valid phone number (${minPhoneLength} digits required).`;
    }
    
    if (!form.industry) errs.industry = 'Please select your industry.';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!form.agreeTerms) errs.agreeTerms = 'You must agree to the terms.';
    return errs;
  };

  // Toast rule reminders
  const handleBlur = (field: string) => {
    if (field === 'username' && !/^[a-z0-9_-]{3,30}$/.test(form.username) && !ruleToastOpen.current.username) {
      ruleToastOpen.current.username = true;
      toast({
        title: 'Username requirements',
        description: 'Usernames must be 3-30 chars, lowercase letters, numbers, _ or -',
        variant: 'destructive',
        duration: 4000,
      });
      setTimeout(() => (ruleToastOpen.current.username = false), 4000);
    }
    if (field === 'email' && (!form.email || !/^[^@]+@[^@]+\.[a-zA-Z]{2,}$/.test(form.email)) && !ruleToastOpen.current.email) {
      ruleToastOpen.current.email = true;
      toast({
        title: 'Email requirements',
        description: 'Please enter a valid email address (lowercase, valid TLD).',
        variant: 'destructive',
        duration: 4000,
      });
      setTimeout(() => (ruleToastOpen.current.email = false), 4000);
    }
    if (field === 'phone') {
      const phoneDigits = form.phone.replace(/\D/g, '');
      if ((!form.phone || phoneDigits.length < 7) && !ruleToastOpen.current.phone) {
        ruleToastOpen.current.phone = true;
        toast({
          title: 'Phone requirements',
          description: 'Please enter a valid phone number with country code (e.g., +1 234 567 8900).',
          variant: 'destructive',
          duration: 4000,
        });
        setTimeout(() => (ruleToastOpen.current.phone = false), 4000);
      }
    }
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
          
          localStorage.setItem('signup_email', form.email);
          toast({ title: 'Account created!', description: 'Continue to payment...', variant: 'default' });
          setTimeout(() => {
            navigate('/signup-wizard');
          }, 1200);
        } else {
          const data = await res.json();
          toast({ title: 'Signup Error', description: data.message || 'Failed to create account', variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Signup Error', description: 'Failed to create account', variant: 'destructive' });
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
    !!form.password && form.password.length >= 8 &&
    !!form.confirmPassword && passwordsMatch &&
    form.agreeTerms;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-gradient-to-br from-[#3B267A] to-[#A084E8]">
      {/* Mobile Header - Show on small screens */}
      <div className="lg:hidden px-6 pt-8 pb-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4 text-white">
          Get Featured in <span className="text-[#FFD84D]">Top Media</span> Outlets
        </h1>
        <p className="text-base sm:text-lg text-white/90">
          Join thousands of experts connecting with journalists at top publications.
        </p>
      </div>

      {/* Left: Hero Panel - Desktop only */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 px-12 xl:px-16">
        <div className="max-w-2xl w-full">
          <h1 className="text-5xl xl:text-6xl font-extrabold leading-tight mb-8 text-white" style={{letterSpacing: '-0.01em'}}>
            Get Featured in <span className="text-[#FFD84D]">Top Media</span> Outlets
          </h1>
          <p className="mb-12 text-xl xl:text-2xl max-w-xl text-white/90">
            Join thousands of experts connecting with journalists at <span className="font-semibold">Forbes</span>, <span className="font-semibold">Bloomberg</span>, <span className="font-semibold">TechCrunch</span>, and more.
          </p>
          <ul className="space-y-8 xl:space-y-10 text-base xl:text-lg">
            <li className="flex items-start gap-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white/10 border border-white/20 flex-shrink-0">
                <svg width="28" height="28" fill="none" stroke="#C7BFFF" strokeWidth="2" className=""><circle cx="14" cy="14" r="10" strokeDasharray="2 2" /><path d="M14 8v6l4 2" stroke="#C7BFFF"/></svg>
              </span>
              <span>
                <span className="font-semibold text-white">Bid on Premium Opportunities</span>
                <br />
                <span className="text-sm xl:text-base text-white/70">Set your price and only pay when published</span>
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white/10 border border-white/20 flex-shrink-0">
                <svg width="28" height="28" fill="none" stroke="#C7BFFF" strokeWidth="2" className=""><circle cx="14" cy="14" r="10" strokeDasharray="2 2" /><path d="M10 10l8 8M18 10l-8 8" stroke="#C7BFFF"/></svg>
              </span>
              <span>
                <span className="font-semibold text-white">AI-Powered Voice Pitches</span>
                <br />
                <span className="text-sm xl:text-base text-white/70">Record a pitch – we transcribe & attach it automatically</span>
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white/10 border border-white/20 flex-shrink-0">
                <svg width="28" height="28" fill="none" stroke="#C7BFFF" strokeWidth="2" className=""><circle cx="14" cy="14" r="10" strokeDasharray="2 2" /><path d="M14 8v6l4 2" stroke="#C7BFFF"/></svg>
              </span>
              <span>
                <span className="font-semibold text-white">Verified Media Requests</span>
                <br />
                <span className="text-sm xl:text-base text-white/70">Every opportunity vetted by our editorial team</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Right: Signup Card */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 min-h-[80vh] px-4 py-8 lg:px-8 xl:px-12">
        <SignupCard className="w-full max-w-[480px] lg:max-w-[600px] xl:max-w-[700px] flex flex-col gap-6 lg:gap-8 min-h-[320px] rounded-2xl bg-white px-6 sm:px-8 lg:px-10 xl:px-12 py-8 lg:py-10 shadow-2xl">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 bg-gradient-to-r from-[#5B6EE1] to-[#7C3AED] bg-clip-text text-transparent">Join QuoteBid</h2>
            <p className="text-gray-500 text-base lg:text-lg">Start connecting with top journalists today</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
              <Field error={errors.fullName} className="col-span-1">
                <input 
                  name="fullName" 
                  value={form.fullName} 
                  onChange={handleChange} 
                  placeholder="Full Name" 
                  className="rounded-xl border border-gray-200 px-5 py-3.5 lg:py-4 w-full text-base lg:text-lg transition-all hover:border-gray-300 focus:border-[#7B5FFF] focus:ring-2 focus:ring-[#7B5FFF]/20" 
                  style={{background: '#f7f6fd'}} 
                />
              </Field>
              <Field error={errors.username} className="col-span-1">
                <input
                  name="username"
                  value={form.username}
                  onChange={e => {
                    // Prevent uppercase and spaces
                    const value = e.target.value.replace(/[^a-z0-9_-]/g, '').toLowerCase();
                    setForm(f => ({ ...f, username: value }));
                  }}
                  onBlur={() => handleBlur('username')}
                  placeholder="Username"
                  className="rounded-xl border border-gray-200 px-5 py-3.5 lg:py-4 w-full text-base lg:text-lg transition-all hover:border-gray-300 focus:border-[#7B5FFF] focus:ring-2 focus:ring-[#7B5FFF]/20"
                  style={{background: '#f7f6fd'}}
                />
                <div className="h-4 mt-1">
                  {usernameChecking && <div className="text-xs text-gray-400">Checking username...</div>}
                  {!usernameChecking && !usernameUnique && <div className="text-xs text-red-500">Username is already taken.</div>}
                </div>
              </Field>
              <Field error={errors.email} className="col-span-1">
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur('email')}
                  placeholder="Email"
                  className="rounded-xl border border-gray-200 px-5 py-3.5 lg:py-4 w-full text-base lg:text-lg transition-all hover:border-gray-300 focus:border-[#7B5FFF] focus:ring-2 focus:ring-[#7B5FFF]/20"
                  style={{background: '#f7f6fd'}}
                />
                <div className="h-4 mt-1">
                  {emailChecking && <div className="text-xs text-gray-400">Checking email...</div>}
                  {!emailChecking && !emailValid && <div className="text-xs text-red-500">Please enter a valid email address.</div>}
                  {!emailChecking && emailValid && !emailUnique && <div className="text-xs text-red-500">Email is already in use.</div>}
                </div>
              </Field>
              <Field error={errors.companyName} className="col-span-1">
                <input 
                  name="companyName" 
                  value={form.companyName} 
                  onChange={handleChange} 
                  placeholder="Company Name" 
                  className="rounded-xl border border-gray-200 px-5 py-3.5 lg:py-4 w-full text-base lg:text-lg transition-all hover:border-gray-300 focus:border-[#7B5FFF] focus:ring-2 focus:ring-[#7B5FFF]/20" 
                  style={{background: '#f7f6fd'}} 
                />
              </Field>
              <Field error={errors.phone} className="col-span-1 sm:col-span-2">
                <div className="flex gap-3">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="rounded-xl border border-gray-200 px-2 py-3.5 lg:py-4 w-20 lg:w-24 text-base lg:text-lg transition-all hover:border-gray-300 focus:border-[#7B5FFF] focus:ring-2 focus:ring-[#7B5FFF]/20"
                    style={{ background: '#f7f6fd' }}
                  >
                    {COUNTRY_CODES.map(({ code, country, flag }) => (
                      <option key={code} value={code}>
                        {flag} {code}
                      </option>
                    ))}
                  </select>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={() => handleBlur('phone')}
                    placeholder="Phone number"
                    className="rounded-xl border border-gray-200 px-5 py-3.5 lg:py-4 w-full text-base lg:text-lg transition-all hover:border-gray-300 focus:border-[#7B5FFF] focus:ring-2 focus:ring-[#7B5FFF]/20"
                    style={{ background: '#f7f6fd' }}
                    required
                  />
                </div>
                <div className="h-4 mt-1">
                  {phoneChecking && <div className="text-xs text-gray-400">Checking phone number...</div>}
                  {!phoneChecking && !phoneValid && <div className="text-xs text-red-500">Please enter a valid phone number.</div>}
                  {!phoneChecking && phoneValid && !phoneUnique && <div className="text-xs text-red-500">Phone number is already in use.</div>}
                </div>
              </Field>
              <Field error={errors.industry} className="col-span-1 sm:col-span-2">
                <div className="relative">
                  <select
                    name="industry"
                    value={form.industry}
                    onChange={handleChange}
                    className="w-full rounded-xl px-5 py-3.5 lg:py-4 text-base lg:text-lg font-medium text-[#2d3142] bg-[#f7f6fd] border border-[#eceaf6] transition-all hover:border-gray-300 focus:border-[#7B5FFF] focus:ring-2 focus:ring-[#7B5FFF]/20 appearance-none"
                    style={{ boxShadow: 'none', outline: 'none' }}
                  >
                    <option value="" disabled>Select your industry</option>
                    {INDUSTRY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#2d3142]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </Field>
              <Field error={errors.password} className="col-span-1">
                <input 
                  name="password" 
                  type="password" 
                  value={form.password} 
                  onChange={handleChange} 
                  placeholder="Create password" 
                  className="rounded-xl border border-gray-200 px-5 py-3.5 lg:py-4 w-full text-base lg:text-lg transition-all hover:border-gray-300 focus:border-[#7B5FFF] focus:ring-2 focus:ring-[#7B5FFF]/20" 
                  style={{background: '#f7f6fd'}} 
                />
                <div className="h-4 mt-1">
                  {form.password && form.password.length < 8 && <div className="text-xs text-red-500">Password must be at least 8 characters.</div>}
                </div>
              </Field>
              <Field error={errors.confirmPassword} className="col-span-1">
                <input 
                  name="confirmPassword" 
                  type="password" 
                  value={form.confirmPassword} 
                  onChange={handleChange} 
                  placeholder="Confirm password" 
                  className="rounded-xl border border-gray-200 px-5 py-3.5 lg:py-4 w-full text-base lg:text-lg transition-all hover:border-gray-300 focus:border-[#7B5FFF] focus:ring-2 focus:ring-[#7B5FFF]/20" 
                  style={{background: '#f7f6fd'}} 
                />
                <div className="h-4 mt-1">
                  {form.confirmPassword && !passwordsMatch && <div className="text-xs text-red-500">Passwords do not match.</div>}
                </div>
              </Field>
            </div>
            
            <div className="flex items-center mt-6 mb-6">
              <input 
                type="checkbox" 
                name="agreeTerms" 
                checked={form.agreeTerms} 
                onChange={handleChange} 
                className="accent-[#7B5FFF] w-5 h-5 border-2 border-[#D1D5DB] rounded transition-all duration-150 mr-3 outline-none focus:outline-none cursor-pointer" 
                required 
              />
              <label htmlFor="terms" className="text-base lg:text-lg font-medium text-gray-700 select-none cursor-pointer">
                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#7B5FFF] underline font-semibold hover:text-[#6B4FEF] transition-colors">Terms of Service</a>
              </label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full py-4 lg:py-5 text-lg lg:text-xl font-semibold rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:opacity-90 flex items-center justify-center gap-2 shadow-xl transition-all hover:shadow-2xl" 
              disabled={!isFormComplete}
            >
              Create Account
            </Button>
          </form>
        </SignupCard>
      </div>
    </div>
  );
}
