import { useState } from 'react';
import { Helmet } from 'react-helmet';
import AdminPitchesList from '@/components/admin/admin-pitches-list';
import AdminLayout from '@/components/admin/admin-layout';
import { AdminAuthProvider, useAdminAuth } from '@/hooks/use-admin-auth';
import { Loader2 } from 'lucide-react';

export default function AdminPitchesPage() {
  const { adminUser, isLoading } = useAdminAuth();
  const isAdmin = !!adminUser;
  const isAdminLoading = isLoading;
  const [activeTab, setActiveTab] = useState('all');

  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You must be an administrator to view this page.</p>
      </div>
    );
  }

  return (
    <AdminLayout activePage="pitches">
      <Helmet>
        <title>Pitch Management | QuoteBid Admin</title>
      </Helmet>
      
      <div className="container py-4 px-4 md:px-6 max-w-full">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800">
              Pitch Management
            </h1>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500 hidden md:block">
                <span className="font-medium">QuoteBid</span> admin workspace
              </div>
            </div>
          </div>
          
          <AdminPitchesList filter={activeTab} />
        </div>
      </div>
    </AdminLayout>
  );
}
