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

// Extended schema for registration with password confirmation
const registerSchema = insertUserSchema.extend({
  passwordConfirm: z.string(),
  companyName: z.string().min(1, {
    message: "Company name is required",
  }),
  phone: z.string().optional(),
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
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get("tab") || "signup";
  const step = urlParams.get("step");

  // Helper to update the step in the URL
  const goToStep = (stepNum: number) => {
    urlParams.set("tab", "signup");
    urlParams.set("step", String(stepNum));
    navigate(`/auth?${urlParams.toString()}`);
  };

  // If step param is present, show the wizard
  if (tab === "signup" && step) {
    if (step === "1") return <AgreementStep onComplete={() => goToStep(2)} />;
    if (step === "2") return <PaymentStep onComplete={() => goToStep(3)} />;
    if (step === "3") return <ProfileStep onComplete={() => navigate("/dashboard")} />;
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="register" onClick={() => navigate("/auth?tab=register")}>Sign Up</TabsTrigger>
              <TabsTrigger value="login" onClick={() => navigate("/auth?tab=login")}>Login</TabsTrigger>
            </TabsList>
            <TabsContent value="register">
              <div>
                <h2 className="text-2xl font-bold mb-2 text-center">Create Your Account</h2>
                <p className="text-gray-600 text-center mb-6">Say goodbye to PR agencies — and the friction, hassle, and inconsistent results. No retainers, no fixed fees — just direct access to coverage opportunities. Bid freely, pay only for the placements you win, and take full control of your PR.</p>
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
  const [loading, setLoading] = useState(false);

  async function onSubmit(values: RegisterFormValues) {
    setLoading(true);
    try {
      await registerMutation.mutateAsync(values);
      toast({ title: "Registration successful!", description: "You can now log in." });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <FormControl><Input placeholder="johndoe" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl>
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
            <FormLabel>Phone Number (Optional)</FormLabel>
            <FormControl><Input placeholder="(555) 123-4567" {...field} /></FormControl>
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
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="passwordConfirm" render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Confirm Password</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
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