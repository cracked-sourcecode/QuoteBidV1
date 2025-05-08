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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-lg p-8">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-qpurple font-bold text-3xl tracking-tight mr-2">
              <span>Quote</span><span className="font-extrabold">Bid</span>
            </span>
            <span className="text-gray-600 font-medium text-sm border-l border-gray-300 pl-2">
              {activeTab === "register" ? "Sign Up" : "Log In"}
            </span>
          </Link>
          <p className="mt-2 text-gray-600">Connect with top media outlets</p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="register" onClick={() => navigate("/auth?tab=register")}>Sign Up</TabsTrigger>
            <TabsTrigger value="login" onClick={() => navigate("/auth?tab=login")}>Log In</TabsTrigger>
          </TabsList>
          <TabsContent value="register">
            <RegisterForm />
          </TabsContent>
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
        </Tabs>
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
      username: "",
      password: "",
      passwordConfirm: "",
      companyName: "",
      phone: "",
      industry: "",
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
        <FormField control={form.control} name="username" render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl><Input type="password" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="passwordConfirm" render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm Password</FormLabel>
            <FormControl><Input type="password" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="companyName" render={({ field }) => (
          <FormItem>
            <FormLabel>Company Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Phone</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="industry" render={({ field }) => (
          <FormItem>
            <FormLabel>Industry</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
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
        <FormField control={form.control} name="agreeTerms" render={({ field }) => (
          <FormItem>
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel>I agree to the terms and conditions</FormLabel>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Registering..." : "Sign Up"}
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
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
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