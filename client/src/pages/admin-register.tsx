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
import { apiRequest } from "@/lib/queryClient";
import { useAdminAuth } from "@/hooks/use-admin-auth";

// Admin registration form schema with validation
const adminRegisterSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Valid email is required"),
  fullName: z.string().min(1, "Full name is required"),
  adminSecretKey: z.string().min(1, "Secret key is required")
});

type AdminRegisterValues = z.infer<typeof adminRegisterSchema>;

export default function AdminRegister() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { adminUser, isLoading } = useAdminAuth();
  
  // Check if user is already logged in and redirect to admin dashboard
  useEffect(() => {
    if (adminUser && !isLoading) {
      navigate("/admin");
    }
  }, [adminUser, isLoading, navigate]);
  
  const form = useForm<AdminRegisterValues>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      fullName: "",
      adminSecretKey: "",
    },
  });

  async function onSubmit(values: AdminRegisterValues) {
    setLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/admin/register", values);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to register admin");
      }
      
      toast({
        title: "Admin Registration Successful",
        description: "Your admin account has been created. You can now log in.",
      });
      
      navigate("/admin-login");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Registration</h1>
          <p className="text-sm text-gray-600">
            Create a new administrator account for QuoteBid
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Create Admin Account</CardTitle>
            <CardDescription className="text-center">
              This area is restricted. You must have the admin secret key.
              <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
                For testing, enter the environment variable ADMIN_SECRET_KEY
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Create a username" {...field} />
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
                        <Input type="password" placeholder="Create a secure password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="adminSecretKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Secret Key</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter admin secret key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Admin Account"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="link" onClick={() => navigate("/admin-login")}>
              Already have an admin account? Sign in
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}