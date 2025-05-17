import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getSignupEmail, updateSignupProfile, clearSignupData } from '@/lib/signup-wizard';
import { useSignupWizard } from '@/contexts/SignupWizardContext';
import { post } from '@/lib/api';
import { INDUSTRY_OPTIONS } from "@/lib/constants";
import { useSignupGuard } from '@/hooks/useSignupGuard';

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
  useSignupGuard('profile');
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
        await fetch(`/api/signup-stage/${encodeURIComponent(email)}/avatar`, {
          method: 'POST',
          body: formData,
        });
      }
      const completeRes = await post(`/api/signup-stage/${encodeURIComponent(email)}/complete`, {});
      if (completeRes.success) {
        clearSignupData();
        onComplete(completeRes.token);
      } else {
        throw new Error('Failed to complete signup');
      }
    } catch (error: any) {
      toast({ title: 'Profile Update Error', description: error.message || 'There was an error updating your profile. Please try again.', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  
  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-2">Complete Your Expert Profile</h2>
      <p className="text-gray-600 mb-6">Tell us about your expertise so journalists can find you for the perfect media opportunities</p>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Profile Photo & Why box */}
        <div className="md:w-1/3 flex flex-col items-center">
          <div className="mb-4 flex flex-col items-center justify-center w-full">
            <div className="relative w-28 h-28 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mx-auto">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <AvatarSVG />
              )}
            </div>
            <label htmlFor="avatar-upload" className="block mt-2 w-full">
              <Button asChild type="button" variant="outline" className="w-full">
                <span>Upload Photo</span>
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
            <div className="text-xs text-gray-500 mt-1 text-center">Professional headshots get 7x more responses</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 w-full">
            <div className="font-semibold mb-2">Why complete your profile?</div>
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2 text-green-700"><span>✔️</span> Get discovered by top-tier journalists</li>
              <li className="flex items-center gap-2 text-green-700"><span>✔️</span> Build your media presence and authority</li>
              <li className="flex items-center gap-2 text-green-700"><span>✔️</span> Automated matching with relevant opportunities</li>
              <li className="flex items-center gap-2 text-green-700"><span>✔️</span> Journalists see your full profile before pitching</li>
            </ul>
          </div>
        </div>
        {/* Right: Profile Form */}
        <div className="md:w-2/3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Your full name" />
            </div>
            <div>
              <Label htmlFor="location">Location *</Label>
              <Input id="location" type="text" value={location} onChange={e => setLocation(e.target.value)} required placeholder="City, State, Country" />
            </div>
            <div>
              <Label htmlFor="title">Professional Title</Label>
              <Input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="CEO, Founder, Expert, etc." />
              <div className="text-xs text-gray-500 mt-1">Your professional title (e.g., "CEO of QuoteBid", "Finance Expert", etc.)</div>
          </div>
            <div>
              <Label htmlFor="industry">Primary Industry *</Label>
              <select
                id="industry"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                required
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select your industry</option>
                {INDUSTRY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="bio">Professional Bio *</Label>
              <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} required placeholder="Describe your expertise, experience, and what makes you a valuable source for journalists..." className="w-full p-2 border rounded-md min-h-[80px]" />
              <div className="text-xs text-gray-500 mt-1">This bio will be visible to journalists looking for expert sources</div>
            </div>
          </div>
          <div className="mb-6">
            <div className="font-semibold mb-2">Online Presence</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input id="linkedin" type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/username" />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" />
              </div>
              <div>
                <Label htmlFor="twitter">X / Twitter</Label>
                <Input id="twitter" type="url" value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="https://x.com/username" />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" type="url" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="https://instagram.com/username" />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="doFollow">Do-Follow Link (For article placements)</Label>
              <select id="doFollow" value={doFollow} onChange={e => setDoFollow(e.target.value)} className="w-full p-2 border rounded-md">
                <option value="None">None</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Website">Website</option>
                <option value="Twitter">Twitter</option>
                <option value="Instagram">Instagram</option>
              </select>
              <div className="text-xs text-gray-500 mt-1">Select which link to include at the end of quotes in articles</div>
            </div>
          </div>
          <div className="flex justify-end mt-8">
            <Button type="submit" className="bg-[#004684] hover:bg-[#003a70] text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Complete & Start Using QuoteBid
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}