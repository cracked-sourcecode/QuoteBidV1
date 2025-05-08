import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";

// Admin login form schema
const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export default function AdminLogin() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { adminUser, isLoading, adminLoginMutation } = useAdminAuth();
  
  // Check if user is already logged in and redirect to admin dashboard
  useEffect(() => {
    if (adminUser && !isLoading) {
      navigate("/admin");
    }
  }, [adminUser, isLoading, navigate]);
  
  const form = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: AdminLoginValues) {
    setLoading(true);
    
    try {
      await adminLoginMutation.mutateAsync(values);
      navigate("/admin"); // Redirect to admin dashboard on success
    } catch (error) {
      // Error is already handled in the mutation
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h1>
          <p className="text-sm text-gray-600">
            This area is restricted to authorized personnel only.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Admin Login</CardTitle>
            <CardDescription className="text-center">
              Sign in to access the administration dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter admin username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-3">
            <div className="mt-2 text-center">
              <span className="text-sm text-muted-foreground">
                Having admin login issues?{" "}
                <a href="/admin/create-admin" className="text-orange-600 underline underline-offset-4 hover:text-orange-800">
                  Create default admin
                </a>
                {" or "}
                <a href="/admin/login-test" className="text-blue-600 underline underline-offset-4 hover:text-blue-800">
                  Test admin login
                </a>
              </span>
            </div>
            <p className="text-xs text-gray-500">
              QuoteBid Admin Portal &copy; {new Date().getFullYear()} Rubicon PR Group
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}