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


interface ProfileStepProps {
  onComplete: (jwt: string) => void;
}

const AvatarSVG = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="40" fill="rgba(255, 255, 255, 0.1)" />
    <circle cx="40" cy="32" r="16" fill="rgba(255, 255, 255, 0.3)" />
    <ellipse cx="40" cy="60" rx="24" ry="12" fill="rgba(255, 255, 255, 0.3)" />
  </svg>
);

export function ProfileStep({ onComplete }: ProfileStepProps) {
  const { toast } = useToast();
  const { refreshStage } = useSignupWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [title, setTitle] = useState('');

  const [bio, setBio] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [doFollow, setDoFollow] = useState('');
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
    // Only validate required fields
    if (!fullName.trim() || !location.trim() || !title.trim() || !bio.trim()) {
      toast({ title: 'Required Fields', description: 'Please fill out all required fields to complete your profile.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await updateSignupProfile(email, {
        fullName,
        location,
        title,
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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-violet-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-800 to-purple-800 text-white p-8 sm:p-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-white">
            Complete Your Expert Profile
          </h2>
          <p className="text-lg text-blue-100 font-medium">
            Tell us about your expertise so journalists can find you for the perfect media opportunities
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-8">
          {/* Avatar Upload Section */}
          <div className="mb-10 text-center">
            <Label className="text-lg font-semibold text-white mb-6 block">
              Profile Photo
            </Label>
            <div className="relative inline-block">
              <div className="w-36 h-36 rounded-full overflow-hidden bg-white/20 flex items-center justify-center mx-auto border-2 border-white/40 shadow-xl">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <AvatarSVG />
                )}
              </div>
              <label htmlFor="avatar-upload" className="absolute bottom-2 right-2 bg-white text-purple-600 rounded-full p-3 cursor-pointer shadow-xl hover:bg-gray-100 transition-all hover:scale-110">
                <Camera className="h-6 w-6" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-base text-white/80 mt-4 font-medium">
              Professional headshots get 7x more responses
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-8">
            {/* Name and Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <Label htmlFor="fullName" className="text-lg font-semibold text-white mb-4 block">
                  Full Name *
                </Label>
                <Input 
                  id="fullName" 
                  type="text" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required 
                  placeholder="Your full name"
                  className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl"
                />
              </div>
              <div>
                <Label htmlFor="location" className="text-lg font-semibold text-white mb-4 block">
                  Location *
                </Label>
                <Input 
                  id="location" 
                  type="text" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  required 
                  placeholder="City, State, Country"
                  className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl"
                />
              </div>
            </div>

            {/* Professional Title */}
            <div>
              <Label htmlFor="title" className="text-lg font-semibold text-white mb-4 block">
                Professional Title *
              </Label>
              <Input 
                id="title" 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required
                placeholder="CEO, Founder, Expert, etc."
                className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl"
              />
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio" className="text-lg font-semibold text-white mb-4 block">
                Professional Bio *
              </Label>
              <textarea 
                id="bio" 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                required 
                placeholder="Describe your expertise, experience, and what makes you a valuable source for journalists..."
                className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[140px] resize-none shadow-lg hover:shadow-xl font-sans"
              />
            </div>

            {/* Online Presence Section */}
            <div className="bg-white/10 rounded-2xl p-8">
              <h3 className="font-semibold text-xl mb-8 text-white">Online Presence (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <Label htmlFor="linkedin" className="text-lg font-semibold text-white mb-4 block">
                    LinkedIn
                  </Label>
                  <Input 
                    id="linkedin" 
                    type="url" 
                    value={linkedin} 
                    onChange={e => setLinkedin(e.target.value)} 
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="text-lg font-semibold text-white mb-4 block">
                    Website
                  </Label>
                  <Input 
                    id="website" 
                    type="url" 
                    value={website} 
                    onChange={e => setWebsite(e.target.value)} 
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter" className="text-lg font-semibold text-white mb-4 block">
                    X / Twitter
                  </Label>
                  <Input 
                    id="twitter" 
                    type="url" 
                    value={twitter} 
                    onChange={e => setTwitter(e.target.value)} 
                    placeholder="https://x.com/username"
                    className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram" className="text-lg font-semibold text-white mb-4 block">
                    Instagram
                  </Label>
                  <Input 
                    id="instagram" 
                    type="url" 
                    value={instagram} 
                    onChange={e => setInstagram(e.target.value)} 
                    placeholder="https://instagram.com/username"
                    className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl"
                  />
                </div>
              </div>
              
              {/* Do-Follow Link Section */}
              <div className="mt-8">
                <Label htmlFor="doFollow" className="text-lg font-semibold text-white mb-4 block">
                  Do-Follow Link (For article placements)
                </Label>
                <div className="relative">
                  <select 
                    id="doFollow" 
                    value={doFollow} 
                    onChange={e => setDoFollow(e.target.value)} 
                    className="w-full px-4 py-3 text-base rounded-xl bg-white text-black border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none shadow-lg hover:shadow-xl font-sans"
                  >
                    <option value="" className="bg-white text-black">Select a do-follow link</option>
                    <option value="None" className="bg-white text-black">None</option>
                    <option value="LinkedIn" className="bg-white text-black">LinkedIn</option>
                    <option value="Website" className="bg-white text-black">Website</option>
                    <option value="Twitter" className="bg-white text-black">X</option>
                    <option value="Instagram" className="bg-white text-black">Instagram</option>
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <p className="text-base text-white/80 mt-4">
                  Select which link to include at the end of quotes in articles
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-blue-700 text-white py-4 rounded-xl text-lg font-bold shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
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