import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Users,
  FileText,
  ArrowUpRight,
  Calendar,
  Filter,
  Download,
  Eye,
  MoreHorizontal,
  Search,
  Zap
} from "lucide-react";

/**
 * -----------------------------------------
 * Modern Billing Manager (Admin)
 * 
 * Beautiful, modern post-delivery billing interface
 * -----------------------------------------
 */

interface Pitch {
  id: string;
  publication: {
    id: number;
    name: string;
    logo?: string;
  };
  title: string;
  customerName: string;
  customerAvatarUrl?: string;
  userId: string;
  bidAmount: number;
  billed: boolean;
  createdAt: string;
  updatedAt?: string;
  status: 'successful' | 'sent' | 'pending';
  user?: {
    id: number;
    fullName: string;
    email: string;
    avatar?: string;
    company_name?: string;
  };
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  isDefault: boolean;
}

export default function BillingManagerNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'paid'>('all');

  /** ---------------- Fetch Billing Data --------------- */
  const { data: billingData, isLoading, isError, error: queryError } = useQuery({
    queryKey: ["/api/admin/billing/ready"],
    queryFn: async () => {
      const response = await fetch("/api/admin/billing/ready", {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch billing data: ${response.status}`);
      }
      return response.json();
    },
    retry: false,
    refetchInterval: 30000,
  });

  // Update pitches when data changes
  useEffect(() => {
    if (billingData && Array.isArray(billingData)) {
      setPitches(billingData);
      setError(null);
    } else if (isError) {
      setError(queryError?.message || 'Failed to load billing data');
      setPitches([]);
    }
    setLoading(isLoading);
  }, [billingData, isLoading, isError, queryError]);

  /** ---------------- Mock Data for UI Design --------------- */
  const mockPitches = [
    {
      id: "1",
      publication: { id: 1, name: "TechCrunch", logo: "/logos/techcrunch.png" },
      title: "Revolutionary AI Startup Disrupts Finance Industry",
      customerName: "Sarah Chen",
      userId: "101",
      bidAmount: 2500,
      billed: false,
      createdAt: "2024-01-15T10:00:00Z",
      status: "successful" as const,
      user: {
        id: 101,
        fullName: "Sarah Chen",
        email: "sarah@startup.com",
        avatar: "/avatars/sarah.jpg",
        company_name: "InnovateTech"
      }
    },
    {
      id: "2", 
      publication: { id: 2, name: "Forbes", logo: "/logos/forbes.png" },
      title: "Sustainable Energy Solutions Gain Market Traction",
      customerName: "Marcus Rodriguez",
      userId: "102",
      bidAmount: 3200,
      billed: true,
      createdAt: "2024-01-12T14:30:00Z",
      status: "successful" as const,
      user: {
        id: 102,
        fullName: "Marcus Rodriguez", 
        email: "marcus@greenenergy.com",
        avatar: "/avatars/marcus.jpg",
        company_name: "GreenTech Solutions"
      }
    },
    {
      id: "3",
      publication: { id: 3, name: "Wall Street Journal", logo: "/logos/wsj.png" },
      title: "Blockchain Technology Transforms Healthcare Records",
      customerName: "Emma Wilson",
      userId: "103", 
      bidAmount: 4100,
      billed: false,
      createdAt: "2024-01-10T09:15:00Z",
      status: "successful" as const,
      user: {
        id: 103,
        fullName: "Emma Wilson",
        email: "emma@healthchain.com", 
        avatar: "/avatars/emma.jpg",
        company_name: "HealthChain Inc"
      }
    }
  ];

  // Use mock data for UI design
  const displayPitches = pitches.length > 0 ? pitches : mockPitches;

  /** ---------------- Statistics --------------- */
  const stats = useMemo(() => {
    const pending = displayPitches.filter(p => !p.billed);
    const processed = displayPitches.filter(p => p.billed);

    return {
      pendingCharges: pending.length,
      pendingRevenue: pending.reduce((sum, p) => sum + (p.bidAmount || 0), 0),
      processedCharges: processed.length,
      processedRevenue: processed.reduce((sum, p) => sum + (p.bidAmount || 0), 0),
      totalRevenue: displayPitches.reduce((sum, p) => sum + (p.bidAmount || 0), 0),
      avgDealSize: displayPitches.length > 0 ? 
        displayPitches.reduce((sum, p) => sum + (p.bidAmount || 0), 0) / displayPitches.length : 0
    };
  }, [displayPitches]);

  /** ---------------- Filtering Logic --------------- */
  const filteredPitches = useMemo(() => {
    let filtered = displayPitches;

    // Filter by status
    if (activeFilter === 'pending') {
      filtered = filtered.filter(p => !p.billed);
    } else if (activeFilter === 'paid') {
      filtered = filtered.filter(p => p.billed);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((pitch) => 
        pitch.customerName?.toLowerCase().includes(searchLower) ||
        pitch.title?.toLowerCase().includes(searchLower) ||
        pitch.publication?.name?.toLowerCase().includes(searchLower) ||
        pitch.user?.company_name?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [displayPitches, search, activeFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-8xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Billing Manager
                </h1>
                <p className="text-slate-600 font-medium">
                  Streamlined post-delivery billing for successful placements
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                className="border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-6 py-8 space-y-8">
        {/* Advanced Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <div className="absolute -top-4 -right-4 opacity-20">
              <TrendingUp className="h-24 w-24" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1">${stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-emerald-200 text-xs mt-1">+12.5% from last month</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <div className="absolute -top-4 -right-4 opacity-20">
              <Clock className="h-24 w-24" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Pending Revenue</p>
                  <p className="text-3xl font-bold mt-1">${stats.pendingRevenue.toLocaleString()}</p>
                  <p className="text-amber-200 text-xs mt-1">{stats.pendingCharges} charges waiting</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <div className="absolute -top-4 -right-4 opacity-20">
              <CheckCircle2 className="h-24 w-24" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Processed</p>
                  <p className="text-3xl font-bold mt-1">${stats.processedRevenue.toLocaleString()}</p>
                  <p className="text-blue-200 text-xs mt-1">{stats.processedCharges} successful charges</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <div className="absolute -top-4 -right-4 opacity-20">
              <Users className="h-24 w-24" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Avg Deal Size</p>
                  <p className="text-3xl font-bold mt-1">${Math.round(stats.avgDealSize).toLocaleString()}</p>
                  <p className="text-purple-200 text-xs mt-1">Across all placements</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Controls & Filters */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search customers, articles, publications..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white/80"
                />
              </div>

              {/* Status Filters */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-slate-600" />
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {[
                    { key: 'all', label: 'All', count: displayPitches.length },
                    { key: 'pending', label: 'Pending', count: stats.pendingCharges },
                    { key: 'paid', label: 'Paid', count: stats.processedCharges }
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setActiveFilter(filter.key as any)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        activeFilter === filter.key
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="border-slate-300 hover:bg-slate-50">
                  <Calendar className="h-4 w-4 mr-2" />
                  This Month
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm font-medium">Failed to load billing data</p>
              </div>
              <p className="text-sm text-red-500 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/ready"] })}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modern Billing Table */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">
                  Billing Queue
                </CardTitle>
                <p className="text-slate-600 mt-1">
                  {filteredPitches.length} placements {activeFilter === 'all' ? 'total' : activeFilter}
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-1">
                {filteredPitches.filter(p => !p.billed).length} Pending Charges
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading && !error ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-slate-600 font-medium">Loading billing data...</p>
                </div>
              </div>
            ) : filteredPitches.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No placements found</p>
                <p className="text-slate-500 text-sm">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200/60 bg-slate-50/50">
                      <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                      <TableHead className="font-semibold text-slate-700">Publication</TableHead>
                      <TableHead className="font-semibold text-slate-700">Article</TableHead>
                      <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                      <TableHead className="font-semibold text-slate-700">Date</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPitches.map((pitch, index) => (
                      <TableRow 
                        key={pitch.id} 
                        className={`border-slate-200/60 hover:bg-slate-50/50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {pitch.customerName?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{pitch.customerName || 'Unknown'}</p>
                              <p className="text-sm text-slate-500">
                                {pitch.user?.company_name || 'No company'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center">
                              <FileText className="h-3 w-3 text-slate-600" />
                            </div>
                            <span className="font-medium text-slate-700">
                              {pitch.publication?.name || 'Unknown Publication'}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="max-w-xs">
                            <p className="font-medium text-slate-800 truncate">
                              {pitch.title || 'Untitled'}
                            </p>
                            <p className="text-sm text-slate-500 truncate">
                              Published article
                            </p>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-800">
                              ${pitch.bidAmount?.toLocaleString() || '0'}
                            </p>
                            <p className="text-xs text-slate-500">Winning bid</p>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <p className="text-sm text-slate-600">
                            {new Date(pitch.createdAt).toLocaleDateString()}
                          </p>
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <Badge 
                            variant={pitch.billed ? "default" : "secondary"}
                            className={
                              pitch.billed 
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }
                          >
                            {pitch.billed ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {!pitch.billed ? (
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                                disabled={processing}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Charge
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-300 hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 