import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { User } from '@shared/schema';
import { INDUSTRY_OPTIONS } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

// Extended user type to include additional fields
type ExtendedUser = User & {
  industry?: string;
  website?: string;
  bio?: string;
  location?: string;
  profileCompleted?: boolean;
  avatar?: string;
};

export default function AccountPage() {
  const { user } = useAuth() as { user: ExtendedUser | null};
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const queryClient = useQueryClient();

  // Define subscription type
  type SubscriptionData = {
    isPremium: boolean;
    status: string;
    expiresAt: string | null;
    subscriptionId: string | null;
  };

  // Fetch subscription status
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery<SubscriptionData>({
    queryKey: [`/api/user/${user?.id}/subscription`],
    enabled: !!user?.id,
  });

  // Fetch user's successful placements
  const { data: successfulPlacements, isLoading: isLoadingPlacements } = useQuery({
    queryKey: [`/api/users/${user?.id}/placements`],
    enabled: !!user?.id,
  });

  useEffect(() => {
    // Industry field will be added in a future update, so we handle the case when it's not available
    if (user && user.industry) {
      setSelectedIndustry(user.industry);
    }
  }, [user]);

  const handleSaveIndustry = async () => {
    if (!selectedIndustry || !user) return;
    
    setIsSaving(true);
    try {
      // Call the actual API endpoint
      const response = await apiFetch(`/api/users/${user.id}/industry`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ industry: selectedIndustry }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update industry');
      }
      
      toast({
        title: "Industry Updated",
        description: "Your industry preference has been saved.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not update your industry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not found');
      const res = await apiRequest("POST", `/api/user/${user.id}/cancel-subscription`);
      return await res.json();
    },
    onSuccess: (data) => {
      setCancelModalOpen(false);
      setCancellingSubscription(false);
      toast({
        title: "Subscription Canceled",
        description: `Your subscription will remain active until ${formatDate(data.expiresAt)}.`,
      });
      // Invalidate the subscription query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/subscription`] });
    },
    onError: (error: Error) => {
      setCancellingSubscription(false);
      toast({
        title: "Cancellation Failed",
        description: error.message || "There was an error canceling your subscription. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCancelSubscription = () => {
    setCancellingSubscription(true);
    cancelSubscriptionMutation.mutate();
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-qpurple" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Fixed width */}
      <div className="w-72 min-h-screen bg-white border-r border-gray-200 p-6 fixed">
        <div className="space-y-6">
          {/* Profile Avatar & Basic Info */}
          <div className="flex flex-col items-center text-center">
            <div className="w-32 h-32 rounded-full bg-gray-100 mb-4 relative group cursor-pointer">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.fullName || 'Profile'} 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full rounded-full bg-gray-200 text-gray-600 font-bold text-4xl">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 flex items-center justify-center transition-all duration-200 group-hover:bg-opacity-30">
                <Button variant="ghost" size="sm" className="text-transparent group-hover:text-white" asChild>
                  <Link href="/profile-setup">Edit</Link>
                </Button>
              </div>
            </div>
            <h2 className="text-xl font-bold">{user.fullName}</h2>
            <p className="text-sm text-gray-500">@{user.username}</p>
            {user.location && (
              <p className="text-sm text-gray-500 mt-1">{user.location}</p>
            )}
          </div>

          {/* Profile Completion */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Profile Completion</h3>
              <span className="text-xs font-medium">
                {user.profileCompleted ? '100%' : '80%'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: user.profileCompleted ? '100%' : '80%' }}
              ></div>
            </div>
            {!user.profileCompleted && (
              <p className="text-xs text-gray-600 mt-2">Complete your profile to improve your chances of being selected</p>
            )}
          </div>

          {/* Contact Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Contact</h3>
            <div className="space-y-2">
              <a 
                href={`mailto:${user.email}`} 
                className="flex items-center text-sm text-gray-600 hover:text-blue-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {user.email}
              </a>
              {user.website && (
                <a 
                  href={user.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-gray-600 hover:text-blue-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Website
                </a>
              )}
            </div>
          </div>

          {/* Contact Links Section */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Contact & Links</h3>
            <div className="space-y-2">
              {user.website && (
                <a 
                  href={user.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-gray-600 hover:text-blue-600"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Website
                </a>
              )}
              <a 
                href="https://www.linkedin.com/in/user" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-blue-600"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
              <a 
                href="https://www.instagram.com/user" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-blue-600"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
              {user.location && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {user.location}
                </div>
              )}
            </div>
          </div>

          {/* User Settings Accordion */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">User Settings</h3>
            <div className="border border-gray-200 rounded-lg divide-y">
              {/* Profile Section */}
              <div className="p-3">
                <div className="flex justify-between items-center cursor-pointer" 
                  onClick={() => document.getElementById('profileSettings')?.classList.toggle('hidden')}
                >
                  <h4 className="text-sm font-medium">Profile Information</h4>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div id="profileSettings" className="mt-2 pl-2 space-y-2 text-sm text-gray-600 hidden">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Name:</span>
                    <span>{user.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Username:</span>
                    <span>{user.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Email:</span>
                    <span>{user.email}</span>
                  </div>
                  {user.location && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Location:</span>
                      <span>{user.location}</span>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Edit Profile Info
                  </Button>
                </div>
              </div>
              
              {/* Account Settings Section */}
              <div className="p-3">
                <div className="flex justify-between items-center cursor-pointer"
                  onClick={() => document.getElementById('accountSettings')?.classList.toggle('hidden')}
                >
                  <h4 className="text-sm font-medium">Account Settings</h4>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div id="accountSettings" className="mt-2 pl-2 space-y-3 text-sm text-gray-600 hidden">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-gray-700"
                    onClick={() => setSubscriptionModalOpen(true)}
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Manage Subscription
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-gray-700"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Change Password
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-gray-700"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    Update Email & Phone
                  </Button>
                </div>
              </div>
              
              {/* Support Section */}
              <div className="p-3">
                <div className="flex justify-between items-center cursor-pointer"
                  onClick={() => document.getElementById('supportSettings')?.classList.toggle('hidden')}
                >
                  <h4 className="text-sm font-medium">Help & Support</h4>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div id="supportSettings" className="mt-2 pl-2 space-y-3 text-sm text-gray-600 hidden">
                  <a 
                    href="mailto:support@quotebid.com" 
                    className="flex items-center text-gray-700 hover:text-blue-600"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Support
                  </a>
                  
                  <a 
                    href="https://calendly.com/quotebid/consultation" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-700 hover:text-blue-600"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Book 1:1 with QuoteBid
                  </a>
                  
                  <a 
                    href="https://quotebid.com/help" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-700 hover:text-blue-600"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help Center
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Adjusted margin to account for sidebar */}
      <div className="ml-72 flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Profile Dashboard</h1>

          {/* Bio Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">Bio</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile-setup" className="text-blue-600 text-xs">
                  Edit
                </Link>
              </Button>
            </div>
            <Card>
              <CardContent className="prose prose-sm mt-4 p-2 text-gray-600">
                {user.bio ? (
                  <p>{user.bio}</p>
                ) : (
                  <p className="text-gray-400 italic">No bio information added yet. Add a professional bio to help journalists understand your expertise.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Media Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">Media</h2>
              <Button variant="outline" size="sm" className="text-xs">
                + Add Media
              </Button>
            </div>

            {/* Media Grid - 2 columns for large screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Successful placement card */}
              <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-50 flex items-center">
                  <span className="text-xs font-semibold text-green-700">QuoteBid Placement</span>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-gray-900 line-clamp-2">Tariffing Impact on US-China Trade</h3>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <span className="font-medium text-gray-600 mr-1">Forbes</span>
                    <span>• April 22, 2025</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    Expert commentary on how recent tariff changes are affecting global trade relations between US and China.
                  </p>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-green-600 text-sm font-semibold">$750.00 earned</span>
                    <Button variant="link" size="sm" className="text-blue-600 p-0" asChild>
                      <a href="https://example.com/article" target="_blank" rel="noopener noreferrer" className="flex items-center">
                        View article
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}