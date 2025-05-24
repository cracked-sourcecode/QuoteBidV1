import { Switch, Route, Redirect, useLocation, Link } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Opportunities from "@/pages/opportunities";
import OpportunityDetail from "@/pages/opportunity-detail";
import MyPitches from "@/pages/my-pitches";
import PitchHistory from "@/pages/pitch-history";
import Subscribe from "@/pages/subscribe";
import Agreement from "@/pages/agreement";
import PaymentSuccess from "@/pages/payment-success"; 
import SubscriptionSuccess from "@/pages/subscription-success";
import SubscriptionRedirect from "@/pages/subscription-redirect";
import ProfileSetup from "@/pages/profile-setup";
import SignupWizard from "@/pages/SignupWizard";
import RegisterPage from "@/pages/register";
import AuthPage from "@/pages/auth-page";
import Account from "@/pages/account";
// Profile page removed as requested
import AdminLogin from "@/pages/admin-login";
import AdminRegister from "@/pages/admin-register";
import AdminLoginTest from "@/pages/admin/login-test";
import AdminCreateAdmin from "@/pages/admin/create-admin";
import Navbar from "@/components/navbar";
import AdminHeader from "@/components/admin-header";
import SubscriptionGuard from "@/components/subscription-guard";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/use-admin-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminProtectedRoute } from "@/lib/admin-protected-route";
import { useEffect, useState } from "react";
import AdminDashboard from "@/pages/admin/index";
import OpportunitiesManager from "@/pages/admin/opportunities-manager-new";
import UsersManager from "@/pages/admin/users-manager";
import Support from "@/pages/admin/support";
import AdminPitchesPage from "@/pages/admin/pitches";
import BillingManager from "@/pages/admin/billing-manager";
import CoverageManager from "@/pages/admin/coverage-manager";
import AgreementsViewer from "@/pages/admin/agreements-viewer";
import AdminAnalytics from "@/pages/admin/analytics";
import PublicationsManager from "@/pages/admin/publications-manager";

// Logout component to handle the regular user logout process
function LogoutHandler() {
  const [_, navigate] = useLocation();
  const { logoutMutation } = useAuth();
  
  useEffect(() => {
    const performLogout = async () => {
      try {
        await logoutMutation.mutateAsync();
        // Redirect to home page after logout instead of auth page
        navigate('/');
      } catch (error) {
        console.error("Logout failed:", error);
        // Still redirect to home page if logout fails
        navigate('/');
      }
    };
    
    // Call this only once
    performLogout();
  }, []); // Remove dependencies to prevent re-triggering
  
  return <div className="flex justify-center items-center h-screen">Logging out...</div>;
}

// Admin logout component to handle the admin user logout process
function AdminLogoutHandler() {
  const [_, navigate] = useLocation();
  const { adminLogoutMutation } = useAdminAuth();
  
  useEffect(() => {
    const performAdminLogout = async () => {
      try {
        await adminLogoutMutation.mutateAsync();
        navigate('/admin-login');
      } catch (error) {
        console.error("Admin logout failed:", error);
        navigate('/admin-login');
      }
    };
    
    // Call this only once
    performAdminLogout();
  }, []); // Remove dependencies to prevent re-triggering
  
  return <div className="flex justify-center items-center h-screen bg-gray-100">
    <div className="bg-white p-8 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-center">Logging out of admin account...</h1>
      <div className="flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    </div>
  </div>;
}

function Router() {
  return (
    <>
      <Switch>
        {/* Public routes - available to everyone */}
        <Route path="/">
          {() => {
            const { user } = useAuth();
            // Redirect logged-in users to opportunities page, otherwise show the home page
            if (user) {
              return <Redirect to="/opportunities" />;
            }
            return <Home />;
          }}
        </Route>
        <Route path="/auth">
          {({ location }: { location: string }) => <AuthPage key={location} />}
        </Route>
        <Route path="/logout" component={LogoutHandler} />
        <Route path="/admin-logout" component={AdminLogoutHandler} />
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/admin-register" component={AdminRegister} />
        <Route path="/admin/login-test" component={AdminLoginTest} />
        <Route path="/admin/create-admin" component={AdminCreateAdmin} />
        <Route path="/signup-wizard" component={SignupWizard} />
        <Route path="/register" component={RegisterPage} />
        
        {/* Routes that require authentication */}
        <ProtectedRoute path="/agreement" component={() => <Agreement />} />
        <ProtectedRoute path="/subscribe" component={() => <Subscribe />} />
        <ProtectedRoute path="/payment-success" component={() => <PaymentSuccess />} />
        <ProtectedRoute path="/subscription-success" component={() => <SubscriptionSuccess />} />
        <ProtectedRoute path="/profile-setup" component={() => <ProfileSetup />} />
        <ProtectedRoute path="/account" component={() => (
          <>
            <Navbar />
            <Account />
          </>
        )} />
        
        {/* Profile page route removed as requested */}
        
        {/* Protected routes that require both authentication and subscription */}
        {/* DEVELOPMENT MODE: Subscription requirement temporarily disabled */}
        <ProtectedRoute path="/opportunities" component={() => (
          <>
            <Navbar />
            <Opportunities />
          </>
        )} />
        
        <ProtectedRoute path="/opportunities/:id" component={() => (
          <>
            <Navbar />
            <OpportunityDetail />
          </>
        )} />
        
        <ProtectedRoute path="/my-pitches" component={() => (
          <>
            <Navbar />
            <MyPitches />
          </>
        )} />

        <ProtectedRoute path="/pitch-history" component={() => (
          <>
            <Navbar />
            <PitchHistory />
          </>
        )} />
        
        {/* Admin routes - only accessible to admin users */}
        <AdminProtectedRoute path="/admin/opportunities" component={() => (
          <>
            <AdminHeader active="opportunities" />
            <div className="flex">
              <div className="flex-1">
                <div className="container mx-auto py-8 px-4">
                  <OpportunitiesManager />
                </div>
              </div>
            </div>
          </>
        )} />
        
        <AdminProtectedRoute path="/admin/publications" component={() => (
          <>
            <AdminHeader active="publications" />
            <div className="flex">
              <div className="flex-1">
                <div className="container mx-auto py-8 px-4">
                  <PublicationsManager />
                </div>
              </div>
            </div>
          </>
        )} />
        
        <AdminProtectedRoute path="/admin/users" component={() => (
          <>
            <AdminHeader active="users" />
            <div className="flex">
              <div className="flex-1">
                <div className="container mx-auto py-8 px-4">
                  <UsersManager />
                </div>
              </div>
            </div>
          </>
        )} />
        
        <AdminProtectedRoute path="/admin/support" component={() => (
          <>
            <AdminHeader active="support" />
            <div className="flex">
              <div className="flex-1">
                <div className="container mx-auto py-8 px-4">
                  <Support />
                </div>
              </div>
            </div>
          </>
        )} />
        
        <AdminProtectedRoute path="/admin/pitches" component={AdminPitchesPage} />
        
        <AdminProtectedRoute path="/admin/billing" component={() => (
          <>
            <AdminHeader active="billing" />
            <div className="flex">
              <div className="flex-1">
                <div className="container mx-auto py-8 px-4">
                  <BillingManager />
                </div>
              </div>
            </div>
          </>
        )} />
        
        {/* Agreements page removed - functionality moved to Users Management page */}
        
        <AdminProtectedRoute path="/admin/analytics" component={() => (
          <>
            <AdminHeader active="analytics" />
            <div className="flex">
              <div className="flex-1">
                <AdminAnalytics />
              </div>
            </div>
          </>
        )} />
        
        <AdminProtectedRoute path="/admin" component={() => {
          const { adminUser } = useAdminAuth();
          const { toast } = useToast();
          
          return (
            <div className="min-h-screen bg-gray-50">
              <AdminHeader />
              <div className="flex">
                <div className="flex-1">
                  <div className="container mx-auto py-8 px-4">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                      </div>
                      <div className="flex gap-2">
                        <Link 
                          href="/admin/opportunities" 
                          className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Opportunities
                        </Link>
                        <Link 
                          href="/admin/users" 
                          className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Users
                        </Link>
                        <Link 
                          href="/admin/pitches" 
                          className="bg-amber-600 text-white px-3 py-2 rounded-md hover:bg-amber-700 transition-colors flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          Pitches
                        </Link>
                        
                        <Link 
                          href="/admin/support" 
                          className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Support
                        </Link>
                        <Link 
                          href="/admin-logout" 
                          className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </Link>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                      {/* Opportunities Card with Live Data and Click to Navigate */}
                      <Link 
                        href="/admin/opportunities"
                        className="bg-white rounded-lg shadow-md p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-500 text-sm mb-1">Total Opportunities</p>
                            {(() => {
                              // Use IIFE to create a component that can use hooks
                              const OpportunityCount = () => {
                                const { data: opportunities, isLoading } = useQuery({
                                  queryKey: ['/api/opportunities'],
                                  queryFn: async () => {
                                    const res = await apiFetch('/api/opportunities');
                                    if (!res.ok) throw new Error('Failed to fetch opportunities');
                                    return res.json();
                                  },
                                });
                                
                                if (isLoading) return <p className="text-3xl font-semibold">...</p>;
                                
                                return (
                                  <p className="text-3xl font-semibold">
                                    {opportunities?.length || 0}
                                  </p>
                                );
                              };
                              
                              return <OpportunityCount />;
                            })()}
                          </div>
                          <div className="bg-green-100 p-3 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-green-600 flex items-center">
                            <span className="font-medium">Manage opportunities</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </p>
                        </div>
                      </Link>
                      
                      {/* Pitches Card with Live Data and Click to Navigate */}
                      <Link 
                        href="/admin/pitches"
                        className="bg-white rounded-lg shadow-md p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-500 text-sm mb-1">Active Pitches</p>
                            {(() => {
                              // Use IIFE to create a component that can use hooks
                              const PitchesCount = () => {
                                const { data: pitches, isLoading } = useQuery({
                                  queryKey: ['/api/admin/pitches'],
                                  queryFn: async () => {
                                    const res = await apiFetch('/api/admin/pitches');
                                    if (!res.ok) throw new Error('Failed to fetch pitches');
                                    return res.json();
                                  },
                                });
                                
                                if (isLoading) return <p className="text-3xl font-semibold">...</p>;
                                
                                return (
                                  <p className="text-3xl font-semibold">
                                    {pitches?.length || 0}
                                  </p>
                                );
                              };
                              
                              return <PitchesCount />;
                            })()}
                          </div>
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-blue-600 flex items-center">
                            <span className="font-medium">Review active pitches</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </p>
                        </div>
                      </Link>
                      
                      {/* User Activity Card with Live Data */}
                      <Link 
                        href="/admin/analytics"
                        className="bg-white rounded-lg shadow-md p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-500 text-sm mb-1">User Activity</p>
                            {(() => {
                              // Use IIFE to create a component that can use hooks
                              const UserActivity = () => {
                                const { data: activity, isLoading } = useQuery({
                                  queryKey: ['/api/admin/user-activity'],
                                  queryFn: async () => {
                                    const res = await apiFetch('/api/admin/user-activity');
                                    if (!res.ok) throw new Error('Failed to fetch user activity');
                                    return res.json();
                                  },
                                });
                                
                                if (isLoading) return <p className="text-3xl font-semibold">...</p>;
                                
                                return (
                                  <p className="text-3xl font-semibold">
                                    {activity?.currentlyOnline || 0} <span className="text-lg text-green-600">online</span>
                                  </p>
                                );
                              };
                              
                              return <UserActivity />;
                            })()}
                          </div>
                          <div className="bg-purple-100 p-3 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-purple-600">
                              <span className="font-medium">Today:</span> 
                              <span className="ml-1 text-gray-600" id="active-today">
                                {(() => {
                                  const ActiveToday = () => {
                                    const { data } = useQuery({
                                      queryKey: ['/api/admin/user-activity'],
                                      queryFn: async () => {
                                        const res = await apiFetch('/api/admin/user-activity');
                                        if (!res.ok) throw new Error('Failed to fetch user activity');
                                        return res.json();
                                      },
                                    });
                                    
                                    return <>{data?.activeToday || 0}</>;
                                  };
                                  
                                  return <ActiveToday />;
                                })()}
                              </span>
                            </p>
                            <p className="text-sm text-purple-600">
                              <span className="font-medium">This week:</span>
                              <span className="ml-1 text-gray-600" id="active-week">
                                {(() => {
                                  const ActiveWeek = () => {
                                    const { data } = useQuery({
                                      queryKey: ['/api/admin/user-activity'],
                                      queryFn: async () => {
                                        const res = await apiFetch('/api/admin/user-activity');
                                        if (!res.ok) throw new Error('Failed to fetch user activity');
                                        return res.json();
                                      },
                                    });
                                    
                                    return <>{data?.activeThisWeek || 0}</>;
                                  };
                                  
                                  return <ActiveWeek />;
                                })()}
                              </span>
                            </p>
                          </div>
                        </div>
                      </Link>
                      
                      {/* Users Card with Live Data and Click to Navigate */}
                      <Link 
                        href="/admin/users"
                        className="bg-white rounded-lg shadow-md p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-500 text-sm mb-1">Users</p>
                            {(() => {
                              // Use IIFE to create a component that can use hooks
                              const UserCount = () => {
                                const { data: users, isLoading } = useQuery({
                                  queryKey: ['/api/admin/users'],
                                  queryFn: async () => {
                                    const res = await apiFetch('/api/admin/users');
                                    if (!res.ok) throw new Error('Failed to fetch users');
                                    return res.json();
                                  },
                                });
                                
                                if (isLoading) return <p className="text-3xl font-semibold">...</p>;
                                
                                return (
                                  <p className="text-3xl font-semibold">
                                    {users?.length || 0}
                                  </p>
                                );
                              };
                              
                              return <UserCount />;
                            })()}
                          </div>
                          <div className="bg-yellow-100 p-3 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-yellow-600 flex items-center">
                            <span className="font-medium">View and manage users</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </p>
                        </div>
                      </Link>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 gap-4">
                          <Link 
                            href="/admin/opportunities" 
                            className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <div className="bg-purple-100 p-2 rounded-md">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">Create New Opportunity</h3>
                              <p className="text-sm text-gray-500">Add a new media opportunity to the platform</p>
                            </div>
                          </Link>
                          
                          <Link 
                            href="/admin/publications" 
                            className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <div className="bg-amber-100 p-2 rounded-md">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">Manage Publications</h3>
                              <p className="text-sm text-gray-500">Edit and organize platform publications</p>
                            </div>
                          </Link>
                          
                          <Link 
                            href="/admin/users" 
                            className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <div className="bg-blue-100 p-2 rounded-md">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">Manage Users</h3>
                              <p className="text-sm text-gray-500">View and manage all platform users</p>
                            </div>
                          </Link>
                          
                          <Link 
                            href="/admin/support" 
                            className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <div className="bg-green-100 p-2 rounded-md">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">Customer Support</h3>
                              <p className="text-sm text-gray-500">Help users with password resets and issues</p>
                            </div>
                          </Link>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">New user registered</p>
                              <p className="text-xs text-gray-500">John Smith joined 2 hours ago</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="bg-green-100 p-2 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Opportunity published</p>
                              <p className="text-xs text-gray-500">Tech expert for startup feature - 3 hours ago</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="bg-yellow-100 p-2 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">New subscription</p>
                              <p className="text-xs text-gray-500">Sara Johnson upgraded to premium - 1 day ago</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="bg-red-100 p-2 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Pitch submitted</p>
                              <p className="text-xs text-gray-500">New pitch for Forbes opportunity - 2 days ago</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }} />
        
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
