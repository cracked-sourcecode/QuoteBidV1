import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { ProfileCompletionModal } from './ProfileCompletionModal';

export default function SignupCheck({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [needsSignup, setNeedsSignup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSignupStatus();
  }, [user]);

  const checkSignupStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user came from Rubicon and needs to complete setup
      const isRubiconIntegration = import.meta.env.VITE_RUBICON_INTEGRATION === 'true';
      
      if (isRubiconIntegration && user.rubicon_user_id) {
        // For Rubicon users, check if profile is completed
        setNeedsSignup(!user.profileCompleted);
      } else {
        // Non-Rubicon users don't need signup bridge
        setNeedsSignup(false);
      }
    } catch (error) {
      console.error('Setup status check failed:', error);
      setNeedsSignup(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleProfileComplete = () => {
    setNeedsSignup(false);
  };

  return (
    <>
      {children}
      {needsSignup && user && (
        <ProfileCompletionModal
          user={user}
          isOpen={true}
          onComplete={handleProfileComplete}
        />
      )}
    </>
  );
}