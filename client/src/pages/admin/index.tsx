import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Redirect } from "wouter";
import { Shield, Users, Newspaper, Briefcase, MessageSquare, DollarSign } from "lucide-react";
import OpportunitiesManager from "./opportunities-manager";
import PitchesManager from "./pitches-manager";
import PublicationsManager from "./publications-manager";
import UsersManager from "./users-manager";
import BillingManager from "./billing-manager";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("opportunities");
  
  // Check if user is an admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["/api/admin/check"],
    // If this query fails with 403, it means the user is not an admin
    retry: false,
    enabled: !!user,
  });
  
  // If user is not logged in, redirect to login
  if (!user) {
    return <Redirect to="/auth?tab=login&returnPath=/admin" />;
  }
  
  // Show loading state while checking admin status
  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  // If user is not an admin, show unauthorized message
  if (!isAdmin) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <Shield className="mr-2" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to access the admin dashboard.</p>
            <p className="mt-2">
              Please contact an administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Shield className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="opportunities" className="flex items-center">
            <Briefcase className="mr-2 h-4 w-4" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="pitches" className="flex items-center">
            <MessageSquare className="mr-2 h-4 w-4" />
            Pitches
          </TabsTrigger>
          <TabsTrigger value="publications" className="flex items-center">
            <Newspaper className="mr-2 h-4 w-4" />
            Publications
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center">
            <DollarSign className="mr-2 h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="opportunities" className="space-y-4">
          <OpportunitiesManager />
        </TabsContent>
        
        <TabsContent value="pitches" className="space-y-4">
          <PitchesManager />
        </TabsContent>
        
        <TabsContent value="publications" className="space-y-4">
          <PublicationsManager />
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <UsersManager />
        </TabsContent>
        
        <TabsContent value="billing" className="space-y-4">
          <BillingManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}