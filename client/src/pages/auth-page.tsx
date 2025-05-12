import { useState, useEffect } from "react";
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
import { AgreementStep } from "@/components/signup/AgreementStep";
import { PaymentStep } from "@/components/signup/PaymentStep";
import { ProfileStep } from "@/components/signup/ProfileStep";
import { storeSignupEmail, storeSignupData } from "@/lib/signup-wizard";
import { SignupWizardProvider } from "@/contexts/SignupWizardContext";
import { SignupWizard } from "@/components/signup/SignupWizard";
import validator from "validator";
import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";
import { useRef } from "react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

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

export default function AuthPage() {
  const [location, navigate] = useLocation();

  // Add this state to force re-render on URL change
  const [search, setSearch] = useState(window.location.search);

  useEffect(() => {
    const onPopState = () => setSearch(window.location.search);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Also update search when navigate is called
  useEffect(() => {
    setSearch(window.location.search);
  }, [location]);

  // Parse query params from the actual browser location (now from state)
  const urlParams = new URLSearchParams(search);
  const tab = (urlParams.get("tab") || "register").trim().toLowerCase();
  const step = urlParams.get("step");

  // Giant debug log at the top
  console.log("AUTH PAGE RENDER", { location, windowLocation: window.location.href });

  // Giant debug log before the wizard block
  console.log("CHECKING WIZARD BLOCK", { 
    tab, 
    step, 
    typeOfTab: typeof tab, 
    typeOfStep: typeof step, 
    tabEqualsSignup: tab === "signup", 
    stepTruthy: !!step,
    location,
    urlParams: window.location.search
  });

  // Helper to update the step in the URL
  const goToStep = (stepNum: number) => {
    window.location.href = `/auth?tab=signup&step=${stepNum}`;
  };

  if (tab === "signup" && step) {
    return (
      <SignupWizardProvider>
        <SignupWizard>
          {step === "1" && <AgreementStep onComplete={() => goToStep(2)} />}
          {step === "2" && <PaymentStep onComplete={() => goToStep(3)} />}
          {step === "3" && <ProfileStep onComplete={() => navigate("/dashboard")} />}
        </SignupWizard>
      </SignupWizardProvider>
    );
  }

  // Otherwise, show the classic tabbed UI
  const [activeTab, setActiveTab] = useState(tab === "login" ? "login" : "register");

  useEffect(() => {
    setActiveTab(tab === "login" ? "login" : "register");
  }, [tab]);

  return (
    <div className="min-h-screen flex">
      {/* Left: Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white px-8 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-block">
              <span className="text-qpurple font-bold text-3xl tracking-tight mr-2">
                <span>Quote</span><span className="font-extrabold">Bid</span>
              </span>
              <span className="text-gray-600 font-medium text-sm border-l border-gray-300 pl-2">
                {activeTab === "register" ? "Sign Up" : "Login"}
              </span>
            </Link>
            <p className="mt-2 text-gray-600">Connect with top media outlets</p>
          </div>
          {activeTab === "register" && (
            <h2 className="text-2xl font-bold mb-4 text-center">Create Your Account</h2>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="register" onClick={() => navigate("/auth?tab=register")}>Sign Up</TabsTrigger>
              <TabsTrigger value="login" onClick={() => navigate("/auth?tab=login")}>Login</TabsTrigger>
            </TabsList>
            <TabsContent value="register">
              <div>
                <RegisterForm />
              </div>
            </TabsContent>
            <TabsContent value="login">
              <div>
                <h2 className="text-2xl font-bold mb-2 text-center">Welcome Back</h2>
                <p className="text-gray-600 text-center mb-6">Log in to access your account and media opportunities</p>
                <LoginForm />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {/* Right: Blue Marketing Panel */}
      <div className="hidden md:flex flex-col justify-center items-center flex-1 bg-[#0A3976] text-white px-12">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold mb-4">Get Featured in Top Media Outlets</h2>
          <p className="mb-8 text-lg">Join our marketplace and connect with journalists from leading publications like Forbes, Business Insider, and more.</p>
          <ul className="space-y-6">
            <li className="flex items-start">
              <span className="mr-3 mt-1"><CheckCircleIcon /></span>
              <div>
                <span className="font-semibold">Bid on Opportunities</span>
                <div className="text-white/80 text-sm">Set your price and only pay if your quote is published.</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1"><CheckCircleIcon /></span>
              <div>
                <span className="font-semibold">AI-Powered Voice Pitches</span>
                <div className="text-white/80 text-sm">Record your pitch with our AI transcription technology.</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1"><CheckCircleIcon /></span>
              <div>
                <span className="font-semibold">Verified Media Requests</span>
                <div className="text-white/80 text-sm">All opportunities are verified by our editorial team.</div>
              </div>
            </li>
          </ul>
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
  const [unique, setUnique] = useState<Record<UniqueKey, null | boolean>>({
    username: null,
    email: null,
    phone: null,
  });
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
  const usernameRegex = /^[a-z0-9_]{4,30}$/;
  const strongPwd = /^(?=.*\d)(?=.*[!@#$%^&*])[\S]{8,}$/;

  // Format validation
  function validateField(name: string, value: string, passwordValue?: string) {
    switch (name) {
      case "username":
        if (!usernameRegex.test(value))
          return "Username must be 4-30 chars, lower-case, and only a-z, 0-9, _.";
        return "";
      case "email":
        if (!validator.isEmail(value))
          return "Enter a valid email address.";
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
        fetch(`/api/users/check-unique?field=${field}&value=${encodeURIComponent(value)}`)
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
      storeSignupData(values);
      storeSignupEmail(values.email);
      window.location.href = "/auth?tab=signup&step=1";
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
        className="space-y-4"
      >
        <div className="flex space-x-2">
          <FormField control={form.control} name="fullName" render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Full Name</FormLabel>
              <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="username" render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder="johndoe"
                  {...field}
                  onChange={e => field.onChange(e.target.value.toLowerCase())}
                />
              </FormControl>
              {/* Show format error if present, else uniqueness error */}
              {formatErrors.username ? (
                <div className="text-red-500 text-xs mt-1">{formatErrors.username}</div>
              ) : uniqueError.username ? (
                <div className="text-red-500 text-xs mt-1">{uniqueError.username}</div>
              ) : null}
              {pending.username && <div className="text-xs text-gray-500 mt-1">Checking…</div>}
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl>
            {/* Show format error if present, else uniqueness error */}
            {formatErrors.email ? (
              <div className="text-red-500 text-xs mt-1">{formatErrors.email}</div>
            ) : uniqueError.email ? (
              <div className="text-red-500 text-xs mt-1">{uniqueError.email}</div>
            ) : null}
            {pending.email && <div className="text-xs text-gray-500 mt-1">Checking…</div>}
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="companyName" render={({ field }) => (
          <FormItem>
            <FormLabel>Company Name</FormLabel>
            <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl>
              <PhoneInput
                country={'us'}
                value={field.value}
                onChange={value => {
                  // Parse and store E.164 format
                  const phoneNumber = parsePhoneNumberFromString('+' + value);
                  form.setValue('phone', phoneNumber ? phoneNumber.number : '+' + value);
                }}
                inputProps={{
                  name: 'phone',
                  required: true,
                  autoFocus: false,
                  autoComplete: 'tel',
                  placeholder: 'Enter your phone number'
                }}
                containerClass="w-full"
                inputClass="w-full"
                buttonClass="border-r-0"
                dropdownClass="z-50"
              />
            </FormControl>
            <div className="text-gray-500 text-xs mt-1">Select a country code and enter a phone number.</div>
            {/* Show format error if present, else uniqueness error */}
            {formatErrors.phone ? (
              <div className="text-red-500 text-xs mt-1">{formatErrors.phone}</div>
            ) : uniqueError.phone ? (
              <div className="text-red-500 text-xs mt-1">{uniqueError.phone}</div>
            ) : null}
            {pending.phone && <div className="text-xs text-gray-500 mt-1">Checking…</div>}
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="industry" render={({ field }) => (
          <FormItem>
            <FormLabel>Industry<span className="text-red-500">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
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
        <div className="flex space-x-2">
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Password</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              {/* Show format error if present */}
              {formatErrors.password && <div className="text-red-500 text-xs mt-1">{formatErrors.password}</div>}
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="passwordConfirm" render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Confirm Password</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              {/* Show format error if present */}
              {formatErrors.passwordConfirm && <div className="text-red-500 text-xs mt-1">{formatErrors.passwordConfirm}</div>}
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="agreeTerms" render={({ field }) => (
          <FormItem>
            <div className="flex items-center space-x-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel>I agree to the <a href="#" className="underline">terms and conditions</a></FormLabel>
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
        {/* At the bottom of the form, show a generic message if the button is disabled and there are no visible errors */}
        {!canSubmit && !Object.values(formatErrors).some(Boolean) && !Object.values(uniqueError).some(Boolean) && !anyPending && (
          <div className="text-red-500 text-xs text-center mt-2">Please check all fields and try again.</div>
        )}
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