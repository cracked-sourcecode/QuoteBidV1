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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-400 mx-auto mb-4" />
          <span className="text-lg font-medium text-white">Loading PR Management...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950">
        <div className="text-center max-w-md mx-auto p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
          <Target className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-300">You must be an administrator to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Helmet>
          <title>PR Opportunities Management | QuoteBid Admin</title>
        </Helmet>
        {/* Enhanced Header Section */}
        <div className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">
                  PR Opportunities Management
                </span>
              </h1>
              <p className="text-slate-300 text-lg">
                Review and manage media pitch submissions from experts
              </p>
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
        <div className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-slate-700/50 p-8 border-b border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                All PR Pitch Submissions
              </h2>
            </div>
            <p className="text-slate-300">
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
