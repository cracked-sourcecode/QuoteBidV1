import { Switch, Route, Redirect, useLocation, Link } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import HomeNew from "@/pages/home-new";
import PricingEngine from "@/pages/engine";
import EditorialIntegrity from "@/pages/legal/editorial-integrity";
import OpportunitiesPage from "@/pages/opportunities";
import SavedOpportunitiesPage from "@/pages/saved-opportunities";
import OpportunityDetail from "@/pages/opportunity-detail";
import MyPitches from "@/pages/my-pitches";
import PitchHistory from "@/pages/pitch-history";
import Subscribe from "@/pages/subscribe";
import PaymentSuccess from "@/pages/payment-success"; 
import SubscriptionSuccess from "@/pages/subscription-success";
import SubscriptionRedirect from "@/pages/subscription-redirect";
import ProfileSetup from "@/pages/profile-setup";
import SignupWizard from "@/pages/SignupWizard";
import RegisterPage from "@/pages/register";
import Account from "@/pages/account";
// Profile page removed as requested
import Navbar from "@/components/navbar";
import SubscriptionGuard from "@/components/subscription-guard";
import { AuthProvider, useAuth, AuthContext } from "@/hooks/use-auth";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/use-admin-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminProtectedRoute } from "@/lib/admin-protected-route";
import { useEffect, useState, useContext } from "react";

import { PriceProvider } from "@/contexts/PriceContext";
import AdminDashboard from "@/pages/admin/index";
import OpportunitiesManager from "@/pages/admin/opportunities-manager-new";
import UsersManager from "@/pages/admin/users-manager";
import Support from "@/pages/admin/support";
import AdminPitchesPage from "@/pages/admin/pitches";
import BillingManagerNew from "@/pages/admin/billing-manager-new";
import CoverageManager from "@/pages/admin/coverage-manager";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminPricing from "@/pages/admin/pricing";
import PublicationsManager from "@/pages/admin/publications-manager";
import LoginPage from "@/pages/login-page";
import TermsOfService from "@/pages/TermsOfService";
import ResetPassword from "@/pages/reset-password";
import AdminLogin from "@/pages/admin/login";
import CreateAdmin from "@/pages/admin/create-admin";
import AdminLayout from "@/components/admin/AdminLayout";

// Logout component to handle the regular user logout process
function LogoutHandler() {
  const [_, navigate] = useLocation();
  const authContext = useContext(AuthContext);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  
  useEffect(() => {
    const performLogout = async () => {
      if (hasLoggedOut || !authContext) return; // Prevent double logout
      
      try {
        setHasLoggedOut(true);
        await authContext.logoutMutation.mutateAsync();
        
        // Wait a bit to ensure all state is cleared
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Use window.location for a clean redirect that forces a full page reload
        window.location.href = '/';
      } catch (error) {
        console.error("Logout failed:", error);
        // Still redirect to home page if logout fails
        await new Promise(resolve => setTimeout(resolve, 300));
        window.location.href = '/';
      }
    };
    
    performLogout();
  }, [hasLoggedOut, authContext]); // Include dependencies
  
  return (
    <div className="flex justify-center items-center h-screen bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-lg">Logging out...</p>
      </div>
    </div>
  );
}

// Admin logout component to handle the admin user logout process
function AdminLogoutHandler() {
  const [_, navigate] = useLocation();
  useEffect(() => {
    navigate('/admin/login');
  }, []);
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
  // Note: Removed usePriceUpdates() since we're using PriceContext system now
  
  return (
    <>
      <Switch>
        {/* Public routes - available to everyone */}
        <Route path="/">
          {() => {
            const { user, isLoading } = useAuth();
            
            // If we're still loading the user state, show the home page
            // This prevents the white screen during logout
            if (isLoading) {
              return <Home />;
            }
            
            // Only redirect if we have a confirmed logged-in user
            if (user) {
              return <Redirect to="/opportunities" />;
            }
            
            return <Home />;
          }}
        </Route>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/auth">
          {() => <Redirect to="/login" />}
        </Route>
        <Route path="/logout" component={LogoutHandler} />
        <Route path="/admin-logout" component={AdminLogoutHandler} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/create-admin" component={CreateAdmin} />
        <Route path="/signup-wizard" component={SignupWizard} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/home-test" component={HomeNew} />
        <Route path="/engine" component={PricingEngine} />
        <Route path="/legal/editorial-integrity" component={EditorialIntegrity} />
        
        {/* Routes that require authentication */}
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
        
        {/* Protected routes that require authentication */}
        <ProtectedRoute path="/opportunities" component={() => (
          <>
            <Navbar />
            <OpportunitiesPage />
          </>
        )} />
        
        <ProtectedRoute path="/saved" component={() => (
          <>
            <Navbar />
            <SavedOpportunitiesPage />
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
          <AdminLayout>
            <div className="container mx-auto py-8 px-4">
              <OpportunitiesManager />
            </div>
          </AdminLayout>
        )} />
        
        <AdminProtectedRoute path="/admin/publications" component={() => (
          <AdminLayout>
            <div className="container mx-auto py-8 px-4">
              <PublicationsManager />
            </div>
          </AdminLayout>
        )} />
        
        <AdminProtectedRoute path="/admin/users" component={() => (
          <AdminLayout>
            <div className="container mx-auto py-8 px-4">
              <UsersManager />
            </div>
          </AdminLayout>
        )} />
        
        <AdminProtectedRoute path="/admin/support" component={() => (
          <AdminLayout>
            <div className="container mx-auto py-8 px-4">
              <Support />
            </div>
          </AdminLayout>
        )} />
        
        <AdminProtectedRoute path="/admin/pitches" component={() => (
          <AdminLayout>
            <AdminPitchesPage />
          </AdminLayout>
        )} />
        
        <AdminProtectedRoute path="/admin/billing" component={() => (
          <AdminLayout>
            <div className="container mx-auto py-8 px-4">
              <BillingManagerNew />
            </div>
          </AdminLayout>
        )} />
        
        <AdminProtectedRoute path="/admin/billing-manager" component={() => (
          <AdminLayout>
            <div className="container mx-auto py-8 px-4">
              <BillingManagerNew />
            </div>
          </AdminLayout>
        )} />
        
        {/* Agreements page removed - functionality moved to Users Management page */}
        
        <AdminProtectedRoute path="/admin/analytics" component={() => (
          <AdminLayout>
            <AdminAnalytics />
          </AdminLayout>
        )} />
        
        <AdminProtectedRoute path="/admin/pricing" component={() => (
          <AdminLayout>
            <div className="container mx-auto py-8 px-4">
              <AdminPricing />
            </div>
          </AdminLayout>
        )} />
        
        <AdminProtectedRoute path="/admin" component={() => {
          const { adminUser } = useAdminAuth();
          const { toast } = useToast();
          
          return (
            <AdminLayout>
              <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
                <div className="container mx-auto py-8 px-6">
                  
                  {/* Enhanced Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
                      Admin Dashboard
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                      Comprehensive platform management and analytics at your fingertips
                    </p>
                  </div>
                  
                  {/* Enhanced Stats Cards */}
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8 mb-8">
                    {/* Opportunities Card */}
                    <Link 
                      href="/admin/opportunities"
                      className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-3">Total Opportunities</p>
                          {(() => {
                            const OpportunityCount = () => {
                              const { data: opportunities, isLoading } = useQuery({
                                queryKey: ['/api/opportunities'],
                                queryFn: async () => {
                                  const res = await apiFetch('/api/opportunities');
                                  if (!res.ok) throw new Error('Failed to fetch opportunities');
                                  return res.json();
                                },
                              });
                              
                              if (isLoading) return <p className="text-4xl font-bold text-gray-900 leading-none">...</p>;
                              
                              return (
                                <p className="text-4xl font-bold text-gray-900 leading-none">
                                  {opportunities?.length || 0}
                                </p>
                              );
                            };
                            
                            return <OpportunityCount />;
                          })()}
                        </div>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-sm text-green-600 flex items-center font-medium group-hover:text-green-700 transition-colors">
                          <span>Manage opportunities</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </p>
                      </div>
                    </Link>
                    
                    {/* Pitches Card */}
                    <Link 
                      href="/admin/pitches"
                      className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-3">Active Pitches</p>
                          {(() => {
                            const PitchesCount = () => {
                              const { data: pitches, isLoading } = useQuery({
                                queryKey: ['/api/admin/pitches'],
                                queryFn: async () => {
                                  const res = await apiFetch('/api/admin/pitches');
                                  if (!res.ok) throw new Error('Failed to fetch pitches');
                                  return res.json();
                                },
                              });
                              
                              if (isLoading) return <p className="text-4xl font-bold text-gray-900 leading-none">...</p>;
                              
                              return (
                                <p className="text-4xl font-bold text-gray-900 leading-none">
                                  {pitches?.length || 0}
                                </p>
                              );
                            };
                            
                            return <PitchesCount />;
                          })()}
                        </div>
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-sm text-blue-600 flex items-center font-medium group-hover:text-blue-700 transition-colors">
                          <span>Review active pitches</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </p>
                      </div>
                    </Link>
                    
                    {/* User Activity Card */}
                    <Link 
                      href="/admin/analytics"
                      className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-3">User Activity</p>
                          {(() => {
                            const UserActivity = () => {
                              const { data: activity, isLoading } = useQuery({
                                queryKey: ['/api/admin/user-activity'],
                                queryFn: async () => {
                                  const res = await apiFetch('/api/admin/user-activity');
                                  if (!res.ok) throw new Error('Failed to fetch user activity');
                                  return res.json();
                                },
                              });
                              
                              if (isLoading) return <p className="text-4xl font-bold text-gray-900 leading-none">...</p>;
                              
                              return (
                                <div className="flex items-baseline">
                                  <p className="text-4xl font-bold text-gray-900 leading-none">
                                    {activity?.currentlyOnline || 0}
                                  </p>
                                  <span className="text-lg text-purple-600 font-medium ml-2">online</span>
                                </div>
                              );
                            };
                            
                            return <UserActivity />;
                          })()}
                        </div>
                        <div className="bg-gradient-to-r from-purple-500 to-violet-500 p-3 rounded-xl shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-purple-600 font-medium">Today:</p>
                            <span className="text-gray-600 font-semibold">
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
                          </div>
                          <div>
                            <p className="text-purple-600 font-medium">This week:</p>
                            <span className="text-gray-600 font-semibold">
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
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    {/* Users Card */}
                    <Link 
                      href="/admin/users"
                      className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-3">Users</p>
                          {(() => {
                            const UserCount = () => {
                              const { data: users, isLoading } = useQuery({
                                queryKey: ['/api/admin/users'],
                                queryFn: async () => {
                                  const res = await apiFetch('/api/admin/users');
                                  if (!res.ok) throw new Error('Failed to fetch users');
                                  return res.json();
                                },
                              });
                              
                              if (isLoading) return <p className="text-4xl font-bold text-gray-900 leading-none">...</p>;
                              
                              return (
                                <p className="text-4xl font-bold text-gray-900 leading-none">
                                  {users?.length || 0}
                                </p>
                              );
                            };
                            
                            return <UserCount />;
                          })()}
                        </div>
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-xl shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-sm text-amber-600 flex items-center font-medium group-hover:text-amber-700 transition-colors">
                          <span>View and manage users</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </p>
                      </div>
                    </Link>
                  </div>
                  
                  {/* Support Section */}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl shadow-2xl p-6 mb-8 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-1">Customer Support Center</h3>
                          <p className="text-indigo-100 text-sm leading-relaxed">
                            Comprehensive user assistance and account management tools
                          </p>
                        </div>
                      </div>
                      <div className="hidden lg:flex items-center space-x-3">
                        <Link 
                          href="/admin/support"
                          className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-all duration-200 flex items-center space-x-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span>User Lookup</span>
                        </Link>
                        <Link 
                          href="/admin/support"
                          className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2 shadow-md"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>Access Support</span>
                        </Link>
                      </div>
                    </div>
                    
                    {/* Mobile Support Buttons */}
                    <div className="lg:hidden mt-4 flex flex-col sm:flex-row gap-3">
                      <Link 
                        href="/admin/support"
                        className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>User Lookup</span>
                      </Link>
                      <Link 
                        href="/admin/support"
                        className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Access Support</span>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Enhanced Quick Actions */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quick Actions</h2>
                        <p className="text-gray-600 text-lg">Streamlined access to key administrative functions</p>
                      </div>
                      <div className="hidden sm:flex w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Link 
                        href="/admin/opportunities?create=true" 
                        className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-300 transform hover:-translate-y-1"
                      >
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">Create New Opportunity</h3>
                          <p className="text-gray-600 group-hover:text-purple-600 transition-colors">Add a new media opportunity to the platform</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      
                      <div
                        onClick={() => {
                          window.location.href = '/admin/publications';
                          setTimeout(() => window.scrollTo(0, 0), 100);
                        }}
                        className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                      >
                        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-4 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-amber-700 transition-colors">Manage Publications</h3>
                          <p className="text-gray-600 group-hover:text-amber-600 transition-colors">Edit and organize platform publications</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-amber-500 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      
                      <div
                        onClick={() => {
                          window.location.href = '/admin/users';
                          setTimeout(() => window.scrollTo(0, 0), 100);
                        }}
                        className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                      >
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">Manage Users</h3>
                          <p className="text-gray-600 group-hover:text-blue-600 transition-colors">View and manage all platform users</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      
                      <div
                        onClick={() => {
                          window.location.href = '/admin/analytics';
                          setTimeout(() => window.scrollTo(0, 0), 100);
                        }}
                        className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                      >
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">Analytics & Reports</h3>
                          <p className="text-gray-600 group-hover:text-emerald-600 transition-colors">View platform insights and analytics</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AdminLayout>
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
          <PriceProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </PriceProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
