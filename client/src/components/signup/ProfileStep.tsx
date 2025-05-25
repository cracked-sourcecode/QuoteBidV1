import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Camera, CheckCircle, User, MapPin, Briefcase, Globe, Linkedin, Twitter, Instagram, Link } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getSignupEmail, getSignupData, updateSignupProfile, clearSignupData } from '@/lib/signup-wizard';
import { useSignupWizard } from '@/contexts/SignupWizardContext';
import { post } from '@/lib/api';
import { apiFetch } from '@/lib/apiFetch';
import { INDUSTRY_OPTIONS } from "@/lib/constants";

interface ProfileStepProps {
  onComplete: (jwt: string) => void;
}

const AvatarSVG = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="#E5E7EB" />
    <circle cx="32" cy="26" r="12" fill="#A0AEC0" />
    <ellipse cx="32" cy="48" rx="16" ry="8" fill="#A0AEC0" />
  </svg>
);

export function ProfileStep({ onComplete }: ProfileStepProps) {
  const { toast } = useToast();
  const { refreshStage } = useSignupWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [bio, setBio] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [doFollow, setDoFollow] = useState('None');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const email = getSignupEmail();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB',
          variant: 'destructive'
        });
        return;
      }
      
      setAvatar(file);
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
        variant: 'destructive' 
      });
      return;
    }
    
    if (!fullName.trim() || !location.trim() || !industry.trim() || !bio.trim()) {
      toast({ 
        title: 'Required Fields', 
        description: 'Please fill out all required fields.', 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await updateSignupProfile(email, {
        fullName,
        location,
        title,
        industry,
        bio,
      });
      
      // Upload avatar if provided
      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);
        await apiFetch(`/api/signup-stage/${encodeURIComponent(email)}/avatar`, {
          method: 'POST',
          body: formData,
        });
      }
      
      const completeRes = await post(`/api/signup-stage/${encodeURIComponent(email)}/complete`, {});
      
      if (completeRes.success && completeRes.token) {
        const { token } = completeRes;
        
        // Store JWT in localStorage
        localStorage.setItem('token', token);
        
        // Clear signup data
        clearSignupData();
        
        // Show success message
        toast({
          title: 'Profile Complete!',
          description: 'Welcome to QuoteBid. Redirecting to opportunities...',
        });
        
        // Small delay to ensure storage is complete
        setTimeout(() => {
          onComplete(token);
        }, 50);
      } else {
        throw new Error('Failed to complete signup - no token received');
      }
    } catch (error: any) {
      toast({ 
        title: 'Profile Update Error', 
        description: error.message || 'There was an error updating your profile. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto px-4 py-6 md:py-8">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Complete Your Expert Profile</h2>
          <p className="text-blue-100 text-sm md:text-base">
            Tell us about your expertise so journalists can find you for the perfect media opportunities
          </p>
        </div>

        <div className="p-6 md:p-8">
          {/* Profile Photo Section - Mobile Optimized */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <User className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                  <Camera className="w-4 h-4" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-lg">Profile Photo</h3>
                <p className="text-sm text-gray-600">Professional headshots get 7x more responses</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName" className="flex items-center gap-1">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="fullName" 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    required 
                    placeholder="John Doe"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="location" 
                    type="text" 
                    value={location} 
                    onChange={e => setLocation(e.target.value)} 
                    required 
                    placeholder="New York, NY, USA"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="title" className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    Professional Title
                  </Label>
                  <Input 
                    id="title" 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="CEO, Founder, Expert"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="industry" className="flex items-center gap-1">
                    Industry <span className="text-red-500">*</span>
                  </Label>
                  <Select value={industry} onValueChange={setIndustry} required>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div>
              <Label htmlFor="bio" className="flex items-center gap-1">
                Professional Bio <span className="text-red-500">*</span>
              </Label>
              <Textarea 
                id="bio" 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                required 
                placeholder="Describe your expertise, experience, and what makes you a valuable source for journalists..."
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                This bio will be visible to journalists looking for expert sources
              </p>
            </div>

            {/* Online Presence */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-600" />
                Online Presence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkedin" className="flex items-center gap-1">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </Label>
                  <Input 
                    id="linkedin" 
                    type="url" 
                    value={linkedin} 
                    onChange={e => setLinkedin(e.target.value)} 
                    placeholder="https://linkedin.com/in/username"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    Website
                  </Label>
                  <Input 
                    id="website" 
                    type="url" 
                    value={website} 
                    onChange={e => setWebsite(e.target.value)} 
                    placeholder="https://yourwebsite.com"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter" className="flex items-center gap-1">
                    <Twitter className="w-4 h-4" />
                    X / Twitter
                  </Label>
                  <Input 
                    id="twitter" 
                    type="url" 
                    value={twitter} 
                    onChange={e => setTwitter(e.target.value)} 
                    placeholder="https://x.com/username"
                    className="h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram" className="flex items-center gap-1">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </Label>
                  <Input 
                    id="instagram" 
                    type="url" 
                    value={instagram} 
                    onChange={e => setInstagram(e.target.value)} 
                    placeholder="https://instagram.com/username"
                    className="h-12"
                  />
                </div>
              </div>
              
              {/* Do-Follow Link */}
              <div className="mt-4">
                <Label htmlFor="doFollow" className="flex items-center gap-1">
                  <Link className="w-4 h-4" />
                  Do-Follow Link (For article placements)
                </Label>
                <Select value={doFollow} onValueChange={setDoFollow}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Twitter">Twitter</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Select which link to include at the end of quotes in articles
                </p>
              </div>
            </div>
          </div>

          {/* Why Complete Profile - Mobile Optimized */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-blue-900">Why complete your profile?</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Get discovered by top-tier journalists',
                'Build your media presence and authority',
                'Automated matching with relevant opportunities',
                'Journalists see your full profile before pitching'
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <Button 
              type="submit" 
              className="w-full h-12 md:h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base md:text-lg font-semibold rounded-xl transition-all duration-200" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Completing Profile...
                </>
              ) : (
                'Complete & Start Using QuoteBid'
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}