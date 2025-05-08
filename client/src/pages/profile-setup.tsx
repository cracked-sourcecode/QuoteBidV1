import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { insertUserSchema } from '@shared/schema';
import { SignupWizard } from '@/components/signup/SignupWizard';

// UI Components
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, CheckCircle } from 'lucide-react';

// Constants
import { INDUSTRY_OPTIONS } from '@/lib/constants';

// Form validation schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required" }),
  bio: z.string().min(10, { message: "Please provide a short bio (at least 10 characters)" }),
  location: z.string().min(2, { message: "Location is required" }),
  industry: z.string().min(1, { message: "Please select your industry" }),
  linkedIn: z.string().url({ message: "Please enter a valid LinkedIn URL" }).optional().or(z.literal("")),
  instagram: z.string().url({ message: "Please enter a valid Instagram URL" }).optional().or(z.literal("")),
  twitter: z.string().url({ message: "Please enter a valid X.com URL" }).optional().or(z.literal("")),
  website: z.string().url({ message: "Please enter a valid website URL" }).optional().or(z.literal("")),
  pastPrLinks: z.string().optional(),
  avatar: z.string().optional(),
});

export default function ProfileSetup() {
  const { user, isLoading: isUserLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize the form with the user's data if available
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      bio: user?.bio || "",
      location: user?.location || "",
      industry: user?.industry || "",
      linkedIn: user?.linkedIn || "",
      instagram: user?.instagram || "",
      twitter: user?.twitter || user?.facebook || "",
      website: user?.website || "",
      pastPrLinks: user?.pastPrLinks || "",
      avatar: user?.avatar || "",
    },
  });
  
  // Update form values when user data is loaded
  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName || "",
        bio: user.bio || "",
        location: user.location || "",
        industry: user.industry || "",
        linkedIn: user.linkedIn || "",
        instagram: user.instagram || "",
        twitter: user.twitter || user.facebook || "",
        website: user.website || "",
        pastPrLinks: user.pastPrLinks || "",
        avatar: user.avatar || "",
      });
      
      // Set avatar preview if user has an avatar
      if (user.avatar) {
        setAvatarPreview(user.avatar);
      }
    }
  }, [user, form]);
  
  // Redirect to opportunities if profile is already completed
  useEffect(() => {
    if (user?.profileCompleted) {
      setIsRedirecting(true);
      setTimeout(() => {
        setLocation('/opportunities');
      }, 1500);
    }
  }, [user, setLocation]);
  
  // If user is redirecting, show loading state
  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-center">Profile Already Completed!</h2>
              <p className="text-gray-500 text-center mt-2">Redirecting to opportunities...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If user is loading, show loading state
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  // If user is not authenticated, redirect to auth page
  if (!user) {
    setLocation('/auth');
    return null;
  }
  
  // Handle avatar file selection
  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // 5MB file size limit
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        });
        return;
      }
      
      // Only accept image files
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      
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
  
  // Upload avatar and submit profile form
  const onSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // First upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        
        const response = await fetch(`/api/users/${user.id}/avatar`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload avatar');
        }
        
        const result = await response.json();
        data.avatar = result.fileUrl;
      }
      
      // Then update profile
      await apiRequest('PATCH', `/api/users/${user.id}/profile`, {
        ...data,
        profileCompleted: true,
      });
      
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Redirect immediately to opportunities page
      setLocation('/opportunities');
      
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Create the page content
  const pageContent = (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="mt-2 text-lg text-gray-600">
            Tell us more about yourself to get the most out of QuoteBid
          </p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              This information will be used by journalists to understand your expertise and
              determine if you're a good fit for their media opportunity.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Avatar upload section */}
                <div className="flex flex-col items-center mb-6">
                  <div 
                    className="relative cursor-pointer group"
                    onClick={handleAvatarClick}
                  >
                    <Avatar className="h-32 w-32 border-2 border-gray-200">
                      <AvatarImage src={avatarPreview} alt={user?.fullName || "Profile"} />
                      <AvatarFallback className="bg-gray-100 text-3xl">
                        {user?.fullName?.charAt(0) || <User className="h-12 w-12 text-gray-400" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full transition-all flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                        Change Photo
                      </span>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Click to upload a profile photo (Max 5MB)
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
                
                {/* Social links section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Social Media (Optional)</h3>
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
                          <FormLabel>X.com / Twitter</FormLabel>
                          <FormControl>
                            <Input placeholder="https://x.com/username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Past PR Links */}
                <FormField
                  control={form.control}
                  name="pastPrLinks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Past PR Links (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share links to any past media coverage or articles you've been featured in..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      "Complete Profile & Continue"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
  
  // Wrap the content with the SignupWizard component when the feature flag is enabled
  return import.meta.env.VITE_NEXT_SIGNUP_WIZARD === 'true' 
    ? <SignupWizard>{pageContent}</SignupWizard>
    : pageContent;
}