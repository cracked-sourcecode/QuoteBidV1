import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Camera, Check } from 'lucide-react';
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
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="40" fill="#E5E7EB" />
    <circle cx="40" cy="32" r="16" fill="#9CA3AF" />
    <ellipse cx="40" cy="60" rx="24" ry="12" fill="#9CA3AF" />
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
      toast({ title: 'Error', description: 'Email not found. Please restart the signup process.', variant: 'destructive' });
      return;
    }
    if (!fullName.trim() || !location.trim() || !industry.trim() || !bio.trim()) {
      toast({ title: 'Required Fields', description: 'Please fill out all required fields.', variant: 'destructive' });
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
        linkedin,
        website,
        twitter,
        instagram,
        doFollow,
      });
      // Optionally upload avatar
      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);
        await apiFetch(`/api/signup-stage/${encodeURIComponent(email)}/avatar`, {
          method: 'POST',
          body: formData,
        });
      }
      const completeRes = await post(`/api/signup-stage/${encodeURIComponent(email)}/complete`, {});
      console.log('[ProfileStep] Complete response:', completeRes);
      
      if (completeRes.success && completeRes.token) {
        // 1️⃣ Get the JWT and user data
        const { token, user } = completeRes;
        
        // 2️⃣ Store JWT in localStorage
        localStorage.setItem('token', token);
        console.log('[ProfileStep] JWT stored, length:', token?.length);
        
        // 3️⃣ Clear signup data
        clearSignupData();
        
        // 4️⃣ Small delay to ensure storage is complete
        setTimeout(() => {
          console.log('[ProfileStep] Calling onComplete with token');
          onComplete(token);
        }, 50);
      } else {
        throw new Error('Failed to complete signup - no token received');
      }
    } catch (error: any) {
      toast({ title: 'Profile Update Error', description: error.message || 'There was an error updating your profile. Please try again.', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-white p-6 sm:p-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Complete Your Expert Profile</h2>
          <p className="text-sm sm:text-base opacity-90">
            Tell us about your expertise so journalists can find you for the perfect media opportunities
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          {/* Avatar Upload Section */}
          <div className="mb-8 text-center">
            <div className="relative inline-block">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <AvatarSVG />
                )}
              </div>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white rounded-full p-3 cursor-pointer shadow-lg hover:opacity-90 transition-opacity">
                <Camera className="h-5 w-5" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-3">
              Professional headshots get 7x more responses
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Name and Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 mb-1 block">
                  Full Name *
                </Label>
                <Input 
                  id="fullName" 
                  type="text" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required 
                  placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>
              <div>
                <Label htmlFor="location" className="text-sm font-medium text-gray-700 mb-1 block">
                  Location *
                </Label>
                <Input 
                  id="location" 
                  type="text" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  required 
                  placeholder="City, State, Country"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>
            </div>

            {/* Title and Industry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-1 block">
                  Professional Title
                </Label>
                <Input 
                  id="title" 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="CEO, Founder, Expert, etc."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your professional title (e.g., "CEO of QuoteBid", "Finance Expert", etc.)
                </p>
              </div>
              <div>
                <Label htmlFor="industry" className="text-sm font-medium text-gray-700 mb-1 block">
                  Primary Industry *
                </Label>
                <div className="relative">
                  <select
                    id="industry"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white"
                  >
                    <option value="">Select your industry</option>
                    {INDUSTRY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio" className="text-sm font-medium text-gray-700 mb-1 block">
                Professional Bio *
              </Label>
              <textarea 
                id="bio" 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                required 
                placeholder="Describe your expertise, experience, and what makes you a valuable source for journalists..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[120px] resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                This bio will be visible to journalists looking for expert sources
              </p>
            </div>

            {/* Online Presence Section */}
            <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
              <h3 className="font-semibold text-lg mb-4">Online Presence</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="linkedin" className="text-sm font-medium text-gray-700 mb-1 block">
                    LinkedIn
                  </Label>
                  <Input 
                    id="linkedin" 
                    type="url" 
                    value={linkedin} 
                    onChange={e => setLinkedin(e.target.value)} 
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="text-sm font-medium text-gray-700 mb-1 block">
                    Website
                  </Label>
                  <Input 
                    id="website" 
                    type="url" 
                    value={website} 
                    onChange={e => setWebsite(e.target.value)} 
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter" className="text-sm font-medium text-gray-700 mb-1 block">
                    X / Twitter
                  </Label>
                  <Input 
                    id="twitter" 
                    type="url" 
                    value={twitter} 
                    onChange={e => setTwitter(e.target.value)} 
                    placeholder="https://x.com/username"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram" className="text-sm font-medium text-gray-700 mb-1 block">
                    Instagram
                  </Label>
                  <Input 
                    id="instagram" 
                    type="url" 
                    value={instagram} 
                    onChange={e => setInstagram(e.target.value)} 
                    placeholder="https://instagram.com/username"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <Label htmlFor="doFollow" className="text-sm font-medium text-gray-700 mb-1 block">
                    Do-Follow Link (For article placements)
                  </Label>
                  <div className="relative">
                    <select 
                      id="doFollow" 
                      value={doFollow} 
                      onChange={e => setDoFollow(e.target.value)} 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white"
                    >
                      <option value="None">None</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Website">Website</option>
                      <option value="Twitter">Twitter</option>
                      <option value="Instagram">Instagram</option>
                    </select>
                    <svg className="pointer-events-none absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which link to include at the end of quotes in articles
                  </p>
                </div>
              </div>
            </div>

            {/* Why Complete Profile - Mobile */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-blue-100">
              <h3 className="font-semibold text-lg mb-3 text-gray-800">Why complete your profile?</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Get discovered by top-tier journalists</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Build your media presence and authority</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Automated matching with relevant opportunities</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Journalists see your full profile before pitching</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:opacity-90 text-white py-4 rounded-xl text-base sm:text-lg font-semibold shadow-lg transition-all duration-200" 
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
        </form>
      </div>
    </div>
  );
}