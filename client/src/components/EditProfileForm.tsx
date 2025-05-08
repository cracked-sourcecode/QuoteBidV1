import { useState, useRef, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

// Validation schema for the profile form
const profileSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters' }),
  title: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  doFollowLink: z.string().url({ message: 'Must be a valid URL' }).optional().nullable(),
  website: z.string().url({ message: 'Must be a valid URL' }).optional().nullable(),
  twitter: z.string().url({ message: 'Must be a valid URL' }).optional().nullable(),
  linkedin: z.string().url({ message: 'Must be a valid URL' }).optional().nullable(),
  instagram: z.string().url({ message: 'Must be a valid URL' }).optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type EditProfileFormProps = {
  user: Partial<User>;
  onCancel: () => void;
  onSaved: (updatedUser: User) => void;
};

export function EditProfileForm({ user, onCancel, onSaved }: EditProfileFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form with existing user data
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName || '',
      title: user.title || '',
      bio: user.bio || '',
      location: user.location || '',
      industry: user.industry || '',
      doFollowLink: user.doFollowLink || '',
      website: user.website || '',
      twitter: user.twitter || '',
      linkedin: user.linkedIn || '',
      instagram: user.instagram || '',
    },
  });

  // Handle avatar file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      // Add the avatar file if one was selected
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      
      // Add form data as JSON
      formData.append('userData', JSON.stringify(data));
      
      const response = await apiRequest('PATCH', '/api/user', formData, {
        customConfig: {
          body: formData,
          // Don't set Content-Type when sending FormData, browser will set it with correct boundary
          headers: {}
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      
      const updatedUser = await response.json();
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      
      onSaved(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An error occurred while updating your profile.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  return (
    <Card className="border shadow-sm max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Edit Profile</CardTitle>
        <CardDescription>
          Update your profile information
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 rounded-md border">
                <AvatarImage src={avatarPreview || undefined} alt={user.fullName || 'User'} className="object-cover" />
                <AvatarFallback className="text-2xl font-medium bg-gray-100 text-gray-600">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" onClick={triggerFileInput} className="text-sm">
                Change Photo
              </Button>
              {avatarPreview && (
                <Button type="button" variant="outline" onClick={removeAvatar} className="text-sm text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">
                  Remove Photo
                </Button>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Recommended: Square image, at least 300x300 pixels
              </p>
            </div>
          </div>
          
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className={errors.fullName ? 'text-red-500' : ''}>
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                {...register('fullName')}
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">
                Professional Title
              </Label>
              <Input
                id="title"
                placeholder="e.g., CEO of QuoteBid"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, CA"
                {...register('location')}
              />
              {errors.location && (
                <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">
                Industry
              </Label>
              <Input
                id="industry"
                placeholder="e.g., Technology"
                {...register('industry')}
              />
              {errors.industry && (
                <p className="text-red-500 text-xs mt-1">{errors.industry.message}</p>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div className="space-y-2">
            <Label htmlFor="bio">
              Bio
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself"
              className="min-h-[100px]"
              {...register('bio')}
            />
            {errors.bio && (
              <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>
            )}
          </div>

          {/* Do-follow Link */}
          <div className="space-y-2">
            <Label htmlFor="doFollowLink">
              Do-follow Link (for article attributions)
            </Label>
            <Input
              id="doFollowLink"
              placeholder="https://yourwebsite.com"
              {...register('doFollowLink')}
              className={errors.doFollowLink ? 'border-red-500' : ''}
            />
            {errors.doFollowLink ? (
              <p className="text-red-500 text-xs mt-1">{errors.doFollowLink.message}</p>
            ) : (
              <p className="text-xs text-gray-500">This link will be included in article placements</p>
            )}
          </div>

          {/* Social Links Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Social Media Links</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">
                  Website
                </Label>
                <Input
                  id="website"
                  placeholder="https://yourwebsite.com"
                  {...register('website')}
                  className={errors.website ? 'border-red-500' : ''}
                />
                {errors.website && (
                  <p className="text-red-500 text-xs mt-1">{errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">
                  Twitter
                </Label>
                <Input
                  id="twitter"
                  placeholder="https://twitter.com/username"
                  {...register('twitter')}
                  className={errors.twitter ? 'border-red-500' : ''}
                />
                {errors.twitter && (
                  <p className="text-red-500 text-xs mt-1">{errors.twitter.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/username"
                  {...register('linkedin')}
                  className={errors.linkedin ? 'border-red-500' : ''}
                />
                {errors.linkedin && (
                  <p className="text-red-500 text-xs mt-1">{errors.linkedin.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/username"
                  {...register('instagram')}
                  className={errors.instagram ? 'border-red-500' : ''}
                />
                {errors.instagram && (
                  <p className="text-red-500 text-xs mt-1">{errors.instagram.message}</p>
                )}
              </div>


            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
