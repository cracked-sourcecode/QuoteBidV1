import { useState } from 'react';
import { Helmet } from 'react-helmet';
import AdminPitchesListImmersive from '@/components/admin/admin-pitches-list-immersive';
import { AdminAuthProvider, useAdminAuth } from '@/hooks/use-admin-auth';
import { Loader2, MessageSquare, TrendingUp, Clock, CheckCircle, Users, Target, BarChart3, Award } from 'lucide-react';
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
      const interested = pitches.filter((p: any) => p.status === 'interested').length;
      
      return { total, pending, sentToReporter, successful, interested };
    },
    enabled: isAdmin,
  });

  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <span className="text-lg font-medium text-gray-700">Loading PR Management...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
          <Target className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You must be an administrator to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Helmet>
        <title>PR Opportunities Management | QuoteBid Admin</title>
      </Helmet>
      
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-7xl">
        {/* Enhanced Header Section */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl shadow-lg">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-blue-800 bg-clip-text text-transparent">
                    PR Opportunities Management
                  </h1>
                  <p className="text-lg text-gray-600 mt-1">
                    Review and manage media pitch submissions from experts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Pitches Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Total Pitches</h3>
                <p className="text-purple-100 text-sm">All submitted pitches</p>
              </div>
            </div>
          </div>

          {/* Pending Review Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{stats?.pending || 0}</div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Pending Review</h3>
                <p className="text-orange-100 text-sm">Awaiting initial review</p>
              </div>
            </div>
          </div>

          {/* Sent to Reporter Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{stats?.sentToReporter || 0}</div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Sent to Reporters</h3>
                <p className="text-blue-100 text-sm">Forwarded to journalists</p>
              </div>
            </div>
          </div>

          {/* Successful Coverage Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{stats?.successful || 0}</div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Successful Coverage</h3>
                <p className="text-green-100 text-sm">Published/aired stories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 p-8 border-b border-gray-200/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                All PR Pitch Submissions
              </h2>
            </div>
            <p className="text-gray-600">
              Manage and review expert pitches for media opportunities with advanced filtering and status management
            </p>
          </div>
          
          <div className="p-8">
            <AdminPitchesListImmersive filter={activeTab} />
          </div>
        </div>
      </div>
    </div>
  );
}
