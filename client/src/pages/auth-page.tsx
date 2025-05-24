import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { INDUSTRY_OPTIONS } from "../lib/constants";
import { PaymentStep } from "@/components/signup/PaymentStep";
import { ProfileStep } from "@/components/signup/ProfileStep";
import { storeSignupEmail, storeSignupData, getSignupData } from "@/lib/signup-wizard";
import { post } from "@/lib/api";
import { SignupWizardProvider } from "@/contexts/SignupWizardContext";
import { SignupWizard } from "@/components/signup/SignupWizard";
import validator from "validator";
import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";
import { useRef } from "react";
import PhoneInput from 'react-phone-input-2';
import { Check, Sparkles, Mic, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Extended schema for registration with password confirmation
const registerSchema = insertUserSchema.extend({
  passwordConfirm: z.string(),
  companyName: z.string().min(1, {
    message: "Company name is required",
  }),
  phone: z.string().min(1, {
    message: "Phone number is required",
  }),
  industry: z.string().min(1, {
    message: "Industry is required",
  }),
  agreeTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
}).refine(data => data.password === data.passwordConfirm, {
  message: "Passwords do not match",
  path: ["passwordConfirm"],
});

// Login schema is simpler
const loginSchema = z.object({
  username: z.string().min(1, {
    message: "Username is required",
  }),
  password: z.string().min(1, {
    message: "Password is required",
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;

type FieldKey = "username" | "email" | "phone" | "password" | "passwordConfirm";
type UniqueKey = "username" | "email" | "phone";

function CheckCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="14" fill="#234B7A" />
      <path d="M9 14.5L12.5 18L19 11" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function QuoteBidSignUp() {
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    company: "",
    phone: "",
    industry: "",
    password: "",
    confirm: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Uniqueness state
  const [unique, setUnique] = useState<{ username: boolean | null, email: boolean | null, phone: boolean | null }>({ username: null, email: null, phone: null });
  const [uniqueError, setUniqueError] = useState({ username: '', email: '', phone: '' });
  const [pending, setPending] = useState({ username: false, email: false, phone: false });
  const lastChecked = useRef({ username: '', email: '', phone: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    let field = e.target.name as 'username' | 'email' | 'phone';
    // Special handling for phone: always store and check normalized E.164
    if (field === 'phone') {
      const parsed = parsePhoneNumberFromString(value, 'US');
      if (parsed && parsed.isValid()) {
        value = parsed.number; // E.164 format
      }
      setForm((f) => ({ ...f, [field]: value }));
      setUniqueError((err) => ({ ...err, [field]: '' }));
      if (value && value !== lastChecked.current[field]) {
        setPending((p) => ({ ...p, [field]: true }));
        fetch(`/api/users/check-unique?field=phone&value=${encodeURIComponent(value)}`)
          .then((res) => res.json())
          .then((data) => {
            setUnique((u) => ({ ...u, [field]: data.unique }));
            setUniqueError((err) => ({ ...err, [field]: data.unique ? '' : 'Phone already exists.' }));
            lastChecked.current[field] = value;
          })
          .catch(() => {
            setUnique((u) => ({ ...u, [field]: false }));
            setUniqueError((err) => ({ ...err, [field]: 'Error checking uniqueness.' }));
          })
          .finally(() => setPending((p) => ({ ...p, [field]: false })));
      }
      return;
    }
    setForm((f) => ({ ...f, [field]: value }));
    if (["username", "email"].includes(field)) {
      setUniqueError((err) => ({ ...err, [field]: '' }));
      if (value && value !== lastChecked.current[field]) {
        setPending((p) => ({ ...p, [field]: true }));
        fetch(`/api/users/check-unique?field=${field}&value=${encodeURIComponent(value)}`)
          .then((res) => res.json())
          .then((data) => {
            setUnique((u) => ({ ...u, [field]: data.unique }));
            setUniqueError((err) => ({ ...err, [field]: data.unique ? '' : `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.` }));
            lastChecked.current[field] = value;
          })
          .catch(() => {
            setUnique((u) => ({ ...u, [field]: false }));
            setUniqueError((err) => ({ ...err, [field]: 'Error checking uniqueness.' }));
          })
          .finally(() => setPending((p) => ({ ...p, [field]: false })));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTermsError('');
    if (!agreedToTerms) {
      setTermsError('You must agree to the Terms of Service.');
      return;
    }
    // Block submission if phone is not valid
    if (!isValidPhoneNumber(form.phone)) {
      setUniqueError((err) => ({ ...err, phone: 'Enter a valid phone number.' }));
      setError('Please fix the errors above before submitting.');
      return;
    }
    // Block submission if any uniqueness check is pending or failed
    if (pending.username || pending.email || pending.phone || unique.username === false || unique.email === false || unique.phone === false) {
      setUniqueError((err) => ({
        ...err,
        username: unique.username === false ? 'Username already exists.' : err.username,
        email: unique.email === false ? 'Email already exists.' : err.email,
        phone: unique.phone === false ? 'Phone already exists.' : err.phone,
      }));
      setError('Please fix the errors above before submitting.');
      return;
    }
    if (form.password !== form.confirm) {
      return setError("Passwords do not match");
    }
    if (!form.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          phone: form.phone,
          password: form.password,
          name: form.fullName.trim() || form.username,
          hasAgreedToTerms: true
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Signup failed");
      const { step } = await res.json();
      window.location.href = `/signup-wizard?step=${step}`;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Full-screen gradient background, card sits on top
  return (
    <div
      className="min-h-screen w-full flex"
      style={{
        fontFamily: 'Inter, sans-serif',
        background:
          'linear-gradient(90deg, rgba(30, 22, 60, 0.55) 0%, rgba(0,0,0,0) 40%),' +
          'radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%),' +
          'radial-gradient(ellipse at 100% 100%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 70%),' +
          'linear-gradient(135deg, #3B267A 0%, #4B2CA0 40%, #6B3FC9 80%, #A084E8 100%)'
      }}
    >
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
                <ArrowRight className="w-6 h-6 text-[#C7BFFF]" />
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
      {/* Right: Form Card */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 min-h-[80vh]">
        <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl px-12 py-5" style={{boxShadow: '0 8px 40px 0 rgba(80,63,205,0.10)'}}>
          <h2 className="text-4xl font-extrabold text-center mb-2 bg-gradient-to-r from-[#5B6EE1] to-[#7C3AED] bg-clip-text text-transparent" style={{letterSpacing: '-0.01em'}}>Join QuoteBid</h2>
          <p className="text-center text-gray-400 mb-8 text-base">Start connecting with top journalists today</p>
          {error && (
            <p className="mb-4 text-sm font-medium text-red-600 text-center">{error}</p>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                aria-label="Full Name"
                name="fullName"
                required
                placeholder="Full Name"
                className="rounded-xl border border-gray-200 px-5 py-4 focus:ring-2 focus:ring-[#7B5FFF] bg-[#F7F6FD] placeholder-gray-400 text-base w-full font-medium"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
              />
              <input
                aria-label="Username"
                name="username"
                required
                placeholder="Username"
                className="rounded-xl border border-gray-200 px-5 py-4 focus:ring-2 focus:ring-[#7B5FFF] bg-[#F7F6FD] placeholder-gray-400 text-base w-full font-medium"
                value={form.username}
                onChange={e => {
                  const lower = e.target.value.toLowerCase();
                  const syntheticEvent = {
                    ...e,
                    target: { ...e.target, value: lower, name: 'username' }
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleChange(syntheticEvent);
                }}
                autoComplete="username"
              />
              {uniqueError.username && (
                <div className="text-red-500 text-xs mt-0.5 col-span-2">{uniqueError.username}</div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                aria-label="Email"
                type="email"
                name="email"
                required
                placeholder="your@email.com"
                className="rounded-xl border border-gray-200 px-5 py-4 focus:ring-2 focus:ring-[#7B5FFF] bg-[#F7F6FD] placeholder-gray-400 text-base w-full font-medium"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
              <input
                aria-label="Company Name"
                name="company"
                placeholder="Company Name"
                className="rounded-xl border border-gray-200 px-5 py-4 focus:ring-2 focus:ring-[#7B5FFF] bg-[#F7F6FD] placeholder-gray-400 text-base w-full font-medium"
                value={form.company}
                onChange={handleChange}
                autoComplete="organization"
              />
              {uniqueError.email && (
                <div className="text-red-500 text-xs mt-0.5 col-span-2">{uniqueError.email}</div>
              )}
            </div>
            <div className="relative">
              <PhoneInput
                country={'us'}
                value={form.phone}
                onChange={phone => {
                  const phoneNumber = parsePhoneNumberFromString('+' + phone);
                  if (phoneNumber && phoneNumber.isValid()) {
                    setForm(f => ({ ...f, phone: phoneNumber.number }));
                    setUniqueError(err => ({ ...err, phone: '' }));
                    if (phoneNumber.number !== lastChecked.current.phone) {
                      setPending(p => ({ ...p, phone: true }));
                      fetch(`/api/users/check-unique?field=phone&value=${encodeURIComponent(phoneNumber.number)}`)
                        .then(res => res.json())
                        .then(data => {
                          setUnique(u => ({ ...u, phone: data.unique }));
                          setUniqueError(err => ({ ...err, phone: data.unique ? '' : 'Phone already exists.' }));
                          lastChecked.current.phone = phoneNumber.number;
                        })
                        .catch(() => {
                          setUnique(u => ({ ...u, phone: false }));
                          setUniqueError(err => ({ ...err, phone: 'Error checking uniqueness.' }));
                        })
                        .finally(() => setPending(p => ({ ...p, phone: false })));
                    }
                  }
                }}
                inputProps={{
                  name: 'phone',
                  required: true,
                  autoComplete: 'tel',
                  placeholder: 'Enter your phone number',
                  style: {
                    borderRadius: '0.75rem',
                    border: '1px solid #E5E7EB',
                    background: '#F7F6FD',
                    padding: '1rem 1.25rem',
                    fontSize: '1rem',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    color: '#222',
                    width: '100%',
                    outline: 'none',
                  },
                  className: 'focus:ring-2 focus:ring-[#7B5FFF] placeholder-gray-400',
                }}
                buttonStyle={{
                  border: 'none',
                  background: 'transparent',
                  paddingLeft: '0.5rem',
                  paddingRight: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%',
                }}
                containerStyle={{
                  width: '100%',
                  fontFamily: 'Inter, sans-serif',
                }}
                dropdownStyle={{
                  zIndex: 50,
                  fontFamily: 'Inter, sans-serif',
                }}
                inputClass=""
              />
            </div>
            {uniqueError.phone && (
              <div className="text-red-500 text-xs mt-0.5">{uniqueError.phone}</div>
            )}
            <select
              name="industry"
              required
              className="rounded-xl border border-gray-200 px-5 py-4 bg-[#F7F6FD] focus:ring-2 focus:ring-[#7B5FFF] text-gray-700 text-base w-full font-medium"
              value={form.industry}
              onChange={handleChange}
            >
              <option value="" disabled>
                Select your industry
              </option>
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input
                  aria-label="Password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  placeholder="Create Password"
                  className="rounded-xl border border-gray-200 px-5 py-4 focus:ring-2 focus:ring-[#7B5FFF] bg-[#F7F6FD] placeholder-gray-400 text-base w-full font-medium pr-12"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <input
                  aria-label="Confirm Password"
                  type={showConfirm ? "text" : "password"}
                  name="confirm"
                  required
                  placeholder="Confirm Password"
                  className="rounded-xl border border-gray-200 px-5 py-4 focus:ring-2 focus:ring-[#7B5FFF] bg-[#F7F6FD] placeholder-gray-400 text-base w-full font-medium pr-12"
                  value={form.confirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center mt-6 mb-4">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                className="accent-[#7B5FFF] w-5 h-5 border-4 border-[#D1D5DB] rounded-none transition-all duration-150 mr-3 outline-none focus:outline-none"
                required
              />
              <label htmlFor="terms" className="text-base font-medium text-gray-700 select-none">
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#7B5FFF] underline font-semibold">Terms of Service</a>
              </label>
            </div>
            {termsError && <div className="text-red-500 text-xs mb-2 font-medium">{termsError}</div>}
            <button
              type="submit"
              disabled={submitting || pending.username || pending.email || pending.phone || unique.username === false || unique.email === false || unique.phone === false || !agreedToTerms}
              className="w-full py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:opacity-90 flex items-center justify-center gap-2 shadow-xl"
              style={{boxShadow: "0 8px 32px 0 rgba(80, 63, 205, 0.13)"}}
            >
              {submitting ? "Creating Account…" : "Create Account"}
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </form>
          <p className="text-center text-sm mt-7 text-gray-400">
            Already have an account? <a href="/login" className="font-semibold text-[#3B82F6] hover:underline">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Registration Form Component
function RegisterForm() {
  const { toast } = useToast();
  const { registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      companyName: "",
      phone: "",
      industry: "",
      password: "",
      passwordConfirm: "",
      agreeTerms: false,
    },
  });
  // --- New validation state ---
  const [formatErrors, setFormatErrors] = useState<Record<FieldKey, string>>({
      username: "",
    email: "",
    phone: "",
      password: "",
    passwordConfirm: "",
  });
  const [unique, setUnique] = useState<{ username: boolean | null, email: boolean | null, phone: boolean | null }>({ username: null, email: null, phone: null });
  const [uniqueError, setUniqueError] = useState<Record<UniqueKey, string>>({
    username: "",
    email: "",
    phone: "",
  });
  const [pending, setPending] = useState<Record<UniqueKey, boolean>>({
    username: false,
    email: false,
    phone: false,
  });
  const lastChecked = useRef<Record<UniqueKey, string>>({ username: "", email: "", phone: "" });
  // --- End new validation state ---
  const [loading, setLoading] = useState(false);

  // Format validation helpers
  const usernameRegex = /^[a-z0-9]{4,30}$/;
  const strongPwd = /^(?=.*\d)(?=.*[!@#$%^&*])[\S]{8,}$/;

  // Format validation
  function validateField(name: string, value: string, passwordValue?: string) {
    switch (name) {
      case "username":
        if (!usernameRegex.test(value))
          return "Username must be 4-30 characters, lowercase letters and numbers only.";
        return "";
      case "email":
        if (!validator.isEmail(value))
          return "Enter a valid email address.";
        // Extra check: TLD must be only letters
        const tldMatch = value.match(/\.([a-zA-Z]+)$/);
        if (!tldMatch) return "Enter a valid email address.";
        if (!/^[a-zA-Z]{2,}$/.test(tldMatch[1])) return "Enter a valid email address.";
        return "";
      case "phone":
        if (!isValidPhoneNumber(value))
          return "Enter a valid phone number (E.164, e.g. +12125551212).";
        return "";
      case "password":
        if (!strongPwd.test(value))
          return "Password must be 8+ chars and include a number & special character.";
        return "";
      case "passwordConfirm":
        if (value !== passwordValue)
          return "Passwords do not match.";
        return "";
      default:
        return "";
    }
  }
      
  // Real-time format and uniqueness check
  useEffect(() => {
    const values = form.getValues();
    // Validate format
    const newFormatErrors = { ...formatErrors };
    (Object.keys(newFormatErrors) as FieldKey[]).forEach((key) => {
      newFormatErrors[key] = validateField(key, values[key], values.password);
    });
    setFormatErrors(newFormatErrors);
    // Uniqueness check for username/email/phone
    (["username", "email", "phone"] as UniqueKey[]).forEach((field) => {
      const value = values[field];
      if (
        !newFormatErrors[field] &&
        value &&
        value !== lastChecked.current[field]
      ) {
        setPending((p) => ({ ...p, [field]: true }));
        setUniqueError((e) => ({ ...e, [field]: "" }));
        apiFetch(`/api/users/check-unique?field=${field}&value=${encodeURIComponent(value)}`)
          .then((res) => res.json())
          .then((data) => {
            setUnique((u) => ({ ...u, [field]: data.unique }));
            setUniqueError((e) => ({ ...e, [field]: data.unique ? "" : `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.` }));
            lastChecked.current[field] = value;
          })
          .catch(() => {
            setUnique((u) => ({ ...u, [field]: false }));
            setUniqueError((e) => ({ ...e, [field]: "Error checking uniqueness." }));
          })
          .finally(() => setPending((p) => ({ ...p, [field]: false })));
      }
    });
    // eslint-disable-next-line
  }, [form.watch("username"), form.watch("email"), form.watch("phone"), form.watch("password"), form.watch("passwordConfirm")]);

  // Button enable logic
  const values = form.getValues();
  const allRequiredFilled = values.username && values.email && values.phone && values.password && values.passwordConfirm;
  const allFormatsValid = Object.values(formatErrors).every((e) => !e);
  const allUnique = Object.values(unique).every((v) => v !== false && v !== null);
  const anyPending = Object.values(pending).some((v) => v);
  const canSubmit = allRequiredFilled && allFormatsValid && allUnique && !anyPending;

  async function onSubmit(values: RegisterFormValues) {
    setLoading(true);
    try {
      // Block submission if any uniqueness check is pending or failed
      if (anyPending || !allUnique) {
        setLoading(false);
        setUniqueError((e) => ({
          ...e,
          username: unique.username === false ? 'Username already exists.' : e.username,
          email: unique.email === false ? 'Email already exists.' : e.email,
          phone: unique.phone === false ? 'Phone already exists.' : e.phone,
        }));
        return;
      }
      // Create user immediately
      const response = await apiRequest("POST", "/api/auth/signup/start", {
        email: values.email,
        password: values.password,
        username: values.username.toLowerCase(),
        name: values.fullName,
 um7klu-codex/fix-ui-connection-for-sign-up-form
        company: values.companyName,

        companyName: values.companyName,
new-signup-process
        phone: values.phone,
        industry: values.industry,
      });

      if (!response.ok) {
        const errorData = await response.json();
        // If backend returns a uniqueness error, show it inline
        if (errorData.field && ["username", "email", "phone"].includes(errorData.field)) {
          setUniqueError((e) => ({ ...e, [errorData.field]: errorData.message }));
        }
        throw new Error(errorData.message || "Registration failed");
      }

      // Store data for the wizard
      storeSignupData(values);
      storeSignupEmail(values.email);
      localStorage.setItem('signup_highest_step', '2');
um7klu-codex/fix-ui-connection-for-sign-up-form
      navigate("/signup-wizard?step=2", { replace: true });

      navigate("/auth?tab=signup&step=2", { replace: true });
new-signup-process
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form 
        onSubmit={e => {
          form.handleSubmit(onSubmit)(e);
        }} 
        className="space-y-6"
      >
        {/* Row 1: Full Name & Username */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="fullName" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Full Name</FormLabel>
              <FormControl><Input className="w-full" placeholder="John Doe" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="username" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Username</FormLabel>
              <FormControl>
                <Input className="w-full" placeholder="johndoe" {...field} onChange={e => field.onChange(e.target.value.toLowerCase())} />
              </FormControl>
              {formatErrors.username ? (
                <div className="text-red-500 text-xs mt-0.5">{formatErrors.username}</div>
              ) : uniqueError.username ? (
                <div className="text-red-500 text-xs mt-0.5">{uniqueError.username}</div>
              ) : null}
              {pending.username && <div className="text-xs text-gray-500 mt-0.5">Checking…</div>}
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Row 2: Email & Company Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Email</FormLabel>
              <FormControl><Input className="w-full" placeholder="john.doe@example.com" {...field} /></FormControl>
              {formatErrors.email ? (
                <div className="text-red-500 text-xs mt-0.5">{formatErrors.email}</div>
              ) : uniqueError.email ? (
                <div className="text-red-500 text-xs mt-0.5">{uniqueError.email}</div>
              ) : null}
              {pending.email && <div className="text-xs text-gray-500 mt-0.5">Checking…</div>}
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="companyName" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Company Name</FormLabel>
              <FormControl><Input className="w-full" placeholder="Acme Inc." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Row 3: Phone Number (full width) */}
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">Phone Number</FormLabel>
            <FormControl>
              <PhoneInput
                country={'us'}
                value={field.value}
                onChange={value => {
                  const phoneNumber = parsePhoneNumberFromString('+' + value);
                  form.setValue('phone', phoneNumber ? phoneNumber.number : '+' + value);
                }}
                inputProps={{
                  name: 'phone',
                  required: true,
                  autoComplete: 'tel',
                  placeholder: 'Enter your phone number',
                  style: {
                    borderRadius: '0.75rem',
                    border: '1px solid #E5E7EB',
                    background: '#F7F6FD',
                    padding: '1rem 1.25rem',
                    fontSize: '1rem',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    color: '#222',
                    width: '100%',
                    outline: 'none',
                  },
                  className: 'focus:ring-2 focus:ring-[#7B5FFF] placeholder-gray-400',
                }}
                buttonStyle={{
                  border: 'none',
                  background: 'transparent',
                  paddingLeft: '0.5rem',
                  paddingRight: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%',
                }}
                containerStyle={{
                  width: '100%',
                  fontFamily: 'Inter, sans-serif',
                }}
                dropdownStyle={{
                  zIndex: 50,
                  fontFamily: 'Inter, sans-serif',
                }}
                inputClass=""
              />
            </FormControl>
            {formatErrors.phone ? (
              <div className="text-red-500 text-xs mt-0.5">{formatErrors.phone}</div>
            ) : uniqueError.phone ? (
              <div className="text-red-500 text-xs mt-0.5">{uniqueError.phone}</div>
            ) : null}
            {pending.phone && <div className="text-xs text-gray-500 mt-0.5">Checking…</div>}
            <FormMessage />
          </FormItem>
        )} />

        {/* Row 4: Industry (full width) */}
        <FormField control={form.control} name="industry" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">Industry<span className="text-red-500">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Row 5: Password & Confirm Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Password</FormLabel>
              <FormControl><Input className="w-full" type="password" {...field} /></FormControl>
              {formatErrors.password && <div className="text-red-500 text-xs mt-0.5">{formatErrors.password}</div>}
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="passwordConfirm" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Confirm Password</FormLabel>
              <FormControl><Input className="w-full" type="password" {...field} /></FormControl>
              {formatErrors.passwordConfirm && <div className="text-red-500 text-xs mt-0.5">{formatErrors.passwordConfirm}</div>}
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Terms and Submit - Full Width */}
        <div className="space-y-3">
          <FormField control={form.control} name="agreeTerms" render={({ field }) => (
            <FormItem>
              <div className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm">I agree to the <a href="#" className="underline">terms and conditions</a></FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )} />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!canSubmit || loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
          {!canSubmit && !Object.values(formatErrors).some(Boolean) && !Object.values(uniqueError).some(Boolean) && !anyPending && (
            <div className="text-red-500 text-xs text-center">Please check all fields and try again.</div>
          )}
        </div>
      </form>
    </Form>
  );
}

// Login Form Component
function LoginForm() {
  const { toast } = useToast();
  const { loginMutation } = useAuth();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(values: LoginFormValues) {
    setLoading(true);
    try {
      await loginMutation.mutateAsync(values);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="username" render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl><Input placeholder="johndoe" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <div className="flex justify-between items-center mb-1">
              <FormLabel>Password</FormLabel>
              <a href="#" className="text-sm text-blue-700 hover:underline">Forgot password?</a>
            </div>
            <FormControl><Input type="password" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </Button>
      </form>
    </Form>
  );
}