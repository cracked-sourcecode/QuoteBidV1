import { useState, useEffect, useRef, ChangeEvent, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useTheme } from '@/hooks/use-theme';
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
import { Loader2, CreditCard, CheckCircle, CalendarIcon, ExternalLink, Newspaper, Upload, Trash2, Brain, Mail } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Logo } from '@/components/common/Logo';
import { EmailPreferences } from '@/components/EmailPreferences';

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
import { CancelRetentionModal } from '@/components/CancelRetentionModal';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Settings, 
  Bell, 
  MessageCircle,
  Clock,
  FileText
} from 'lucide-react';
import PitchChatModal from '@/components/PitchChatModal';
import { formatDistanceToNow } from 'date-fns';
import { BillingTabContent } from '@/components/BillingTabContent';


// Country codes list (same as signup)
const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
];

// Form validation schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone_number: z.string().optional().or(z.literal("")),
  title: z.string().optional().or(z.literal("")),
  bio: z.string().min(10, { message: "Please provide a short bio (at least 10 characters)" }),
  location: z.string().min(2, { message: "Location is required" }),
  industry: z.string().min(1, { message: "Please select your industry" }),
  linkedIn: z.string().optional().or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),
  twitter: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  doFollowLink: z.string().optional().or(z.literal("")),
  avatar: z.string().optional(),
  otherProfileUrl: z.string().optional().or(z.literal("")),
});

// Password change form schema (same requirements as signup)
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AccountPage() {
  const { user } = useAuth();
  const { data: currentUser, isLoading, error } = useCurrentUser();
  const { theme, toggleTheme } = useTheme();
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
  
  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);
  const [selectedPitchTitle, setSelectedPitchTitle] = useState<string>('');
  
  // Media coverage modal state
  const [addMediaModalOpen, setAddMediaModalOpen] = useState(false);
  const [mediaDate, setMediaDate] = useState<Date | undefined>(new Date());
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const urlFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Edit mode state for media items
  const [editingMediaItem, setEditingMediaItem] = useState<any | null>(null);
  
  // Custom past media coverage items (separate from pitches/placements)
  const [customMediaItems, setCustomMediaItems] = useState<any[]>([]);
  
  // Password/Security modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  
  // Theme switch modal state
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  
  // Email and phone validation states (like signup form)
  const [emailUnique, setEmailUnique] = useState(true);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailValid, setEmailValid] = useState(true);
  const [phoneUnique, setPhoneUnique] = useState(true);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneValid, setPhoneValid] = useState(true);
  const [countryCode, setCountryCode] = useState('+1'); // Default to US/Canada
  const [formattedPhone, setFormattedPhone] = useState('');
  
  // Email validation regex (same as signup)
  const emailRegex = /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/;
  
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

  // Handle URL parameters for notification clicks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const notificationType = urlParams.get('notification');
    const refresh = urlParams.get('refresh');
    
    // If coming from a media coverage notification, switch to profile tab and refresh data
    if (notificationType === 'media_coverage' || refresh === 'media') {
      setActiveTab('info');
      // Force refresh the media coverage data
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/media-coverage`] });
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Show a toast to confirm the update
      if (notificationType === 'media_coverage') {
        toast({
          title: "Media Coverage Updated",
          description: "Your published article has been added to your portfolio",
        });
      }
    }
  }, [user?.id, queryClient, toast]);
  
  // Media coverage form schema - publication is optional, no date required
  const mediaCoverageSchema = z.object({
    title: z.string().min(2, { message: "Title is required" }),
    publication: z.string().optional().or(z.literal("")),
    url: z.string().url({ message: "Please enter a valid URL" }),
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

  // Fetch user's pitches for communication
  const { data: userPitches, isLoading: isLoadingPitches, error: pitchesError } = useQuery<any[]>({
    queryKey: [`/api/users/${user?.id}/pitches`],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID required');
      console.log(`🔍 FETCHING PITCHES for user ${user.id}`);
      const response = await apiFetch(`/api/users/${user.id}/pitches`);
      console.log(`🔍 PITCH RESPONSE:`, response.status, response.ok);
      if (!response.ok) {
        console.error(`🔍 PITCH ERROR:`, response.status, response.statusText);
        throw new Error(`Failed to fetch pitches: ${response.status}`);
      }
      const data = await response.json();
      console.log(`🔍 PITCH DATA:`, data?.length, 'pitches loaded');
      return data;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true, // Auto-refresh when window gains focus
    staleTime: 30000, // Refetch after 30 seconds to catch new data
  });

  // SIMPLE SOLUTION: Use My Pitches data directly for Media Coverage 
  console.log('🔍 DEBUG userPitches:', userPitches);
  console.log('🔍 DEBUG userPitches length:', userPitches?.length);
  console.log('🔍 DEBUG pitches loading:', isLoadingPitches);
  console.log('🔍 DEBUG pitches error:', pitchesError);
  
  const mediaCoverage = userPitches?.filter(pitch => {
    console.log('🔍 DEBUG pitch:', pitch.id, 'status:', pitch.status, 'articleUrl:', pitch.articleUrl);
    return pitch.articleUrl && 
           pitch.articleUrl.trim() !== '' && 
           pitch.articleUrl !== '#' &&
           (pitch.status === 'successful' || 
            pitch.status === 'delivered' || 
            pitch.status === 'published' ||
            pitch.status === 'successful_coverage' ||
            pitch.status === 'completed' ||
            pitch.status === 'placed');
  }).map(pitch => ({
    id: pitch.id,
    userId: pitch.userId,
    title: pitch.articleTitle || `Published Article - ${pitch.opportunity?.title || 'Article Coverage'}`,
    publication: pitch.opportunity?.publication?.name || 'Publication',
    url: pitch.articleUrl,
    source: 'my_pitches',
    pitchId: pitch.id,
    isVerified: true,
    publicationLogo: pitch.opportunity?.publication?.logo
  })) || [];
  
  const isLoadingMediaCoverage = isLoadingPitches;

  // Fetch all publications to get logos by name
  const { data: allPublications } = useQuery<any[]>({
    queryKey: ['/api/publications'],
    staleTime: 300000, // Cache for 5 minutes
  });

  // Debug logging
  console.log('🔍 DEBUG: mediaCoverage:', mediaCoverage);
  console.log('🔍 DEBUG: mediaCoverage length:', mediaCoverage?.length || 0);

  // Initialize the form with the user's data as default values
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone_number: (user as any)?.phone_number || "",
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
        email: user.email || "",
        phone_number: (user as any).phone_number || "",
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

// Handle avatar file selection - SIMPLE VERSION
  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      
      // Set the file directly - no compression, no bullshit
      setAvatarFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setAvatarPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
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
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        
        const response = await apiFetch(`/api/users/${user.id}/avatar`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload avatar`);
        }
        
        const result = await response.json();
        const avatarUrl = result.fileUrl || result.avatar;
        data = { ...data, avatar: avatarUrl };
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
    },
  });
  
  // Password change form
  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Password change mutation
  const passwordChangeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordChangeSchema>) => {
      if (!user) throw new Error("User not found");
      
      const response = await apiFetch(`/api/users/${user.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed",
      });
      
      // Reset form and close modal
      passwordForm.reset();
      setPasswordModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle password change form submission
  const handlePasswordChange = (data: z.infer<typeof passwordChangeSchema>) => {
    passwordChangeMutation.mutate(data);
  };

  // Function to intelligently fetch page title and publication using OpenAI
  const fetchPageTitle = async (url: string) => {
    try {
      setFetchingTitle(true);
      
      // Basic URL validation
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(url)) {
        return null;
      }

      let title = null;
      let articleDate = null;
      let publication = null;

      // Use OpenAI to intelligently extract information - let backend handle HTML fetching
      try {
        const response = await apiFetch('/api/ai/extract-article-info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url
          }),
        });

        if (response.ok) {
          const data = await response.json();
          title = data.title;
          articleDate = data.date;
          publication = data.publication;
          
          console.log('AI extracted data:', data); // Debug log
          
          // Auto-fill the publication field if we got one
          if (data.publication) {
            mediaForm.setValue('publication', data.publication);
          }
          
          // No longer auto-filling date since it's not in the form
        } else {
          console.error('AI extraction API error:', response.status, response.statusText);
          // Fallback to URL-based title extraction
          try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const pathParts = pathname.split('/').filter(part => part.length > 0);
            if (pathParts.length > 0) {
              const lastPart = pathParts[pathParts.length - 1];
              title = lastPart
                .replace(/[-_]/g, ' ')
                .replace(/\.(html|htm|php|aspx|jsp)$/i, '')
                .replace(/\s+[\|\-\u2013\u2014]\s+.+$/, '') // Remove site suffixes
                .replace(/\s+/g, ' ') // Clean whitespace
                .replace(/\d{6,}/g, '') // Remove long number sequences
                .trim();
                
              if (title && typeof title === 'string' && title.length > 150) {
                title = title.substring(0, 150) + '...';
              }
            }
          } catch (error) {
            console.log('URL parsing fallback failed');
          }
        }
      } catch (error) {
        console.log('OpenAI extraction failed, using URL fallback');
        // Fallback to URL-based title extraction
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const pathParts = pathname.split('/').filter(part => part.length > 0);
          if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            title = lastPart
              .replace(/[-_]/g, ' ')
              .replace(/\.(html|htm|php|aspx|jsp)$/i, '')
              .replace(/\s+[\|\-\u2013\u2014]\s+.+$/, '')
              .replace(/\s+/g, ' ')
              .replace(/\d{6,}/g, '')
              .trim();
              
            if (title && typeof title === 'string' && title.length > 150) {
              title = title.substring(0, 150) + '...';
            }
          }
        } catch (error) {
          console.log('URL parsing fallback failed');
        }
      }
      
      return { title: title || null, date: articleDate, publication: publication };
    } catch (error) {
      console.error('Error fetching page title:', error);
      return null;
    } finally {
      setFetchingTitle(false);
    }
  };

  // Debounced URL change handler with improved logic
  const handleUrlChange = async (url: string, onChange: (value: string) => void) => {
    onChange(url);
    
    // Clear any existing timeout
    if (urlFetchTimeoutRef.current) {
      clearTimeout(urlFetchTimeoutRef.current);
    }
    
    // Only fetch title if it's a valid URL, title field is empty, and we're not editing an existing item
    const currentTitle = mediaForm.getValues('title');
    if (url && !currentTitle && url.startsWith('http') && !editingMediaItem) {
      // Add a debounce delay to avoid making requests on every keystroke
      urlFetchTimeoutRef.current = setTimeout(async () => {
        // Check if URL is still the same (user hasn't changed it)
        const currentUrl = mediaForm.getValues('url');
        if (currentUrl === url) {
          const result = await fetchPageTitle(url);
          if (result && result.title) {
            mediaForm.setValue('title', result.title);
            
            // Show success message with what was extracted
            const extractedItems = [];
            if (result.title) extractedItems.push(`title: "${result.title.length > 50 ? result.title.substring(0, 50) + '...' : result.title}"`);
            if (result.publication) extractedItems.push(`publication: "${result.publication}"`);
            
            toast({
              title: "Article info auto-filled! ✨",
              description: `Successfully detected: ${extractedItems.join(', ')}`,
            });
          } else {
            toast({
              title: "Couldn't auto-detect article info",
              description: "Please enter the article details manually",
              variant: "default",
            });
          }
        }
      }, 1500); // Wait 1.5 seconds after user stops typing
    }
  };

  // Debounced email uniqueness check (same as signup)
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const checkEmailUnique = useCallback(
    debounce(async (email: string) => {
      if (!email || !emailRegex.test(email)) {
        setEmailUnique(true);
        setEmailChecking(false);
        setEmailValid(false);
        return;
      }
      
      // Skip check if it's the current user's email
      if (email === user?.email) {
        setEmailUnique(true);
        setEmailChecking(false);
        setEmailValid(true);
        return;
      }
      
      setEmailValid(true);
      setEmailChecking(true);
      
      try {
        const res = await fetch(`/api/users/check-unique?field=email&value=${encodeURIComponent(email)}`);
        const data = await res.json();
        setEmailUnique(!!data.unique);
      } catch {
        setEmailUnique(true); // fallback to allow
      }
      setEmailChecking(false);
    }, 400),
    [user?.email, emailRegex]
  );

  // Debounced phone uniqueness check (same as signup)
  const checkPhoneUnique = useCallback(
    debounce(async (phone: string) => {
      const digitsOnly = phone.replace(/\D/g, '');
      
      // Check minimum length based on country
      let minLength = 7; // default minimum
      if (countryCode === '+1') minLength = 10; // US/Canada
      else if (countryCode === '+44') minLength = 10; // UK
      else if (countryCode === '+61') minLength = 9; // Australia
      
      if (!phone || digitsOnly.length < minLength) {
        setPhoneUnique(true);
        setPhoneChecking(false);
        setPhoneValid(false);
        return;
      }
      
      // Skip check if it's the current user's phone
      const currentUserPhone = (user as any)?.phone_number;
      const fullPhone = countryCode + digitsOnly;
      if (currentUserPhone && fullPhone === currentUserPhone) {
        setPhoneUnique(true);
        setPhoneChecking(false);
        setPhoneValid(true);
        return;
      }
      
      setPhoneValid(true);
      setPhoneChecking(true);
      
      try {
        const res = await fetch(`/api/users/check-unique?field=phone&value=${encodeURIComponent(fullPhone)}`);
        const data = await res.json();
        setPhoneUnique(!!data.unique);
      } catch {
        setPhoneUnique(true); // fallback to allow
      }
      setPhoneChecking(false);
    }, 400),
    [countryCode, user]
  );

  // Phone number formatter (same as signup)
  const formatPhoneNumber = (value: string, selectedCountryCode: string) => {
    let digits = value.replace(/\D/g, '');
    
    if (selectedCountryCode === '+1') {
      // US/Canada format
      digits = digits.slice(0, 10);
      if (digits.length === 0) return '';
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (selectedCountryCode === '+44') {
      // UK format
      digits = digits.slice(0, 11);
      if (digits.length === 0) return '';
      if (digits.startsWith('0')) digits = digits.slice(1);
      if (digits.startsWith('7')) {
        if (digits.length <= 4) return digits;
        return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
      } else {
        if (digits.length <= 4) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
        return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
      }
    } else if (selectedCountryCode === '+61') {
      // Australia format
      digits = digits.slice(0, 9);
      if (digits.length === 0) return '';
      if (digits.startsWith('0')) digits = digits.slice(1);
      if (digits.startsWith('4')) {
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
      } else {
        if (digits.length <= 1) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 1)} ${digits.slice(1)}`;
        return `${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`;
      }
    }
    // Default formatting for other countries
    return digits.slice(0, 15);
  };

  // Parse existing phone number to extract country code and format
  useEffect(() => {
    const userPhone = (user as any)?.phone_number;
    if (userPhone && userPhone.startsWith('+')) {
      // Try to extract country code
      const foundCountry = COUNTRY_CODES.find(c => userPhone.startsWith(c.code));
      if (foundCountry) {
        setCountryCode(foundCountry.code);
        const phoneWithoutCountryCode = userPhone.slice(foundCountry.code.length);
        const formatted = formatPhoneNumber(phoneWithoutCountryCode, foundCountry.code);
        setFormattedPhone(formatted);
      } else {
        // Default formatting if country code not found
        setFormattedPhone(userPhone.slice(1)); // Remove the +
      }
    }
  }, [user]);


  // Add media coverage handler - improved with better error handling
  const handleAddMedia = async (data: z.infer<typeof mediaCoverageSchema>) => {
    try {
      console.log('handleAddMedia called with data:', data);
      
      if (!user?.id) {
        toast({
          title: "Error",
          description: "User not found. Please try logging in again.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate the data
      if (!data.title || !data.url) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
      
      if (editingMediaItem) {
        // Edit existing item
        console.log('Editing existing media item:', editingMediaItem.id);
        
        setCustomMediaItems(prev => {
          const updatedItems = prev.map(item => 
            item.id === editingMediaItem.id 
              ? { ...item, ...data, date: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : item
          );
          
          // Save to localStorage
          try {
            localStorage.setItem(
              `user_${user.id}_media_items`, 
              JSON.stringify(updatedItems)
            );
            console.log('Updated item saved to localStorage successfully');
          } catch (error) {
            console.error('Failed to save updated media items to localStorage', error);
            toast({
              title: "Warning",
              description: "Failed to save changes locally. The item was updated but may not persist.",
              variant: "default",
            });
          }
          
          return updatedItems;
        });
        
        toast({
          title: "Media Updated Successfully! ✏️",
          description: "Your media coverage has been updated",
        });
        
      } else {
        // Create a new media item with generated ID
        const newItem = {
          id: Date.now().toString(),
          ...data,
          // Store the date as a string to avoid serialization issues with localStorage
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        
        console.log('Creating new media item:', newItem);
        
        // Add to local state and update localStorage
        setCustomMediaItems(prev => {
          const updatedItems = [newItem, ...prev];
          
          // Save to localStorage
          try {
            localStorage.setItem(
              `user_${user.id}_media_items`, 
              JSON.stringify(updatedItems)
            );
            console.log('Saved to localStorage successfully');
          } catch (error) {
            console.error('Failed to save media items to localStorage', error);
            toast({
              title: "Warning",
              description: "Failed to save locally. The item was added but may not persist.",
              variant: "default",
            });
          }
          
          return updatedItems;
        });
        
        toast({
          title: "Media Added Successfully! 🎉",
          description: "Your media coverage has been added to your profile",
        });
      }
      
      // Close modal and reset form
      setAddMediaModalOpen(false);
      setEditingMediaItem(null);
      mediaForm.reset({
        title: "",
        publication: "",
        url: "",
      });
      
    } catch (error) {
      console.error('Error in handleAddMedia:', error);
      toast({
        title: "Error",
        description: "Failed to save media coverage. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Function to open modal in edit mode
  const handleEditMediaItem = (item: any) => {
    setEditingMediaItem(item);
    mediaForm.reset({
      title: item.title,
      publication: item.publication || "",
      url: item.url,
    });
    setAddMediaModalOpen(true);
  };
  
  // Function to delete a media item
  const handleDeleteMediaItem = (itemId: string) => {
    if (!user?.id) return;
    
    setCustomMediaItems(prev => {
      const updatedItems = prev.filter(item => item.id !== itemId);
      
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
    
    toast({
      title: "Media Deleted",
      description: "The media coverage has been removed from your profile",
    });
  };
  
  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      const response = await apiRequest('POST', `/api/users/${user.id}/subscription/cancel`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/subscription`] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled and will remain active until the end of your billing period.",
      });
      setCancelModalOpen(false);
      setSubscriptionModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCancelSubscription = () => {
    setCancellingSubscription(true);
    cancelSubscriptionMutation.mutate();
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-qpurple" />
      </div>
    );
  }

  const onSubmit = (data: z.infer<typeof profileFormSchema>) => {
    profileUpdateMutation.mutate(data);
  };
  
  // Chat modal handlers
  const openChatModal = (pitchId: number, pitchTitle: string) => {
    setSelectedPitchId(pitchId);
    setSelectedPitchTitle(pitchTitle);
    setIsChatModalOpen(true);
  };
  
  const closeChatModal = () => {
    setIsChatModalOpen(false);
    setSelectedPitchId(null);
    setSelectedPitchTitle('');
  };

  return (
    <div className="flex min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)} 
          aria-hidden="true"
        />
      )}
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-slate-800 border border-slate-700 shadow-lg"
        aria-label="Toggle sidebar"
      >
        <svg
          className="h-5 w-5 text-slate-300"
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
        className={`w-72 min-h-screen bg-slate-900 border-r border-slate-700 p-6 fixed overflow-y-auto transition-transform duration-300 ease-in-out z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`} 
        style={{ maxHeight: '100vh' }}
      >
        <div className="space-y-6">
          {/* Profile Avatar & Basic Info */}
          <div className="flex flex-col items-center text-center">
            <div 
              className="w-32 h-32 rounded-full bg-slate-800 mb-4 relative group cursor-pointer border-2 border-slate-700"
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
                <div className="flex items-center justify-center w-full h-full rounded-full bg-slate-700 text-slate-300 font-bold text-4xl fallback-avatar" style={{display: (user.avatar || avatarPreview) ? 'none' : 'flex'}}>
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              </>
              {isEditing && (
                <div className="absolute inset-0 rounded-full bg-black/0 flex items-center justify-center transition-all duration-200 group-hover:bg-black/40">
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
            <h2 className="text-xl font-bold text-slate-100">{user.fullName}</h2>
            <p className="text-sm text-slate-400">@{user.username}</p>
            {user.location && (
              <p className="text-sm text-slate-400 mt-1">{user.location}</p>
            )}
            
            {/* Edit Profile Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 hover:border-slate-500"
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Navigation</h3>
            <nav className="space-y-1">
              <a 
                href="/account" 
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md bg-blue-600 text-blue-100 shadow-lg"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </a>
              
              <a 
                href="/opportunities" 
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                Opportunities
              </a>
              
              <a 
                href="/my-pitches" 
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Account Settings</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setSubscriptionModalOpen(true)}
                className="flex w-full items-center py-2 px-3 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              >
                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Subscription & Billing
              </button>

              <button 
                onClick={() => setThemeModalOpen(true)}
                className="flex w-full items-center py-2 px-3 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors group"
              >
                {theme === 'light' ? (
                  <>
                    <svg className="h-5 w-5 mr-3 text-slate-300 group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    Dark Mode
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-3 text-slate-300 group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Light Mode
                  </>
                )}
              </button>
              
              <button 
                className="flex w-full items-center py-2 px-3 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors group"
                onClick={() => setPasswordModalOpen(true)}
              >
                <svg className="h-5 w-5 mr-3 text-slate-300 group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Change Password
              </button>
            </div>
          </div>
          
          {/* Help & Support Section */}
          <div className="pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Help & Support</h3>
            <div className="space-y-1">
              <a 
                href="mailto:support@quotebid.com" 
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors group"
              >
                <svg className="h-5 w-5 mr-3 text-slate-300 group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Support
              </a>
              
              <a 
                href="https://calendly.com/rubicon-pr-group/quotebid" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center py-2 px-3 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors group"
              >
                <svg className="h-5 w-5 mr-3 text-slate-300 group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Book a Call
              </a>
            </div>
          </div>
          
          {/* Help text at bottom of sidebar */}
          <div className="pt-6 mt-6 border-t border-slate-700">
            <p className="text-xs text-slate-400 text-center">
              Need help? <a href="mailto:support@quotebid.com" className="text-blue-400 hover:text-blue-300 hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive margin to account for sidebar */}
              <div className={`lg:ml-72 transition-all duration-300 ease-in-out flex-1 p-8 ${sidebarOpen ? 'ml-72' : 'ml-0'} account-content-area bg-slate-900`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-slate-100">Profile Dashboard</h1>
          
          {!user ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-qpurple" />
            </div>
          ) : isEditing === true ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-100">Edit Profile</h1>
                <Button 
                  variant="ghost" 
                  className="!text-slate-300 hover:!text-slate-100 hover:!bg-slate-800"
                  onClick={() => setIsEditing(false)}
                  disabled={profileUpdateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>

              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-100">Profile Information</CardTitle>
                  <CardDescription className="text-slate-400">
                    This information will be used by journalists to understand your expertise
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Profile photo upload section */}
                      <div className="mb-6">
                        <h3 className="text-sm font-medium mb-3 text-slate-200">Profile Photo</h3>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 relative overflow-hidden flex-shrink-0">
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
                              className="flex items-center justify-center w-full h-full bg-slate-700 text-slate-300 font-bold text-3xl" 
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
                        <p className="text-xs text-slate-400 mt-2">
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
                              <FormLabel className="text-slate-200">Full Name*</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="John Smith" 
                                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                  {...field} 
                                />
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
                              <FormLabel className="text-slate-200">Location*</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="New York, NY" 
                                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Contact info section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200">Email*</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="john@example.com" 
                                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    checkEmailUnique(e.target.value);
                                  }}
                                />
                              </FormControl>
                              <div className="h-4 mt-1">
                                                            {emailChecking && <div className="text-xs text-slate-400">Checking email...</div>}
                            {!emailChecking && !emailValid && <div className="text-xs text-red-400">Please enter a valid email address.</div>}
                            {!emailChecking && emailValid && !emailUnique && <div className="text-xs text-red-400">Email is already in use.</div>}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="phone_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200">Phone</FormLabel>
                              <div className="flex gap-3">
                                <select
                                  value={countryCode}
                                  onChange={(e) => setCountryCode(e.target.value)}
                                  className="rounded-md border border-slate-600 bg-slate-800 text-slate-200 px-2 py-2 w-20 text-sm"
                                  style={{ backgroundColor: 'rgb(30 41 59)', borderColor: 'rgb(71 85 105)' }}
                                >
                                  {COUNTRY_CODES.map(({ code, country, flag }) => (
                                    <option key={code} value={code} style={{ backgroundColor: 'rgb(30 41 59)', color: 'rgb(226 232 240)' }}>
                                      {flag} {code}
                                    </option>
                                  ))}
                                </select>
                                <FormControl>
                                  <Input 
                                    type="tel" 
                                    placeholder="Phone number"
                                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                    value={formattedPhone}
                                    onChange={(e) => {
                                      const cleaned = e.target.value.replace(/[^\d\s\-() ]/g, '');
                                      const formatted = formatPhoneNumber(cleaned, countryCode);
                                      setFormattedPhone(formatted);
                                      
                                      // Update form with full international number
                                      const digitsOnly = cleaned.replace(/\D/g, '');
                                      const fullPhone = countryCode + digitsOnly;
                                      field.onChange(fullPhone);
                                      
                                      // Check uniqueness
                                      checkPhoneUnique(formatted);
                                    }}
                                  />
                                </FormControl>
                              </div>
                              <div className="h-4 mt-1">
                                {phoneChecking && <div className="text-xs text-slate-400">Checking phone number...</div>}
                                {!phoneChecking && !phoneValid && <div className="text-xs text-red-400">Please enter a valid phone number.</div>}
                                {!phoneChecking && phoneValid && !phoneUnique && <div className="text-xs text-red-400">Phone number is already in use.</div>}
                              </div>
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
                            <FormLabel className="text-slate-200">Professional Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="CEO of QuoteBid" 
                                className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-slate-400">Your professional title (e.g., "CEO of QuoteBid", "Finance Expert", etc.)</p>
                          </FormItem>
                        )}
                      />
                      
                      {/* Bio section */}
                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Professional Bio*</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your background, expertise, and what you can offer to journalists..."
                                className="min-h-[120px] bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
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
                            <FormLabel className="text-slate-200">Primary Industry*</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                                  <SelectValue placeholder="Select your industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                                {INDUSTRY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value} className="text-slate-100 hover:bg-slate-700">
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
                            <FormLabel className="text-slate-200">
                              Do-Follow Link
                              <span className="text-slate-400 text-xs ml-2">(For article placements)</span>
                            </FormLabel>
                            <Select
                              value={field.value || "website"}
                              onValueChange={field.onChange}
                              required
                            >
                              <FormControl>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                                  <SelectValue placeholder="Select a link to use in articles" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                                <SelectItem value="website" className="text-slate-100 hover:bg-slate-700">Website</SelectItem>
                                <SelectItem value="linkedIn" className="text-slate-100 hover:bg-slate-700">LinkedIn</SelectItem>
                                <SelectItem value="instagram" className="text-slate-100 hover:bg-slate-700">Instagram</SelectItem>
                                <SelectItem value="twitter" className="text-slate-100 hover:bg-slate-700">X</SelectItem>
                                <SelectItem value="other" className="text-slate-100 hover:bg-slate-700">Other URL</SelectItem>
                              </SelectContent>
                            </Select>
                            {(field.value === "custom" || field.value === "other") && (
                              <Input 
                                placeholder="https://example.com" 
                                value={typeof field.value === "string" && field.value.startsWith("http") ? field.value : ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="mt-2 bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                              />
                            )}
                            <FormDescription className="text-slate-400">
                              Select which link to include at the end of quotes in articles
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Social links section */}
                      <div>
                        <h3 className="text-lg font-medium mb-4 text-slate-200">Online Profiles & Web Presence</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="linkedIn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-200">LinkedIn</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://linkedin.com/in/username" 
                                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                    {...field} 
                                  />
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
                                <FormLabel className="text-slate-200">Website</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://yourwebsite.com" 
                                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                    {...field} 
                                  />
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
                                <FormLabel className="text-slate-200">Instagram</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://instagram.com/username" 
                                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                    {...field} 
                                  />
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
                                <FormLabel className="text-slate-200">X</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://x.com/username" 
                                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                    {...field} 
                                  />
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
                                <FormLabel className="text-slate-200">Other URL (Optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="https://yourwebsite.com" 
                                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription className="text-slate-400">
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
                          className="!bg-slate-800 !border-slate-600 !text-slate-300 hover:!bg-slate-700 hover:!text-slate-100"
                          onClick={() => setIsEditing(false)}
                          disabled={profileUpdateMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600"
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
              <Loader2 className="h-8 h-8 animate-spin text-qpurple" />
            </div>
          ) : (
            <>
              {/* Header with name and title */}
              <div className="mb-6">
                {user.fullName && (
                  <h2 className="text-xl font-semibold mb-1 text-slate-100">{user.fullName}</h2>
                )}
                {user.title && (
                  <p className="text-md text-slate-300 font-medium mb-2">{user.title}</p>
                )}
                <div className="flex items-center">
                  <p className="text-slate-400">
                    {user.industry ? (
                      <span>{user.industry}</span>
                    ) : (
                      <span className="text-slate-500 italic">Add your industry in profile settings</span>
                    )}
                  </p>
                  <Button variant="ghost" size="sm" className="ml-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800" onClick={() => {
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
              
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-800 border border-slate-700">
                  <TabsTrigger value="info" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">
                    <User className="h-4 w-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">
                    <CreditCard className="h-4 w-4" />
                    Billing
                  </TabsTrigger>
                  <TabsTrigger value="email-preferences" className="flex items-center gap-2 text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">
                    <Mail className="h-4 w-4" />
                    Email Preferences
                  </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="info" className="space-y-6">
              {/* Bio Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">PROFESSIONAL BIO</h2>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                  <div className="text-slate-300">
                    {user.bio ? (
                      <p className="whitespace-pre-line">{user.bio}</p>
                    ) : (
                      <p className="text-slate-500 italic">No bio information added yet. Add a professional bio to help journalists understand your expertise.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">CONTACT INFORMATION</h2>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Location</h3>
                    <p className="text-slate-200">{user.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Email</h3>
                    <p className="text-slate-200">{user.email}</p>
                  </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-1">Phone</h3>
                        <p className="text-slate-200">{(user as any).phone_number || 'Not specified'}</p>
                      </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Website</h3>
                    {user.website ? (
                      <p className="text-slate-200">
                        Website (<a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">View</a>)
                      </p>
                    ) : (
                      <p className="text-slate-500 italic">Not specified</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Industry</h3>
                    <p className="text-slate-200">{user.industry || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Do-Follow Link</h3>
                    {user.doFollowLink && user.doFollowLink !== 'none' ? (
                      <p className="text-slate-200">
                        {user.doFollowLink === 'website' && user.website ? (
                          <>Website (<a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">View</a>)</>
                        ) : user.doFollowLink === 'linkedIn' && user.linkedIn ? (
                          <>LinkedIn (<a href={user.linkedIn} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">View</a>)</>
                        ) : user.doFollowLink === 'twitter' && user.twitter ? (
                          <>X (<a href={user.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">View</a>)</>
                        ) : user.doFollowLink === 'instagram' && user.instagram ? (
                          <>Instagram (<a href={user.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">View</a>)</>                  
                        ) : user.doFollowLink === 'other' && user.otherProfileUrl ? (
                          <>Website (<a href={user.otherProfileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">View</a>)</>                  
                        ) : user.doFollowLink.startsWith('http') ? (
                          <>Custom URL (<a href={user.doFollowLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">View</a>)</>
                        ) : (
                          'Not properly configured'
                        )}
                      </p>
                    ) : (
                      <p className="text-red-400 italic">Required - set a do-follow link for article quotes</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Online Profiles & Web Presence */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">ONLINE PROFILES & WEB PRESENCE</h2>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* LinkedIn */}
                    <div className="flex items-center">
                      <div className="bg-slate-800 rounded-md p-2 mr-3">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </div>
                      {user.linkedIn ? (
                        <a href={user.linkedIn} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline text-sm font-medium">
                          LinkedIn
                        </a>
                      ) : (
                        <p className="text-slate-500 italic text-sm">No LinkedIn added</p>
                      )}
                    </div>
                    
                    {/* X (formerly Twitter) */}
                    <div className="flex items-center">
                      <div className="bg-slate-800 rounded-md p-2 mr-3">
                        <svg className="h-5 w-5 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </div>
                      {user.twitter ? (
                        <a href={user.twitter || ''} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline text-sm font-medium">
                          X
                        </a>
                      ) : (
                        <p className="text-slate-500 italic text-sm">No X added</p>
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
                        <a href={user.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline text-sm font-medium">
                          Instagram
                        </a>
                      ) : (
                        <p className="text-slate-500 italic text-sm">No Instagram added</p>
                      )}
                    </div>
                    
                    {/* Website */}
                    {user.otherProfileUrl && (
                      <div className="flex items-center">
                        <div className="bg-slate-800 rounded-md p-2 mr-3">
                          <svg className="h-5 w-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 8v8"></path>
                            <path d="M8 12h8"></path>
                          </svg>
                        </div>
                        <a href={user.otherProfileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline text-sm font-medium">
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Media Coverage Section - Dark Theme Optimized */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">MEDIA COVERAGE</h2>
                    <p className="text-xs text-slate-400 mt-1">Powered by QuoteBid</p>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
                  {(mediaCoverage && mediaCoverage.length > 0) ? (
                    <div className="p-6">
                      <div className="grid grid-cols-1 gap-6">
                        {/* Media coverage from database */}
                        {mediaCoverage.map((coverage: any, index: number) => {
                          // Get logo URL with fallback system
                          const getLogoUrl = () => {
                            const logo = coverage.publicationLogo;
                            
                            console.log(`MediaCoverage DEBUG - ${coverage.publication}:`, {
                              publicationLogo: coverage.publicationLogo,
                              publication: coverage.publication,
                              placementId: coverage.placementId,
                              source: coverage.source
                            });
                            
                            // First try the database logo
                            if (logo && logo.trim() && logo !== 'null' && logo !== 'undefined') {
                              const logoUrl = logo.startsWith('http') || logo.startsWith('data:') 
                                ? logo 
                                : `${window.location.origin}${logo}`;
                              console.log(`Using database logo: ${logoUrl}`);
                              return logoUrl;
                            }
                            
                            // Fallback: try to find logo from publications database
                            if (coverage.publication && allPublications) {
                              // Find publication by name (case insensitive)
                              const publication = allPublications.find(pub => 
                                pub.name.toLowerCase() === coverage.publication.toLowerCase()
                              );
                              
                              if (publication && publication.logo) {
                                const dbLogo = publication.logo;
                                const logoUrl = dbLogo.startsWith('http') || dbLogo.startsWith('data:') 
                                  ? dbLogo 
                                  : `${window.location.origin}${dbLogo}`;
                                console.log(`Found database logo for ${coverage.publication}: ${logoUrl.substring(0, 50)}...`);
                                return logoUrl;
                              }
                              
                              console.log(`No database logo found for ${coverage.publication}`);
                            }
                            
                            console.log(`No logo found for ${coverage.publication}`);
                            return '';
                          };

                          const logoUrl = getLogoUrl();
                          
                          return (
                          <div key={`coverage-${coverage.id}`} className="group relative bg-slate-900 rounded-xl border border-slate-700 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 p-6 hover:border-blue-400/60 transform hover:-translate-y-2 hover:scale-[1.02]">
                            {/* Enhanced gradient accent line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-t-xl shadow-sm"></div>
                            
                            {/* Publication logo */}
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform bg-white border-2 border-slate-600 overflow-hidden shadow-sm">
                                {logoUrl ? (
                                  <img
                                    src={logoUrl}
                                    alt={`${coverage.publication || 'Publication'} logo`}
                                    className="w-full h-full object-contain opacity-100 filter-none"
                                    loading="lazy"
                                    style={{ opacity: '1 !important', filter: 'none !important' }}
                                    onError={(e) => {
                                      // Hide the image and show fallback
                                      e.currentTarget.style.display = 'none';
                                      const fallback = e.currentTarget.nextElementSibling;
                                      if (fallback && fallback instanceof HTMLElement) {
                                        fallback.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                {/* Text-based fallback when logo fails or is not available */}
                                <div 
                                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl opacity-100"
                                  style={{ display: logoUrl ? 'none' : 'flex', opacity: '1 !important' }}
                                >
                                  <span className="text-xs font-semibold text-white text-center px-1">
                                    {coverage.publication?.split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-100 text-lg leading-tight mb-2 group-hover:text-blue-300 transition-colors">{coverage.title}</h3>
                                
                                <div className="flex items-center mb-4">
                                  <div className="flex items-center text-sm text-slate-300">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                    <span className="font-medium">{coverage.publication || 'Publication'}</span>
                                    {coverage.articleDate && (
                                      <>
                                        <span className="mx-2 text-slate-500">•</span>
                                        <span className="text-slate-400">
                                          {new Date(coverage.articleDate).toLocaleDateString()}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-slate-700 text-slate-200 border border-slate-600">
                                      <svg className="h-3.5 w-3.5 mr-1.5 text-slate-200" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      {coverage.source === 'billing_manager' || coverage.source === 'pitch_success' ? 'Earned Placement' : 'Media Coverage'}
                                    </span>
                                    
                                    {/* Success metrics indicator */}
                                    <div className="hidden sm:flex items-center text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded-md border border-slate-500 font-bold">
                                      <svg className="h-3 w-3 mr-1 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      Featured
                                    </div>
                                  </div>
                                  
                                  {coverage.url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-white transition-all duration-200 font-bold"
                                    >
                                      <a href={coverage.url} target="_blank" rel="noopener noreferrer" className="flex items-center font-bold text-white">
                                        <ExternalLink className="h-4 w-4 mr-1.5" />
                                        View Article
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-16 px-6">
                      <div className="flex flex-col items-center max-w-md mx-auto">
                        {/* Enhanced empty state with gradient background */}
                        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-slate-700">
                          <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-100 mb-2">No published articles yet</h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">When you get quoted through QuoteBid opportunities, your published articles will appear here as beautiful portfolio pieces.</p>
                        <Button variant="default" size="sm" asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200">
                          <a href="/opportunities" className="flex items-center">
                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Browse Opportunities
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Support Section */}
              <Card className={theme === 'light' ? 'bg-white border-gray-200' : 'bg-slate-800 border-slate-700'}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`${theme === 'light' ? 'bg-gray-100' : 'bg-slate-700'} rounded-full p-2`}>
                      <User className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} mb-1`}>Need help with your profile?</h4>
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'} mb-3`}>
                        Our team can help optimize your profile to increase your chances of getting quoted.
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                          asChild
                        >
                          <a href="https://calendly.com/rubicon-pr-group/quotebid" target="_blank" rel="noopener noreferrer">
                            Book a Call
                          </a>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className={theme === 'light' ? '!bg-white !border-gray-300 !text-gray-700 hover:!bg-gray-50 hover:!text-gray-900' : '!bg-slate-800 !border-slate-600 !text-slate-300 hover:!bg-slate-700 hover:!text-slate-100'}
                          asChild
                        >
                          <a href="mailto:support@quotebid.com">
                            Email Support
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="space-y-6">
                  <BillingTabContent 
                    user={user} 
                    subscription={subscription} 
                    isLoadingSubscription={isLoadingSubscription}
                    onOpenSubscriptionModal={() => setSubscriptionModalOpen(true)}
                  />
                </TabsContent>

                {/* Email Preferences Tab */}
                <TabsContent value="email-preferences" className="space-y-6">
                  <EmailPreferences />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Pitch Chat Modal */}
      {selectedPitchId && (
        <PitchChatModal
          isOpen={isChatModalOpen}
          onClose={closeChatModal}
          pitchId={selectedPitchId}
          pitchTitle={selectedPitchTitle}
          isAdmin={false}
        />
      )}

      {/* Subscription Modal */}
      <Dialog open={subscriptionModalOpen} onOpenChange={setSubscriptionModalOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Manage Your Subscription</DialogTitle>
            <DialogDescription className="text-slate-400">
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
                    <h3 className="text-xl font-bold text-slate-100">QuoteBid {subscription.isPremium ? 'Premium' : 'Basic'}</h3>
                    <p className="text-sm text-slate-400">
                      Status: <span className={`font-medium ${subscription.status === 'active' ? 'text-green-400' : 'text-amber-400'}`}>
                        {subscription.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                    {subscription.expiresAt && (
                      <p className="text-sm text-slate-400 mt-1">
                        {subscription.status === 'active' ? 'Next billing date' : 'Expires'}: {formatDate(subscription.expiresAt)}
                      </p>
                    )}
                  </div>
                  <div className="border border-slate-600 rounded-lg p-3 text-center bg-slate-800">
                    <p className="text-xs text-slate-400">Monthly Price</p>
                    <p className="text-2xl font-bold text-slate-100">
                      $99.99
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-100">Plan Includes:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2 shrink-0 mt-0.5" />
                      <span className="text-slate-300">Unlimited pitches to media opportunities</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2 shrink-0 mt-0.5" />
                      <span className="text-slate-300">Priority matching with journalists</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2 shrink-0 mt-0.5" />
                      <span className="text-slate-300">Access to premium tier opportunities</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2 shrink-0 mt-0.5" />
                      <span className="text-slate-300">Professional profile with social links</span>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400">No active subscription found.</p>
                <Button className="mt-4">
                  Subscribe Now
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            {subscription && subscription.status === 'active' && (
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

      {/* Cancel Subscription Retention Modal */}
      <CancelRetentionModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onConfirmCancel={handleCancelSubscription}
        isLoading={cancellingSubscription}
      />

      {/* Add Media Coverage Modal */}
      <Dialog open={addMediaModalOpen} onOpenChange={setAddMediaModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editingMediaItem ? 'Edit Media Coverage' : 'Add Media Coverage'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingMediaItem 
                ? 'Update the details about this media coverage item.'
                : 'Add details about media coverage you\'ve received to showcase on your profile.'
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...mediaForm}>
            <form onSubmit={mediaForm.handleSubmit(handleAddMedia)} className="space-y-4">
              <FormField
                control={mediaForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">Article URL *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/article" 
                        {...field}
                        onChange={(e) => handleUrlChange(e.target.value, field.onChange)}
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400">
                      {fetchingTitle ? (
                        <span className="text-blue-400 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Fetching article info...
                        </span>
                      ) : editingMediaItem ? (
                        "Enter the URL of the article or media coverage."
                      ) : (
                        "Paste the article URL first - we'll automatically detect the title and date for you!"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={mediaForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">Article/Coverage Title</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="Title will be auto-filled from URL above" 
                          {...field} 
                        />
                        {fetchingTitle && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                          </div>
                        )}
                      </div>
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
                    <FormLabel className="text-slate-200">Publication Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. TechCrunch, Forbes, etc." {...field} />
                    </FormControl>
                    <FormDescription className="text-slate-400">
                      Name of the publication or website that published the article
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Powered by QuoteBid AI Section */}
              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-800 rounded-lg p-3">
                  <span>Powered By:</span>
                  <div className="flex items-center">
                    <span className="text-blue-400 font-bold text-sm">QuoteBid</span>
                    <span className="text-purple-400 font-bold text-sm ml-1">AI</span>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setAddMediaModalOpen(false);
                  setEditingMediaItem(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMediaItem ? 'Update Media' : 'Add Media'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Password & Security Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Change Password
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your account password
            </DialogDescription>
          </DialogHeader>
          
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4 py-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">Current Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter current password"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-slate-400">
                      Password must be at least 8 characters long
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    passwordForm.reset();
                    setPasswordModalOpen(false);
                  }}
                  disabled={passwordChangeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={passwordChangeMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                >
                  {passwordChangeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Theme Switch Confirmation Modal */}
      <Dialog open={themeModalOpen} onOpenChange={setThemeModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              {theme === 'light' ? (
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
              Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to switch to {theme === 'light' ? 'dark' : 'light'} mode? This will change the appearance of the entire application.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {theme === 'light' ? (
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-slate-100">
                    {theme === 'light' ? 'Dark Mode Experience' : 'Light Mode Experience'}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {theme === 'light' 
                      ? 'Sleek dark interface designed for evening use and reduced eye strain.'
                      : 'Clean bright interface perfect for daytime use and maximum readability.'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-slate-400 mb-4">
              You can always switch back at any time from the account settings.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setThemeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                toggleTheme();
                setThemeModalOpen(false);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {theme === 'light' ? (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Switch to Dark Mode
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Switch to Light Mode
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}