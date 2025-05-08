import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ProfileView } from '@/components/ProfileView';
import { EditProfileForm } from '@/components/EditProfileForm';
import { Spinner } from '@/components/Spinner';
import { ErrorState } from '@/components/ErrorState';
import { User } from '@shared/schema';

export default function ProfilePage() {
  const { data: user, isLoading, error, refetch } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [updatedUser, setUpdatedUser] = useState<User | null>(null);

  // Handle edit button click
  const handleEditClick = () => {
    setIsEditing(true);
  };

  // Handle cancel button click in edit form
  const handleCancel = () => {
    setIsEditing(false);
  };

  // Handle successful profile update
  const handleSaved = (user: User) => {
    setUpdatedUser(user);
    setIsEditing(false);
    refetch();
  };

  if (isLoading) {
    return <Spinner />;
  }

  if (error || !user) {
    return <ErrorState err={error || new Error('User not found')} />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Helmet>
        <title>Your Profile | QuoteBid</title>
      </Helmet>

      <h1 className="text-3xl font-bold mb-8 text-center">
        Your Profile
      </h1>

      {isEditing ? (
        <EditProfileForm 
          user={updatedUser || user} 
          onCancel={handleCancel} 
          onSaved={handleSaved} 
        />
      ) : (
        <ProfileView 
          user={updatedUser || user} 
          onEdit={handleEditClick} 
        />
      )}
    </div>
  );
}
