import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Loader2 } from 'lucide-react';

export default function AdminLogout() {
  const [, setLocation] = useLocation();
  const { adminLogoutMutation } = useAdminAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await adminLogoutMutation.mutateAsync();
        // Redirect to admin login after logout
        setLocation('/admin-login');
      } catch (error) {
        console.error('Logout failed:', error);
        // Still redirect even if logout fails
        setLocation('/admin-login');
      }
    };

    performLogout();
  }, [adminLogoutMutation, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Logging out...</p>
      </div>
    </div>
  );
} 