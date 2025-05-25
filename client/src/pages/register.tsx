import React, { useRef, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import SignupCard from '@/components/SignupCard';
import Field from '@/components/FormFieldWrapper';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { INDUSTRY_OPTIONS } from '@/lib/constants';
import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';

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
      if (!phone || !isValidPhoneNumber(phone)) {
        setPhoneUnique(true);
        setPhoneChecking(false);
        setPhoneValid(false);
        return;
      }
      setPhoneValid(true);
      setPhoneChecking(true);
      try {
        const res = await fetch(`/api/users/check-unique?field=phone&value=${encodeURIComponent(phone)}`);
        const data = await res.json();
        setPhoneUnique(!!data.unique);
      } catch {
        setPhoneUnique(true); // fallback to allow
      }
      setPhoneChecking(false);
    }, 400),
    []
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
    if (!isValidPhoneNumber(form.phone)) errs.phone = 'Please enter a valid phone number.';
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
    if (field === 'phone' && (!form.phone || !isValidPhoneNumber(form.phone)) && !ruleToastOpen.current.phone) {
      ruleToastOpen.current.phone = true;
      toast({
        title: 'Phone requirements',
        description: 'Please enter a valid phone number.',
        variant: 'destructive',
        duration: 4000,
      });
      setTimeout(() => (ruleToastOpen.current.phone = false), 4000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(f => ({ ...f, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
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
            phone: form.phone,
            industry: form.industry,
            hasAgreedToTerms: form.agreeTerms,
          }),
        });
        if (res.ok) {
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
    form.agreeTerms;

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-[#3B267A] to-[#A084E8]">
      {/* Left: Hero Panel */}
      <div className="hidden lg:flex flex-col justify-center items-end w-1/2 px-2">
        <div className="max-w-xl w-full">
          <h1 className="text-6xl font-extrabold leading-tight mb-8 text-white" style={{letterSpacing: '-0.01em'}}>
            Get Featured in <span className="text-[#FFD84D]">Top Media</span> Outlets
          </h1>
          <p className="mb-12 text-xl max-w-xl text-white/90">
            Join thousands of experts connecting with journalists at <span className="font-semibold">Forbes</span>, <span className="font-semibold">Bloomberg</span>, <span className="font-semibold">TechCrunch</span>, and more.
          </p>
          <ul className="space-y-10 text-base">
            <li className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-white/10 border border-white/20">
                <svg width="28" height="28" fill="none" stroke="#C7BFFF" strokeWidth="2" className=""><circle cx="14" cy="14" r="10" strokeDasharray="2 2" /><path d="M14 8v6l4 2" stroke="#C7BFFF"/></svg>
              </span>
              <span>
                <span className="font-semibold text-white">Bid on Premium Opportunities</span>
                <br />
                <span className="text-sm text-white/70">Set your price and only pay when published</span>
              </span>
            </li>
            <li className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-white/10 border border-white/20">
                <svg width="28" height="28" fill="none" stroke="#C7BFFF" strokeWidth="2" className=""><circle cx="14" cy="14" r="10" strokeDasharray="2 2" /><path d="M10 10l8 8M18 10l-8 8" stroke="#C7BFFF"/></svg>
              </span>
              <span>
                <span className="font-semibold text-white">AI-Powered Voice Pitches</span>
                <br />
                <span className="text-sm text-white/70">Record a pitch – we transcribe & attach it automatically</span>
              </span>
            </li>
            <li className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-white/10 border border-white/20">
                <svg width="28" height="28" fill="none" stroke="#C7BFFF" strokeWidth="2" className=""><circle cx="14" cy="14" r="10" strokeDasharray="2 2" /><path d="M14 8v6l4 2" stroke="#C7BFFF"/></svg>
              </span>
              <span>
                <span className="font-semibold text-white">Verified Media Requests</span>
                <br />
                <span className="text-sm text-white/70">Every opportunity vetted by our editorial team</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
      {/* Right: Signup Card */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 min-h-[80vh]">
        <SignupCard className="w-[600px] max-w-full flex flex-col gap-6 min-h-[320px] rounded-xl bg-white px-8 py-6 shadow-lg">
          <h2 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-[#5B6EE1] to-[#7C3AED] bg-clip-text text-transparent">Join QuoteBid</h2>
          <p className="text-center text-gray-400 mb-6 text-base">Start connecting with top journalists today</p>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 w-full">
              <Field error={errors.fullName}>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Full Name" className="rounded-xl border border-gray-200 px-5 py-4" style={{background: '#f7f6fd'}} />
              </Field>
              <Field error={errors.username}>
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
                  className="rounded-xl border border-gray-200 px-5 py-4"
                  style={{background: '#f7f6fd'}}
                />
                {usernameChecking && <div className="text-xs text-gray-400 mt-1">Checking username...</div>}
                {!usernameChecking && !usernameUnique && <div className="text-xs text-red-500 mt-1">Username is already taken.</div>}
              </Field>
              <Field error={errors.email}>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur('email')}
                  placeholder="Email"
                  className="rounded-xl border border-gray-200 px-5 py-4"
                  style={{background: '#f7f6fd'}}
                />
                {emailChecking && <div className="text-xs text-gray-400 mt-1">Checking email...</div>}
                {!emailChecking && !emailValid && <div className="text-xs text-red-500 mt-1">Please enter a valid email address.</div>}
                {!emailChecking && emailValid && !emailUnique && <div className="text-xs text-red-500 mt-1">Email is already in use.</div>}
              </Field>
              <Field error={errors.companyName}>
                <input name="companyName" value={form.companyName} onChange={handleChange} placeholder="Company Name" className="rounded-xl border border-gray-200 px-5 py-4" style={{background: '#f7f6fd'}} />
              </Field>
              <Field error={errors.phone} className="col-span-2">
                <input
                  name="phone"
                  value={form.phone}
                  onChange={e => {
                    // Format as E.164 as the user types
                    let value = e.target.value.replace(/[^\d+]/g, '');
                    // Try to format if possible
                    const phoneObj = parsePhoneNumberFromString(value, 'US');
                    if (phoneObj) {
                      value = phoneObj.formatInternational();
                    }
                    setForm(f => ({ ...f, phone: value }));
                  }}
                  onBlur={() => handleBlur('phone')}
                  placeholder="Phone"
                  className="rounded-xl border border-gray-200 px-5 py-4"
                  style={{background: '#f7f6fd'}}
                />
                {phoneChecking && <div className="text-xs text-gray-400 mt-1">Checking phone number...</div>}
                {!phoneChecking && !phoneValid && <div className="text-xs text-red-500 mt-1">Please enter a valid phone number.</div>}
                {!phoneChecking && phoneValid && !phoneUnique && <div className="text-xs text-red-500 mt-1">Phone number is already in use.</div>}
              </Field>
              <Field error={errors.industry} className="col-span-2">
                <div className="relative">
                  <select
                    name="industry"
                    value={form.industry}
                    onChange={handleChange}
                    className="w-full rounded-xl px-5 py-4 text-base font-medium text-[#2d3142] bg-[#f7f6fd] border border-[#eceaf6] focus:ring-2 focus:ring-indigo-400 appearance-none"
                    style={{ boxShadow: 'none', outline: 'none' }}
                  >
                    <option value="" disabled>Select your industry</option>
                    {INDUSTRY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#2d3142]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </Field>
              <Field error={errors.password}>
                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create password" className="rounded-xl border border-gray-200 px-5 py-4" style={{background: '#f7f6fd'}} />
              </Field>
              <Field error={errors.confirmPassword}>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm password" className="rounded-xl border border-gray-200 px-5 py-4" style={{background: '#f7f6fd'}} />
              </Field>
            </div>
            <div className="flex items-center mt-6 mb-4">
              <input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={handleChange} className="accent-[#7B5FFF] w-5 h-5 border-4 border-[#D1D5DB] rounded-none transition-all duration-150 mr-3 outline-none focus:outline-none" required />
              <label htmlFor="terms" className="text-base font-medium text-gray-700 select-none">
                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#7B5FFF] underline font-semibold">Terms of Service</a>
              </label>
            </div>
            <Button type="submit" className="w-full py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:opacity-90 flex items-center justify-center gap-2 shadow-xl mt-2" disabled={!isFormComplete}>
              Create Account
            </Button>
          </form>
        </SignupCard>
      </div>
    </div>
  );
}
