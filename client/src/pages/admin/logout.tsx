import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { LogOut, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminLogout() {
  const [, setLocation] = useLocation();
  const { adminLogoutMutation, adminUser } = useAdminAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
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

  const handleCancel = () => {
    setLocation('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-slate-800/50 backdrop-blur-lg border border-white/20 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="h-8 w-8 text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Confirm Logout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
      <div className="text-center">
            <p className="text-slate-300 text-lg mb-2">
              Are you sure you want to log out of the admin portal?
            </p>
            {adminUser && (
              <p className="text-slate-400 text-sm">
                You are currently logged in as <span className="font-medium text-white">{adminUser.username}</span>
              </p>
            )}
          </div>
          
          <div className="bg-slate-700/30 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3 text-slate-300 text-sm">
              <Shield className="h-5 w-5 text-amber-400" />
              <span>You will need to sign in again to access admin features</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex-1 bg-slate-700 border-white/20 text-white hover:bg-slate-600"
              disabled={isLoggingOut}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoggingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Yes, Logout
                </>
              )}
            </Button>
      </div>
        </CardContent>
      </Card>
    </div>
  );
} 