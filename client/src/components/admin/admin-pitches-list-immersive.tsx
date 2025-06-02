import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useQuery } from '@tanstack/react-query';
import { 
  Loader2, FileText, Mic, Check, X, ChevronDown, List, LayoutGrid, Send, 
  User, Calendar, Building2, Target, Eye, Clock, TrendingUp, AlertCircle,
  MessageSquare, Mail, Phone, Linkedin, Globe, DollarSign, Search
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import PitchDetailsModal from './pitch-details-modal-redesigned';
import { useLocation } from 'wouter';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Enhanced Pitch interface with more details
interface Pitch {
  id: number;
  opportunityId: number;
  userId: number;
  content?: string;
  audioUrl?: string;
  transcript?: string;
  status: string;
  createdAt: string;
  paymentIntentId?: string;
  bidAmount?: number;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
    avatar?: string;
    bio?: string;
    expertise?: string[];
    linkedinUrl?: string;
    websiteUrl?: string;
    phoneNumber?: string;
    title?: string;
    doFollowLink?: string;
  };
  opportunity?: {
    id: number;
    title: string;
    publicationId: number;
    description?: string;
    deadline?: string;
    topics?: string[];
    compensation?: number;
    tier?: string;
  };
  publication?: {
    id: number;
    name: string;
    logo?: string;
    description?: string;
    website?: string;
  };
}

interface AdminPitchesListProps {
  filter?: string;
}

export default function AdminPitchesListImmersive({ filter = 'all' }: AdminPitchesListProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);
  const [isPitchDetailsModalOpen, setIsPitchDetailsModalOpen] = useState(false);
  
  // New filter states
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>('all');
  
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    if (filter) {
      setSelectedStatus(filter);
    }
  }, [filter]);

  // Check for openDetails URL parameter and auto-open pitch details modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openDetailsParam = urlParams.get('openDetails');
    
    if (openDetailsParam) {
      const pitchId = parseInt(openDetailsParam, 10);
      if (!isNaN(pitchId)) {
        // Set the selected pitch and open modal
        setSelectedPitchId(pitchId);
        setIsPitchDetailsModalOpen(true);
        
        // Clean up the URL parameter by removing it
        urlParams.delete('openDetails');
        const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Fetch all pitches with enhanced data
  const {
    data: pitches = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/pitches'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/pitches', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error(`Error fetching pitches: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Debug: Log the first pitch to see what data we're getting
      if (data.length > 0) {
        console.log('Sample pitch data:', {
          id: data[0].id,
          userId: data[0].userId,
          user: data[0].user,
          opportunity: data[0].opportunity,
          publication: data[0].publication
        });
      }
      
      return data;
    },
    staleTime: 30000,
    refetchInterval: 60000
  });

  // Extract unique values for dropdowns
  const availableTiers = ['Tier 1', 'Tier 2', 'Tier 3'];
  const availableOutlets: string[] = Array.from(new Set(pitches.map((pitch: Pitch) => pitch.publication?.name).filter((name: string | undefined): name is string => Boolean(name))));
  
  const availableOpportunities = pitches
    .filter((pitch: Pitch) => selectedOutlet === 'all' || pitch.publication?.name === selectedOutlet)
    .map((pitch: Pitch) => ({ 
      id: pitch.opportunity?.id, 
      title: pitch.opportunity?.title,
      tier: pitch.opportunity?.tier || 'Tier 1'
    }))
    .filter((opp: any, index: number, arr: any[]) => arr.findIndex((o: any) => o.id === opp.id) === index)
    .filter((opp: any) => Boolean(opp.id && opp.title));
  
  // Filter pitches based on all selected criteria
  const filteredPitches = pitches.filter((pitch: Pitch) => {
    // Status filter
    const statusMatch = selectedStatus === 'all' || pitch.status === selectedStatus;
    
    // Tier filter
    const tierMatch = selectedTier === 'all' || (pitch.opportunity?.tier || 'Tier 1') === selectedTier;
    
    // Outlet filter
    const outletMatch = selectedOutlet === 'all' || pitch.publication?.name === selectedOutlet;
    
    // Opportunity filter
    const opportunityMatch = selectedOpportunity === 'all' || pitch.opportunity?.id?.toString() === selectedOpportunity;
    
    return statusMatch && tierMatch && outletMatch && opportunityMatch;
  });

  // Reset dependent filters when parent filter changes
  useEffect(() => {
    if (selectedTier !== 'all') {
      setSelectedOutlet('all');
      setSelectedOpportunity('all');
    }
  }, [selectedTier]);

  useEffect(() => {
    if (selectedOutlet !== 'all') {
      setSelectedOpportunity('all');
    }
  }, [selectedOutlet]);

  // Update pitch status
  const updatePitchStatus = async (pitchId: number, newStatus: string) => {
    try {
      await apiRequest('PATCH', `/api/admin/pitches/${pitchId}/status`, { status: newStatus });
      toast({
        title: 'Status updated',
        description: `Pitch status has been updated to ${newStatus}`,
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update pitch status',
        variant: 'destructive',
      });
    }
  };

  // Status configuration with colors and icons
  const statusConfig = {
    pending: { 
      label: 'Pending Review', 
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      icon: Clock,
      description: 'Awaiting initial review'
    },
    sent_to_reporter: { 
      label: 'Sent to Reporter', 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Send,
      description: 'Forwarded to journalist'
    },
    interested: { 
      label: 'Reporter Interested', 
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: TrendingUp,
      description: 'Journalist expressed interest'
    },
    not_interested: { 
      label: 'Not Interested', 
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: X,
      description: 'Journalist declined'
    },
    successful: { 
      label: 'Successful Coverage', 
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: Check,
      description: 'Published/aired'
    },
    draft: {
      label: 'Draft',
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      icon: FileText,
      description: 'Draft pitch'
    }
  };

  // Enhanced Status Badge
  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      icon: AlertCircle
    };
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={`${config.color} inline-flex items-center gap-1 px-2 py-1 min-w-fit`}>
        <Icon className="h-2.5 w-2.5 flex-shrink-0" />
        <span className="whitespace-nowrap text-xs font-medium">{config.label}</span>
      </Badge>
    );
  };

  // Format date with relative time
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        full: format(date, 'MMM d, yyyy h:mm a'),
        relative: formatDistanceToNow(date, { addSuffix: true })
      };
    } catch (e) {
      return { full: 'Invalid date', relative: 'Unknown' };
    }
  };

  // Card view component for a single pitch
  const PitchCard = ({ pitch }: { pitch: Pitch }) => {
    const dateInfo = formatDate(pitch.createdAt);
    const userInitials = pitch.user?.fullName
      ? pitch.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
      : pitch.user?.username?.[0]?.toUpperCase() || 'U';

    // Uniform content preview limits
    const getContentPreview = (content: string | undefined, maxLength: number = 120) => {
      if (!content) return 'No content available';
      return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
    };

    return (
      <Card className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-lg overflow-hidden h-full flex flex-col" 
            onClick={() => {
              setSelectedPitchId(pitch.id);
              setIsPitchDetailsModalOpen(true);
            }}>
        
        {/* Enhanced Header with Better Status Layout */}
        <CardHeader className="pb-4 bg-gradient-to-r from-gray-50/80 to-blue-50/30 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="h-12 w-12 ring-2 ring-white shadow-md">
                <AvatarImage src={pitch.user?.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 leading-tight text-base truncate">
                  {pitch.user?.fullName || pitch.user?.username || `User #${pitch.userId}`}
                </h3>
                <p className="text-sm text-gray-500 truncate">{pitch.user?.email}</p>
                {pitch.user?.title && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{pitch.user.title}</p>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <StatusBadge status={pitch.status} />
            </div>
          </div>
        </CardHeader>
        
        {/* Enhanced Content Area - Flex grow to fill available space */}
        <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
          {/* Opportunity Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100/50 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-500 rounded-lg">
                <Target className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-blue-900">Pitching for:</span>
            </div>
            <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-3">
              {pitch.opportunity?.title || `Opportunity #${pitch.opportunityId}`}
            </h4>
            {pitch.publication && (
              <div className="flex items-center gap-2">
                <div className="p-1 bg-gray-500 rounded">
                  <Building2 className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm text-gray-600 font-medium truncate">{pitch.publication.name}</span>
              </div>
            )}
          </div>

          {/* Pitch Content Section - Fixed height container */}
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center gap-2 flex-shrink-0">
              {pitch.audioUrl ? (
                <>
                  <div className="p-1.5 bg-green-500 rounded-lg">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-green-800">Audio Pitch</span>
                </>
              ) : (
                <>
                  <div className="p-1.5 bg-gray-500 rounded-lg">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Written Pitch</span>
                </>
              )}
            </div>
            
            {/* Content Preview - Fixed height */}
            <div className="flex-1 min-h-[120px] max-h-[120px] overflow-hidden">
              {pitch.audioUrl ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100/50 h-full flex flex-col">
                  <div className="flex-shrink-0 mb-3">
                    <audio controls className="w-full h-8" onClick={(e) => e.stopPropagation()}>
                      <source src={pitch.audioUrl} type="audio/mpeg" />
                    </audio>
                  </div>
                  {pitch.transcript && (
                    <div className="bg-white/60 rounded-lg p-3 flex-1 overflow-hidden">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {getContentPreview(pitch.transcript, 100)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100/50 h-full">
                  <div className="bg-white/60 rounded-lg p-3 h-full flex flex-col justify-between">
                    <p className="text-sm text-gray-700 line-clamp-4">
                      {getContentPreview(pitch.content, 120)}
                    </p>
                    {pitch.user?.fullName && pitch.user?.title && (
                      <p className="text-gray-500 italic text-xs mt-2 truncate flex-shrink-0">
                        —{pitch.user.fullName}, {pitch.user.title}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Metadata - Fixed at bottom */}
          <div className="flex items-center justify-between text-sm bg-gray-50/80 rounded-lg p-3 flex-shrink-0">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{dateInfo.relative}</span>
            </div>
            {pitch.bidAmount && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold">${pitch.bidAmount}</span>
              </div>
            )}
          </div>

          {/* Enhanced Action Buttons - Fixed at bottom */}
          <div className="flex gap-3 pt-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button 
              size="sm" 
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPitchId(pitch.id);
                setIsPitchDetailsModalOpen(true);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="px-3 border-gray-300 hover:bg-gray-50 shadow-sm"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Update Status
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem 
                      key={key}
                      onClick={() => updatePitchStatus(pitch.id, key)}
                      disabled={pitch.status === key}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <Icon className="h-4 w-4 text-gray-600" />
                      <div className="flex-1">
                        <div className="font-medium">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">Loading pitches...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <X className="h-8 w-8 text-red-600 mb-2" />
        <h3 className="text-gray-800 font-medium">Failed to load pitches</h3>
        <p className="text-gray-600 mb-4">There was an error loading the pitch data.</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Filter Menu Section */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Campaign Filters</h3>
            <span className="text-sm text-gray-500">Focus on specific stories and outlets</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tier Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tier</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="all">All Tiers</option>
                {availableTiers.map((tier) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>

            {/* Outlet Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Outlet</label>
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={selectedTier !== 'all' && availableOutlets.length === 0}
              >
                <option value="all">All Outlets</option>
                {availableOutlets.map((outlet) => (
                  <option key={outlet} value={outlet}>{outlet}</option>
                ))}
              </select>
            </div>

            {/* Opportunity Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Opportunity</label>
              <select
                value={selectedOpportunity}
                onChange={(e) => setSelectedOpportunity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={selectedOutlet === 'all'}
              >
                <option value="all">All Stories</option>
                {availableOpportunities.map((opp: any) => (
                  <option key={opp.id} value={opp.id?.toString()}>{opp.title}</option>
                ))}
              </select>
            </div>

            {/* Results & View Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">View</label>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 bg-white/70 px-3 py-2 rounded-lg border border-gray-200">
                  <span className="font-medium">{filteredPitches.length}</span> pitch{filteredPitches.length !== 1 ? 'es' : ''}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="shadow-sm"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="shadow-sm"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(selectedTier !== 'all' || selectedOutlet !== 'all' || selectedOpportunity !== 'all') && (
            <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              {selectedTier !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {selectedTier}
                </span>
              )}
              {selectedOutlet !== 'all' && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {selectedOutlet}
                </span>
              )}
              {selectedOpportunity !== 'all' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {availableOpportunities.find((opp: any) => opp.id?.toString() === selectedOpportunity)?.title}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTier('all');
                  setSelectedOutlet('all');
                  setSelectedOpportunity('all');
                }}
                className="text-gray-500 hover:text-gray-700 ml-2"
              >
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full bg-gray-50/80 h-auto p-1">
            <TabsTrigger value="pending" className="text-sm py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Pending</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="sent_to_reporter" className="text-sm py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Sent</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="interested" className="text-sm py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Interested</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="not_interested" className="text-sm py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <X className="h-4 w-4" />
                <span>Declined</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="successful" className="text-sm py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>Successful</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="all" className="text-sm py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>All Pitches</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {filteredPitches.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pitches found</h3>
            <p className="text-gray-500 max-w-md">
              {selectedTier !== 'all' || selectedOutlet !== 'all' || selectedOpportunity !== 'all'
                ? "No pitches match your current filter selection. Try adjusting your filters."
                : selectedStatus === 'all' 
                ? "There are no pitches in the system yet."
                : `No pitches with '${statusConfig[selectedStatus as keyof typeof statusConfig]?.label || selectedStatus}' status.`}
            </p>
          </div>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {filteredPitches.map((pitch: Pitch) => (
            <PitchCard key={pitch.id} pitch={pitch} />
          ))}
        </div>
      ) : (
        <Card>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expert</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Publication</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPitches.map((pitch: Pitch) => {
                  const dateInfo = formatDate(pitch.createdAt);
                  return (
                    <TableRow key={pitch.id} className="cursor-pointer hover:bg-gray-50"
                              onClick={() => {
                                setSelectedPitchId(pitch.id);
                                setIsPitchDetailsModalOpen(true);
                              }}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={pitch.user?.avatar || undefined} />
                            <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                              {pitch.user?.fullName?.[0] || pitch.user?.username?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {pitch.user?.fullName || pitch.user?.username}
                            </p>
                            <p className="text-xs text-gray-500">{pitch.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm line-clamp-1">
                          {pitch.opportunity?.title || `Opportunity #${pitch.opportunityId}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{pitch.publication?.name || 'N/A'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {pitch.audioUrl ? 'Audio' : 'Text'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={pitch.status} />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{dateInfo.relative}</p>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPitchId(pitch.id);
                              setIsPitchDetailsModalOpen(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {Object.entries(statusConfig).map(([key, config]) => {
                              const Icon = config.icon;
                              return (
                                <DropdownMenuItem 
                                  key={key}
                                  onClick={() => updatePitchStatus(pitch.id, key)}
                                  disabled={pitch.status === key}
                                >
                                  <Icon className="mr-2 h-4 w-4" />
                                  {config.label}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Pitch details modal */}
      {selectedPitchId && (
        <PitchDetailsModal
          isOpen={isPitchDetailsModalOpen}
          onClose={() => {
            setIsPitchDetailsModalOpen(false);
            setSelectedPitchId(null);
          }}
          pitchId={selectedPitchId}
        />
      )}
    </div>
  );
} 