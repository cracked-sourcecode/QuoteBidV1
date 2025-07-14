import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FaTwitter, FaLinkedin, FaInstagram, FaMedium } from "react-icons/fa";
import { BiWorld } from "react-icons/bi";
import { User } from "@shared/schema";
import { getAvatarUrl } from "../lib/responsive-utils";

type ProfileViewProps = {
  user: Partial<User>;
  onEdit: () => void;
};

export function ProfileView({ user, onEdit }: ProfileViewProps) {
  // Format social links
  const socialLinks = [
    { type: 'twitter', icon: FaTwitter, url: user.twitter || '', color: 'text-blue-400' },
    { type: 'linkedIn', icon: FaLinkedin, url: user.linkedIn || '', color: 'text-blue-600' },
    { type: 'instagram', icon: FaInstagram, url: user.instagram || '', color: 'text-pink-500' },
    { type: 'website', icon: BiWorld, url: user.website || '', color: 'text-gray-600' }
  ].filter(link => link.url && link.url.trim() !== '');
  
  return (
    <Card className="border shadow-sm max-w-3xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl">Profile Information</CardTitle>
          <CardDescription>
            View and update your profile information
          </CardDescription>
        </div>
        <Button onClick={onEdit}>
          Edit Profile
        </Button>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-shrink-0">
            <Avatar className="h-40 w-40 rounded-md border">
              <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.fullName || 'User'} className="object-cover" />
              <AvatarFallback className="text-4xl font-medium bg-gray-100 text-gray-600">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <h3 className="text-xl font-semibold">{user.fullName || 'No name provided'}</h3>
              {user.title && (
                <p className="text-gray-600 mt-1">{user.title}</p>
              )}
              {user.location && (
                <p className="text-gray-500 text-sm mt-2">{user.location}</p>
              )}
              {user.doFollowLink && (
                <p className="mt-2 text-sm">
                  <span className="font-medium">Do-follow link:</span> <a href={user.doFollowLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{user.doFollowLink}</a>
                </p>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Industry</h3>
              {user.industry ? (
                <Badge variant="outline" className="bg-gray-100">{user.industry}</Badge>
              ) : (
                <p className="text-gray-500 text-sm">No industry specified</p>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Bio</h3>
              <div className="text-gray-700 text-sm">
                {user.bio ? (
                  <p>{user.bio}</p>
                ) : (
                  <p className="text-gray-500">No bio provided</p>
                )}
              </div>
            </div>

            {socialLinks.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Social Media</h3>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((link, index) => {
                    const Icon = link.icon;
                    return (
                      <a 
                        key={index} 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`${link.color} hover:opacity-80 transition-opacity`}
                        title={link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                      >
                        <Icon size={22} />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
