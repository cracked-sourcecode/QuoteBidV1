import { useState } from 'react';
import { Helmet } from 'react-helmet';
import AdminPitchesListImmersive from '@/components/admin/admin-pitches-list-immersive';
import { AdminAuthProvider, useAdminAuth } from '@/hooks/use-admin-auth';
import { Loader2, MessageSquare, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';

export default function AdminPitchesPage() {
  const { adminUser, isLoading } = useAdminAuth();
  const isAdmin = !!adminUser;
  const isAdminLoading = isLoading;
  const [activeTab, setActiveTab] = useState('all');

  // Fetch pitch statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/pitches/stats'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/pitches');
      if (!res.ok) throw new Error('Failed to fetch pitch stats');
      const pitches = await res.json();
      
      // Calculate statistics
      const total = pitches.length;
      const pending = pitches.filter((p: any) => p.status === 'pending').length;
      const sentToReporter = pitches.filter((p: any) => p.status === 'sent_to_reporter').length;
      const successful = pitches.filter((p: any) => p.status === 'successful').length;
      
      return { total, pending, sentToReporter, successful };
    },
    enabled: isAdmin,
  });

  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>PR Opportunities Management | QuoteBid Admin</title>
      </Helmet>
      
      <div className="container mx-auto py-6 px-4 md:px-6 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-purple-600" />
                PR Opportunities Management
              </h1>
              <p className="text-gray-600 mt-2">
                Review and manage media pitch submissions from experts
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Welcome back,</p>
              <p className="text-lg font-semibold text-gray-900">{adminUser?.fullName}</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pitches</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total || 0}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats?.pending || 0}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sent to Reporters</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats?.sentToReporter || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Successful Coverage</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats?.successful || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All PR Pitch Submissions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage expert pitches for media opportunities
            </p>
          </div>
          
          <div className="p-6">
            <AdminPitchesListImmersive filter={activeTab} />
          </div>
        </div>
      </div>
    </div>
  );
}
