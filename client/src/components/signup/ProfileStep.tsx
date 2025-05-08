import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { advanceSignupStage, getSignupEmail, updateSignupProfile } from '@/lib/signup-wizard';
import { useSignupWizard } from '@/contexts/SignupWizardContext';
import { apiRequest } from '@/lib/queryClient';

interface ProfileStepProps {
  onComplete: (jwt: string) => void;
}

export function ProfileStep({ onComplete }: ProfileStepProps) {
  const { toast } = useToast();
  const { refreshStage } = useSignupWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const email = getSignupEmail();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Error',
        description: 'Email not found. Please restart the signup process.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!fullName.trim()) {
      toast({
        title: 'Full Name Required',
        description: 'Please enter your full name to complete your profile.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Update profile information
      const profileData = {
        fullName,
        company_name: companyName,
        phone_number: phoneNumber,
      };
      
      await updateSignupProfile(email, profileData);
      
      // If avatar was uploaded, handle that separately
      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);
        
        // Using a temporary endpoint that doesn't require authentication
        await fetch(`/api/signup-stage/${encodeURIComponent(email)}/avatar`, {
          method: 'POST',
          body: formData,
        });
      }
      
      // Advance signup stage
      await advanceSignupStage(email, 'profile');
      
      // Refresh the context state
      await refreshStage();
      
      // Get JWT token
      const response = await apiRequest('POST', `/api/signup-stage/${encodeURIComponent(email)}/complete`, {});
      const data = await response.json();
      
      toast({
        title: 'Profile Complete',
        description: 'Your profile has been set up successfully!',
      });
      
      // Call the onComplete callback with the JWT token
      onComplete(data.token);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Profile Update Error',
        description: 'There was an error updating your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Complete Your Profile</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Please provide the following information to complete your profile setup.
        </p>
        
        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
            />
          </div>
          
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>
          
          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label htmlFor="avatar">Profile Picture (Optional)</Label>
            <div className="flex items-center space-x-4">
              <div 
                className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border"
              >
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="h-6 w-6 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1">
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a profile picture (JPG, PNG, max 5MB)
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500 mt-6 mb-6">
          * Required field
        </div>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-[#004684] hover:bg-[#003a70] text-white"
            disabled={isLoading || !fullName.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Complete Setup"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}