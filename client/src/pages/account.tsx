import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { apiFetch } from '@/lib/apiFetch';
import { INDUSTRY_OPTIONS } from '@/lib/constants';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { Loader2, CreditCard, CheckCircle, CalendarIcon, ExternalLink, Newspaper, AlertCircle, Upload, Trash2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// UI Components
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { EditProfileForm } from '@/components/EditProfileForm';
import { ProfileView } from '@/components/ProfileView';
import { Spinner } from '@/components/Spinner';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { 
  Form, 
  FormControl, 
  FormDescription,
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


// Form validation schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required" }),
  title: z.string().optional().or(z.literal("")),
  bio: z.string().min(10, { message: "Please provide a short bio (at least 10 characters)" }),
  location: z.string().min(2, { message: "Location is required" }),
  industry: z.string().min(1, { message: "Please select your industry" }),
  linkedIn: z.string().url({ message: "Please enter a valid LinkedIn URL" }).optional().or(z.literal("")),
  instagram: z.string().url({ message: "Please enter a valid Instagram URL" }).optional().or(z.literal("")),
  twitter: z.string().url({ message: "Please enter a valid X.com URL" }).optional().or(z.literal("")),
  website: z.string().url({ message: "Please enter a valid website URL" }).optional().or(z.literal("")),
  doFollowLink: z.string().optional().or(z.literal("")),
  avatar: z.string().optional(),
  otherProfileUrl: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal("")),
});

export default function AccountPage() {
  const { user } = useAuth();
  const { data: currentUser, isLoading, error } = useCurrentUser();
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState("profile"); // Default to profile section
  const [activeTab, setActiveTab] = useState("info"); // Default to info tab
  const [sidebarOpen, setSidebarOpen] = useState(true); // Control sidebar visibility
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // Media coverage modal state
  const [addMediaModalOpen, setAddMediaModalOpen] = useState(false);
  const [mediaDate, setMediaDate] = useState<Date | undefined>(new Date());
  
  // Custom past media coverage items (separate from pitches/placements)
  const [customMediaItems, setCustomMediaItems] = useState<any[]>([]);
  
  // Load custom media items from localStorage on component mount
  useEffect(() => {
    if (user?.id) {
      try {
        const savedItems = localStorage.getItem(`user_${user.id}_media_items`);
        if (savedItems) {
          setCustomMediaItems(JSON.parse(savedItems));
        }
      } catch (error) {
        console.error('Failed to load custom media items from localStorage', error);
      }
    }
  }, [user?.id]);
  
  // Media coverage form schema
  const mediaCoverageSchema = z.object({
    title: z.string().min(2, { message: "Title is required" }),
    publication: z.string().min(2, { message: "Publication name is required" }),
    url: z.string().url({ message: "Please enter a valid URL" }),
    date: z.date({
      required_error: "Publication date is required",
    }),
  });

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
  const { data: successfulPlacements, isLoading: isLoadingPlacements } = useQuery<any[]>({
    queryKey: [`/api/users/${user?.id}/placements`],
    enabled: !!user?.id,
  });

  // Initialize the form with the user's data as default values
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      title: user?.title || "",
      bio: user?.bio || "",
      location: user?.location || "",
      industry: user?.industry || "",
      linkedIn: user?.linkedIn || "",
      instagram: user?.instagram || "",
      twitter: user?.twitter || user?.facebook || "",
      website: user?.website || "",
      doFollowLink: user?.doFollowLink || "none",
      otherProfileUrl: user?.otherProfileUrl || "",
    },
  });

  // Update form values when user data is loaded
  useEffect(() => {
    if (user) {
      console.log('Resetting form with user data:', user);
      form.reset({
        fullName: user.fullName || "",
        title: user.title || "",
        bio: user.bio || "",
        location: user.location || "",
        industry: user.industry || "",
        linkedIn: user.linkedIn || "",
        instagram: user.instagram || "",
        twitter: user.twitter || user.facebook || "",
        website: user.website || "",
        doFollowLink: user.doFollowLink || "none",
        otherProfileUrl: user.otherProfileUrl || "",
      });
      
      // Set avatar preview if user has an avatar
      if (user.avatar) {
        setAvatarPreview(user.avatar);
      }
    }
  }, [user, form]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

// Handle avatar file selection with compression
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Only accept image files
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Show compression toast for large files
      if (file.size > 1 * 1024 * 1024) {
        toast({
          title: "Optimizing image",
          description: "Large image detected, optimizing for upload..."
        });
      }
      
      try {
        // Compression options
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          onProgress: undefined,
        };
        
        // Compress the image file
        const compressedFile = await imageCompression(file, options);
        
        // If compression was successful, use the compressed file
        setAvatarFile(compressedFile);
        
        // Create a preview
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setAvatarPreview(reader.result);
          }
        };
        reader.readAsDataURL(compressedFile);
        
      } catch (error) {
        console.error('Error compressing image:', error);
        
        // Fallback to original file if compression fails
        setAvatarFile(file);
        
        // Still create a preview with original file
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setAvatarPreview(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Trigger file input click
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Profile update mutation
  const profileUpdateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      // First upload avatar if changed
      if (avatarFile && user) {
        try {
          console.log('Uploading avatar file:', avatarFile.name, avatarFile.type, avatarFile.size);
          
          const formData = new FormData();
          formData.append('avatar', avatarFile);
          
          console.log('Sending avatar upload request to:', `/api/users/${user.id}/avatar`);
          const response = await apiFetch(`/api/users/${user.id}/avatar`, {
            method: 'POST',
            body: formData,
          });
          
          console.log('Avatar upload response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Avatar upload failed:', errorText);
            throw new Error(`Failed to upload avatar: ${errorText}`);
          }
          
          const result = await response.json();
          console.log('Avatar upload success, result:', result);
          
          // Support both response formats (fileUrl and avatar)
          data = { ...data, avatar: result.fileUrl || result.avatar };
        } catch (error) {
          console.error('Avatar upload error:', error);
          throw error;
        }
      }
      
      if (!user) throw new Error("User not found");
      
      return await apiRequest('PATCH', `/api/users/${user.id}/profile`, data);
    },
    onSuccess: (updatedUser) => {
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // For immediate visual feedback, update the avatar directly if it was changed
      if (avatarFile && updatedUser) {
        // Get the avatar URL from the response
        const userData = typeof updatedUser === 'object' ? updatedUser as any : {};
        const avatarUrl = userData.avatar || null;
        
        if (avatarUrl) {
          // Force refresh the avatar URL by adding a cache-busting parameter
          const cacheBuster = `?t=${Date.now()}`;
          const refreshedUrl = avatarUrl.includes('?') 
            ? `${avatarUrl}&cb=${cacheBuster}` 
            : `${avatarUrl}${cacheBuster}`;
            
          // Update the avatar preview with the latest URL
          setAvatarPreview(refreshedUrl);
        }
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
      
      setIsEditing(false);
      setAvatarFile(null); // Clear the avatar file after successful update
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  // Media coverage form
  const mediaForm = useForm<z.infer<typeof mediaCoverageSchema>>({
    resolver: zodResolver(mediaCoverageSchema),
    defaultValues: {
      title: "",
      publication: "",
      url: "",
      date: new Date(),
    },
  });
  
  // Add media coverage handler
  const handleAddMedia = (data: z.infer<typeof mediaCoverageSchema>) => {
    if (!user?.id) return;
    
    // Create a new media item with generated ID
    const newItem = {
      id: Date.now().toString(),
      ...data,
      // Store the date as a string to avoid serialization issues with localStorage
      date: data.date.toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    // Add to local state and update localStorage
    setCustomMediaItems(prev => {
      const updatedItems = [newItem, ...prev];
      
      // Save to localStorage
      try {
        localStorage.setItem(
          `user_${user.id}_media_items`, 
          JSON.stringify(updatedItems)
        );
      } catch (error) {
        console.error('Failed to save media items to localStorage', error);
      }
      
      return updatedItems;
    });
    
    // Could also save to backend if needed
    // apiRequest('POST', `/api/users/${user.id}/custom-media`, newItem);
    
    // Close modal and reset form
    setAddMediaModalOpen(false);
    mediaForm.reset();
    
    toast({
      title: "Media Added",
      description: "Your media coverage has been added to your profile",
    });
  };
  
  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      if (!subscription?.subscriptionId) throw new Error("No active subscription found");
      
      return await apiRequest('POST', `/api/users/${user.id}/subscription/cancel`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/subscription`] });
      setCancelModalOpen(false);
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled and will end at the end of the billing period",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setCancellingSubscription(false);
    }
  });

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-qpurple" />
      </div>
    );
  }

  const onSubmit = (data: z.infer<typeof profileFormSchema>) => {
    // Special handling for custom doFollowLink URLs
    const formData = { ...data };
    
    // If the user selected 'custom' but didn't enter a URL, reset to none
    if (formData.doFollowLink === 'custom' && !formData.doFollowLink.startsWith('http')) {
      formData.doFollowLink = 'none';
    }
    
    profileUpdateMutation.mutate(formData);
  };

  const handleCancelSubscription = () => {
    setCancellingSubscription(true);
    cancelSubscriptionMutation.mutate();
  };

  return (
    <div className="flex min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Hidden file input for avatar upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleAvatarChange}
      />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setSidebarOpen(false)} 
          aria-hidden="true"
        />
      )}
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md"
        aria-label="Toggle sidebar"
      >
        <svg
          className="h-5 w-5 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar - Fixed width */}
      <div 
        className={`w-72 min-h-screen bg-white border-r border-gray-200 p-6 fixed overflow-y-auto transition-transform duration-300 ease-in-out z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`} 
        style={{ maxHeight: '100vh' }}
      >
        <div className="space-y-6">
          {/* Profile Avatar & Basic Info */}
          <div className="flex flex-col items-center text-center">
            <div 
              className="w-32 h-32 rounded-full bg-gray-100 mb-4 relative group cursor-pointer"
              onClick={() => isEditing && handleAvatarClick()}
            >
              <>
                {(user.avatar || avatarPreview) && (
                  <img 
                    src={avatarPreview || user.avatar || ''} 
                    alt={user.fullName || 'Profile'} 
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.currentTarget;
                      if (target) {
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.fallback-avatar');
                          if (fallback && fallback instanceof HTMLElement) {
                            fallback.style.display = 'flex';
                          }
                        }
                      }
                    }}
                  />
                )}
                <div className="flex items-center justify-center w-full h-full rounded-full bg-gray-200 text-gray-600 font-bold text-4xl fallback-avatar" style={{display: (user.avatar || avatarPreview) ? 'none' : 'flex'}}>
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              </>
              {isEditing && (
                <div className="absolute inset-0 rounded-full bg-black/0 flex items-center justify-center transition-all duration-200 group-hover:bg-black/30">
                  <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium transition-opacity duration-200">
                    Change Photo
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              className="hidden"
              accept="image/*"
            />
            <h2 className="text-xl font-bold">{user.fullName}</h2>
            <p className="text-sm text-gray-500">@{user.username}</p>
            {user.location && (
              <p className="text-sm text-gray-500 mt-1">{user.location}</p>
            )}
            
            {/* Edit Profile Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
              onClick={() => {
                console.log('Edit profile button clicked, setting isEditing to true');
                setIsEditing(true);
                setActiveTab('info');
                // Force scroll to the top of the content area
                const contentArea = document.querySelector('.account-content-area');
                if (contentArea) contentArea.scrollTop = 0;
                console.log('After state update, isEditing=', isEditing);
              }}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </Button>
          </div>

          {/* Navigation Menu */}
          <div className="pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Navigation</h3>
            <nav className="space-y-1">
              <a 
                href="/account" 
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md bg-blue-50 text-blue-700"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </a>
              
              <a 
                href="/opportunities" 
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                Opportunities
              </a>
              
              <a 
                href="/pitches" 
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                My Pitches
              </a>
            </nav>
          </div>

          {/* Account Settings Section */}
          <div className="pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Account Settings</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setSubscriptionModalOpen(true)}
                className="flex w-full items-center py-2 px-3 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Subscription & Billing
              </button>
              
              <button 
                className="flex w-full items-center py-2 px-3 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Password & Security
              </button>
            </div>
          </div>
          
          {/* Help & Support Section */}
          <div className="pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Help & Support</h3>
            <div className="space-y-1">
              <a 
                href="mailto:support@quotebid.com" 
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Support
              </a>
              
              <a 
                href="https://calendly.com/quotebid/consultation" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Book a Call
              </a>
              
              <a 
                href="https://quotebid.com/help" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help Center
              </a>
            </div>
          </div>
          
          {/* Help text at bottom of sidebar */}
          <div className="pt-6 mt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Need help? <a href="mailto:support@quotebid.com" className="text-blue-600 hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive margin to account for sidebar */}
      <div className={`lg:ml-72 transition-all duration-300 ease-in-out flex-1 p-8 ${sidebarOpen ? 'ml-72' : 'ml-0'} account-content-area bg-gray-50`}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Profile Dashboard</h1>
          
          {!user ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-qpurple" />
            </div>
          ) : isEditing === true ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Edit Profile</h1>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsEditing(false)}
                  disabled={profileUpdateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    This information will be used by journalists to understand your expertise
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Profile photo upload section */}
                      <div className="mb-6">
                        <h3 className="text-sm font-medium mb-3">Profile Photo</h3>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-24 rounded-full bg-gray-100 relative overflow-hidden flex-shrink-0">
                            {(user.avatar || avatarPreview) ? (
                              <img 
                                src={avatarPreview || user.avatar || ''}
                                alt={user.fullName || 'Profile'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling;
                                  if (fallback && fallback instanceof HTMLElement) {
                                    fallback.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div 
                              className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-600 font-bold text-3xl" 
                              style={{display: (user.avatar || avatarPreview) ? 'none' : 'flex'}}
                            >
                              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={handleAvatarClick}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Photo
                            </Button>
                            {(user.avatar || avatarPreview) && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => {
                                  setAvatarFile(null);
                                  setAvatarPreview('');
                                  // Reset avatar field in form
                                  form.setValue('avatar', '');
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Photo
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Upload a professional headshot to make your profile stand out to journalists.
                          Large images will be automatically optimized for upload.
                        </p>
                      </div>
                      {/* Basic info section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name*</FormLabel>
                              <FormControl>
                                <Input placeholder="John Smith" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location*</FormLabel>
                              <FormControl>
                                <Input placeholder="New York, NY" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Professional Title */}
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Professional Title</FormLabel>
                            <FormControl>
                              <Input placeholder="CEO of QuoteBid" {...field} />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500">Your professional title (e.g., "CEO of QuoteBid", "Finance Expert", etc.)</p>
                          </FormItem>
                        )}
                      />
                      
                      {/* Bio section */}
                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Professional Bio*</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your background, expertise, and what you can offer to journalists..."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Industry selection */}
                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Industry*</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {INDUSTRY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Do-Follow Link - Moved above Social Media section */}
                      <FormField
                        control={form.control}
                        name="doFollowLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Do-Follow Link
                              <span className="text-gray-500 text-xs ml-2">(For article placements)</span>
                            </FormLabel>
                            <Select
                              value={field.value || "website"}
                              onValueChange={field.onChange}
                              required
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a link to use in articles" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="website">Website</SelectItem>
                                <SelectItem value="linkedIn">LinkedIn</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="twitter">X</SelectItem>
                                <SelectItem value="other">Other URL</SelectItem>
                              </SelectContent>
                            </Select>
                            {(field.value === "custom" || field.value === "other") && (
                              <Input 
                                placeholder="https://example.com" 
                                value={typeof field.value === "string" && field.value.startsWith("http") ? field.value : ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="mt-2"
                              />
                            )}
                            <FormDescription>
                              Select which link to include at the end of quotes in articles
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Social links section */}
                      <div>
                        <h3 className="text-lg font-medium mb-4">Online Profiles & Web Presence</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="linkedIn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LinkedIn</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://linkedin.com/in/username" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Website</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://yourwebsite.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="instagram"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Instagram</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://instagram.com/username" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="twitter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>X</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://x.com/username" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="otherProfileUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Other URL (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://yourwebsite.com" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Add another website or profile not listed above
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      {/* Past PR Links removed as they are already shown in the dashboard */}
                      
                      <div className="flex justify-end gap-3">
                        <Button 
                          type="button" 
                          variant="outline"  
                          onClick={() => setIsEditing(false)}
                          disabled={profileUpdateMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={profileUpdateMutation.isPending}
                        >
                          {profileUpdateMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          ) : !user ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-qpurple" />
            </div>
          ) : (
            <>
              {/* Header with name and title */}
              <div className="mb-6">
                {user.fullName && (
                  <h2 className="text-xl font-semibold mb-1">{user.fullName}</h2>
                )}
                {user.title && (
                  <p className="text-md text-gray-700 font-medium mb-2">{user.title}</p>
                )}
                <div className="flex items-center">
                  <p className="text-gray-600">
                    {user.industry ? (
                      <span>{user.industry}</span>
                    ) : (
                      <span className="text-gray-400 italic">Add your industry in profile settings</span>
                    )}
                  </p>
                  <Button variant="ghost" size="sm" className="ml-2" onClick={() => {
                    setIsEditing(true);
                    setActiveTab('info');
                    // Force scroll to the top of the content area
                    const contentArea = document.querySelector('.account-content-area');
                    if (contentArea) contentArea.scrollTop = 0;
                  }}>
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                </div>
              </div>
              
              {/* Bio Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">PROFESSIONAL BIO</h2>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-gray-600">
                    {user.bio ? (
                      <p className="whitespace-pre-line">{user.bio}</p>
                    ) : (
                      <p className="text-gray-400 italic">No bio information added yet. Add a professional bio to help journalists understand your expertise.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">CONTACT INFORMATION</h2>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                    <p className="text-gray-700">{user.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                    <p className="text-gray-700">{user.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Website</h3>
                    {user.website ? (
                      <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {user.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                      </a>
                    ) : (
                      <p className="text-gray-400 italic">Not specified</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Industry</h3>
                    <p className="text-gray-700">{user.industry || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Do-Follow Link</h3>
                    {user.doFollowLink && user.doFollowLink !== 'none' ? (
                      <p className="text-gray-700">
                        {user.doFollowLink === 'website' && user.website ? (
                          <>Website (<a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{user.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}</a>)</>
                        ) : user.doFollowLink === 'linkedIn' && user.linkedIn ? (
                          <>LinkedIn (<a href={user.linkedIn} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>)</>
                        ) : user.doFollowLink === 'twitter' && user.twitter ? (
                          <>X (<a href={user.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>)</>
                        ) : user.doFollowLink === 'instagram' && user.instagram ? (
                          <>Instagram (<a href={user.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>)</>                  
                        ) : user.doFollowLink === 'other' && user.otherProfileUrl ? (
                          <>Website (<a href={user.otherProfileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>)</>                  
                        ) : user.doFollowLink.startsWith('http') ? (
                          <>Custom URL (<a href={user.doFollowLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{user.doFollowLink.replace(/^https?:\/\//, '').replace(/^www\./, '')}</a>)</>
                        ) : (
                          'Not properly configured'
                        )}
                      </p>
                    ) : (
                      <p className="text-red-500 italic">Required - set a do-follow link for article quotes</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Online Profiles & Web Presence */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">ONLINE PROFILES & WEB PRESENCE</h2>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* LinkedIn */}
                    <div className="flex items-center">
                      <div className="bg-gray-100 rounded-md p-2 mr-3">
                        <svg className="h-5 w-5 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </div>
                      {user.linkedIn ? (
                        <a href={user.linkedIn} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                          LinkedIn
                        </a>
                      ) : (
                        <p className="text-gray-400 italic text-sm">No LinkedIn added</p>
                      )}
                    </div>
                    
                    {/* X (formerly Twitter) */}
                    <div className="flex items-center">
                      <div className="bg-black rounded-md p-2 mr-3">
                        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </div>
                      {user.twitter ? (
                        <a href={user.twitter || ''} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                          X
                        </a>
                      ) : (
                        <p className="text-gray-400 italic text-sm">No X added</p>
                      )}
                    </div>
                    
                    {/* Instagram */}
                    <div className="flex items-center">
                      <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-yellow-500 rounded-md p-2 mr-3">
                        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>
                      {user.instagram ? (
                        <a href={user.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                          Instagram
                        </a>
                      ) : (
                        <p className="text-gray-400 italic text-sm">No Instagram added</p>
                      )}
                    </div>
                    
                    {/* Website */}
                    {user.otherProfileUrl && (
                      <div className="flex items-center">
                        <div className="bg-purple-100 rounded-md p-2 mr-3">
                          <svg className="h-5 w-5 text-purple-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 8v8"></path>
                            <path d="M8 12h8"></path>
                          </svg>
                        </div>
                        <a href={user.otherProfileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Media Coverage Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">MEDIA COVERAGE</h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setAddMediaModalOpen(true)}
                    className="flex items-center gap-1"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Media</span>
                  </Button>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  {(successfulPlacements && successfulPlacements.length > 0) || customMediaItems.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {/* Custom added media items */}
                      {customMediaItems.map((item) => (
                        <div key={item.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between">
                            <h3 className="font-medium text-gray-900">{item.title}</h3>
                            <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 flex items-center">
                              <Newspaper className="h-3 w-3 mr-1" />
                              Added by you
                            </span>
                          </div>
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <span className="font-medium text-gray-600 mr-1">{item.publication}</span>
                            <span>• {formatDate(typeof item.date === 'string' ? item.date : item.date?.toISOString())}</span>
                          </div>
                          <div className="mt-2">
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-medium flex items-center">
                                View article
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Placements from successful pitches */}
                      {successfulPlacements && successfulPlacements.map((placement) => (
                        <div key={placement.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <h3 className="font-medium text-gray-900">{placement.articleTitle || 'Untitled Article'}</h3>
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <span className="font-medium text-gray-600 mr-1">{placement.publication?.name || 'Publication'}</span>
                            <span>• {formatDate(placement.publicationDate || placement.createdAt)}</span>
                          </div>
                          <div className="mt-2">
                            {placement.articleUrl && (
                              <a href={placement.articleUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm font-medium flex items-center">
                                View article
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4">
                      <p className="text-gray-500 mb-4">You don't have any media coverage yet. You can add your past coverage or get quoted through opportunities.</p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => setAddMediaModalOpen(true)}>
                          Add Past Coverage
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/opportunities">Browse Opportunities</a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Recent Quotes */}
              <div className="mb-8">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-4">RECENT QUOTES</h2>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">No recent quotes yet. Your contributions to articles will appear here.</p>
                  </div>
                </div>
              </div>
              
              {/* Headshots/Media Photos */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">MEDIA PHOTOS</h2>
                  <Button variant="ghost" size="sm">
                    + Add Photo
                  </Button>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">You haven't added any professional photos yet. Add headshots for journalists to use.</p>
                  </div>
                </div>
              </div>
              
              {/* Support Section */}
              <div className="mb-8 rounded-lg border border-gray-200 p-6 bg-gray-50">
                <h2 className="text-lg font-medium mb-2">Need help with your profile?</h2>
                <p className="text-gray-600 mb-4">Our team can help optimize your profile to increase your chances of getting quoted.</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="default" size="sm" asChild>
                    <a href="https://calendly.com/quotebid/consultation" target="_blank" rel="noopener noreferrer">
                      Book a Call
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="mailto:support@quotebid.com">
                      Email Support
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subscription Modal */}
      <Dialog open={subscriptionModalOpen} onOpenChange={setSubscriptionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Your Subscription</DialogTitle>
            <DialogDescription>
              View details of your current subscription plan and make changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isLoadingSubscription ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-border" />
              </div>
            ) : subscription ? (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">QuoteBid {subscription.isPremium ? 'Premium' : 'Basic'}</h3>
                    <p className="text-sm text-gray-500">
                      Status: <span className={`font-medium ${subscription.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                        {subscription.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                    {subscription.expiresAt && (
                      <p className="text-sm text-gray-500 mt-1">
                        {subscription.status === 'active' ? 'Next billing date' : 'Expires'}: {formatDate(subscription.expiresAt)}
                      </p>
                    )}
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Monthly Price</p>
                    <p className="text-2xl font-bold">
                      $99.99
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Plan Includes:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span>Unlimited pitches to media opportunities</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span>Priority matching with journalists</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span>Access to premium tier opportunities</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span>Professional profile with social links</span>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">No active subscription found.</p>
                <Button className="mt-4">
                  Subscribe Now
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            {subscription?.status === 'active' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSubscriptionModalOpen(false);
                  setCancelModalOpen(true);
                }}
              >
                Cancel Subscription
              </Button>
            )}
            <Button onClick={() => setSubscriptionModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirmation Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Your Subscription?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your QuoteBid subscription?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">What happens when you cancel:</h4>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2 shrink-0 mt-0.5" />
                  <span>You'll continue to have access until the end of your current billing period.</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2 shrink-0 mt-0.5" />
                  <span>You will lose access to premium opportunities after your subscription ends.</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2 shrink-0 mt-0.5" />
                  <span>You can resubscribe at any time.</span>
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setCancelModalOpen(false)}
            >
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={cancellingSubscription}
            >
              {cancellingSubscription ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Media Coverage Modal */}
      <Dialog open={addMediaModalOpen} onOpenChange={setAddMediaModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Media Coverage</DialogTitle>
            <DialogDescription>
              Add details about media coverage you've received to showcase on your profile.
            </DialogDescription>
          </DialogHeader>
          <Form {...mediaForm}>
            <form onSubmit={mediaForm.handleSubmit(handleAddMedia)} className="space-y-4">
              <FormField
                control={mediaForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article/Coverage Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the title of the article or coverage" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={mediaForm.control}
                name="publication"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publication</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the name of the publication" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={mediaForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/article" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={mediaForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Publication Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={"w-full pl-3 text-left font-normal"}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setAddMediaModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Media
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}