import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useQuery } from '@tanstack/react-query';
import { 
  Loader2, X, List, LayoutGrid, MessageSquare
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

  // Status configuration with colors
  const statusConfig = {
    pending: { 
      label: 'Pending Review', 
      color: 'bg-yellow-900/20 text-yellow-300 border-yellow-600/30'
    },
    sent_to_reporter: { 
      label: 'Sent to Reporter', 
      color: 'bg-blue-900/20 text-blue-300 border-blue-600/30'
    },
    interested: { 
      label: 'Reporter Interested', 
      color: 'bg-green-900/20 text-green-300 border-green-600/30'
    },
    not_interested: { 
      label: 'Not Interested', 
      color: 'bg-red-900/20 text-red-300 border-red-600/30'
    },
    successful: { 
      label: 'Successful Coverage', 
      color: 'bg-purple-900/20 text-purple-300 border-purple-600/30'
    }
  };

  // Clean Status Badge without vectors
  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-900/20 text-gray-300 border-gray-600/30'
    };
    
    return (
      <Badge variant="outline" className={`${config.color} px-2 py-1 text-xs shrink-0 cursor-default`}>
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

    // Professional card design with proper alignment
  const PitchCard = ({ pitch }: { pitch: Pitch }) => {
    const dateInfo = formatDate(pitch.createdAt);
    const userInitials = pitch.user?.fullName
      ? pitch.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
      : pitch.user?.username?.[0]?.toUpperCase() || 'U';

    // Content preview
    const getContentPreview = (content: string | undefined, maxLength: number = 100) => {
      if (!content) return 'No content available';
      return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
    };

    return (
      <Card className="group hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer bg-slate-800/60 backdrop-blur-sm border border-white/20 hover:border-amber-500/50 overflow-hidden h-full flex flex-col" 
            onClick={() => {
              setSelectedPitchId(pitch.id);
              setIsPitchDetailsModalOpen(true);
            }}>
        
        {/* Compact Header */}
        <CardHeader className="p-3 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar className="h-10 w-10 ring-2 ring-white/30">
                <AvatarImage src={pitch.user?.avatar || undefined} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white font-medium text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-white text-sm leading-tight truncate">
                  {pitch.user?.fullName || pitch.user?.username || `User #${pitch.userId}`}
                </h3>
                <p className="text-xs text-slate-400 truncate">{pitch.user?.email}</p>
                {pitch.user?.title && (
                  <p className="text-xs text-slate-500 truncate">{pitch.user.title}</p>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 self-start">
              <StatusBadge status={pitch.status} />
            </div>
          </div>
        </CardHeader>
        
        {/* Compact Content Area */}
        <CardContent className="px-3 pb-3 space-y-2 flex-1 flex flex-col">
          
          {/* Opportunity Section */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Pitching for</span>
            <h4 className="font-medium text-white text-sm leading-tight line-clamp-2">
              {pitch.opportunity?.title || `Opportunity #${pitch.opportunityId}`}
            </h4>
            {pitch.publication && (
              <p className="text-xs text-slate-300 font-medium">
                {pitch.publication.name}
              </p>
            )}
          </div>

          {/* Pitch Content */}
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {pitch.audioUrl ? 'Audio Pitch' : 'Written Pitch'}
              </span>
              {pitch.audioUrl && (
                <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded-full">
                  Audio
                </span>
              )}
            </div>
            
            <div className="bg-slate-700/40 border border-white/10 rounded p-2 flex-1 min-h-[60px]">
              {pitch.audioUrl ? (
                <div className="space-y-2">
                  <audio controls className="w-full h-8" onClick={(e) => e.stopPropagation()}>
                    <source src={pitch.audioUrl} type="audio/mpeg" />
                  </audio>
                  {pitch.transcript && (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-snug">
                      {getContentPreview(pitch.transcript, 80)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-300 line-clamp-3 leading-snug">
                  {getContentPreview(pitch.content, 100)}
                </p>
              )}
            </div>
          </div>

          {/* Footer with Date and Amount */}
          <div className="flex items-center justify-between pt-1 border-t border-white/20">
            <span className="text-xs text-slate-400">{dateInfo.relative}</span>
            {pitch.bidAmount && (
              <span className="font-medium text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                ${pitch.bidAmount}
              </span>
            )}
          </div>

          {/* Compact Action Buttons */}
          <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            <Button 
              size="sm"
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white h-8"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPitchId(pitch.id);
                setIsPitchDetailsModalOpen(true);
              }}
            >
              View Details
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm"
                  variant="outline" 
                  className="px-2 bg-slate-700/50 border-white/20 hover:bg-slate-600/50 text-white h-8"
                >
                  ⋯
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-white/20">
                <DropdownMenuLabel className="text-sm font-semibold text-slate-300">
                  Update Status
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {Object.entries(statusConfig).map(([key, config]) => {
                  return (
                    <DropdownMenuItem 
                      key={key}
                      onClick={() => updatePitchStatus(pitch.id, key)}
                      disabled={pitch.status === key}
                      className="py-2.5 text-slate-300 hover:bg-slate-700/50"
                    >
                      <span className="text-sm">{config.label}</span>
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
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <span className="ml-2 text-slate-300">Loading pitches...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <X className="h-8 w-8 text-red-400 mb-2" />
        <h3 className="text-white font-medium">Failed to load pitches</h3>
        <p className="text-slate-300 mb-4">There was an error loading the pitch data.</p>
        <Button onClick={() => refetch()} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
            {/* Desktop-Optimized Campaign Filters */}
      <div className="bg-slate-800/30 backdrop-blur-lg border border-white/20 rounded-2xl p-5 shadow-xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Campaign Filters</h3>
              <p className="text-sm text-slate-400 mt-0.5">Focus on specific stories and outlets</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-300 bg-slate-700/50 px-4 py-2 rounded-lg border border-white/20">
                <span className="font-semibold text-white">{filteredPitches.length}</span> 
                <span className="ml-1">pitch{filteredPitches.length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-700/30 p-1 rounded-lg border border-white/20">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className={viewMode === 'cards' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 h-8' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-600/50 h-8'
                  }
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 h-8' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-600/50 h-8'
                  }
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tier Filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Tier</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full px-4 py-3 pr-10 text-sm border border-white/20 rounded-lg bg-slate-700/50 text-white backdrop-blur-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all appearance-none cursor-pointer hover:bg-slate-600/50"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A1A1AA' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 12px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px'
                }}
              >
                <option value="all">All Tiers</option>
                {availableTiers.map((tier) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>

            {/* Outlet Filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Outlet</label>
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="w-full px-4 py-3 pr-10 text-sm border border-white/20 rounded-lg bg-slate-700/50 text-white backdrop-blur-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all appearance-none cursor-pointer hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedTier !== 'all' && availableOutlets.length === 0}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A1A1AA' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 12px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px'
                }}
              >
                <option value="all">All Outlets</option>
                {availableOutlets.map((outlet) => (
                  <option key={outlet} value={outlet}>{outlet}</option>
                ))}
              </select>
            </div>

            {/* Opportunity Filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Opportunity</label>
              <select
                value={selectedOpportunity}
                onChange={(e) => setSelectedOpportunity(e.target.value)}
                className="w-full px-4 py-3 pr-10 text-sm border border-white/20 rounded-lg bg-slate-700/50 text-white backdrop-blur-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all appearance-none cursor-pointer hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selectedOutlet === 'all'}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A1A1AA' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 12px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px'
                }}
              >
                <option value="all">All Stories</option>
                {availableOpportunities.map((opp: any) => (
                  <option key={opp.id} value={opp.id?.toString()}>{opp.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedTier !== 'all' || selectedOutlet !== 'all' || selectedOpportunity !== 'all') && (
            <div className="flex items-center gap-2 pt-3 border-t border-white/10">
              <span className="text-sm font-medium text-slate-300">Active:</span>
              {selectedTier !== 'all' && (
                <span className="px-2.5 py-1 bg-blue-900/30 text-blue-300 text-xs rounded-full border border-blue-600/30 font-medium">
                  {selectedTier}
                </span>
              )}
              {selectedOutlet !== 'all' && (
                <span className="px-2.5 py-1 bg-green-900/30 text-green-300 text-xs rounded-full border border-green-600/30 font-medium">
                  {selectedOutlet}
                </span>
              )}
              {selectedOpportunity !== 'all' && (
                <span className="px-2.5 py-1 bg-purple-900/30 text-purple-300 text-xs rounded-full border border-purple-600/30 font-medium">
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
                className="text-slate-400 hover:text-white hover:bg-slate-700/50 ml-1 h-7 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dark Status Filter Tabs */}
      <div className="bg-slate-800/30 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full bg-slate-700/30 h-auto p-1">
            <TabsTrigger value="pending" className="text-sm py-3 text-slate-300 data-[state=active]:bg-slate-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Pending
            </TabsTrigger>
            <TabsTrigger value="sent_to_reporter" className="text-sm py-3 text-slate-300 data-[state=active]:bg-slate-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Sent
            </TabsTrigger>
            <TabsTrigger value="interested" className="text-sm py-3 text-slate-300 data-[state=active]:bg-slate-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Interested
            </TabsTrigger>
            <TabsTrigger value="not_interested" className="text-sm py-3 text-slate-300 data-[state=active]:bg-slate-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Declined
            </TabsTrigger>
            <TabsTrigger value="successful" className="text-sm py-3 text-slate-300 data-[state=active]:bg-slate-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm">
              Successful
            </TabsTrigger>
            <TabsTrigger value="all" className="text-sm py-3 text-slate-300 data-[state=active]:bg-slate-600/50 data-[state=active]:text-white data-[state=active]:shadow-sm">
              All Pitches
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {filteredPitches.length === 0 ? (
        <Card className="p-12 bg-slate-800/30 backdrop-blur-lg border border-white/20">
          <div className="flex flex-col items-center justify-center text-center">
            <MessageSquare className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No pitches found</h3>
            <p className="text-slate-300 max-w-md">
              {selectedTier !== 'all' || selectedOutlet !== 'all' || selectedOpportunity !== 'all'
                ? "No pitches match your current filter selection. Try adjusting your filters."
                : selectedStatus === 'all' 
                ? "There are no pitches in the system yet."
                : `No pitches with '${statusConfig[selectedStatus as keyof typeof statusConfig]?.label || selectedStatus}' status.`}
            </p>
          </div>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {filteredPitches.map((pitch: Pitch) => (
            <PitchCard key={pitch.id} pitch={pitch} />
          ))}
        </div>
      ) : (
        <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
          <ScrollArea className="w-full">
                        <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-slate-300">Expert</TableHead>
                  <TableHead className="text-slate-300">Opportunity</TableHead>
                  <TableHead className="text-slate-300">Publication</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Submitted</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPitches.map((pitch: Pitch) => {
                  const dateInfo = formatDate(pitch.createdAt);
                  return (
                    <TableRow key={pitch.id} className="cursor-pointer hover:bg-slate-700/50 border-white/10 text-white"
                              onClick={() => {
                                setSelectedPitchId(pitch.id);
                                setIsPitchDetailsModalOpen(true);
                              }}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={pitch.user?.avatar || undefined} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                              {pitch.user?.fullName?.[0] || pitch.user?.username?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm text-white">
                              {pitch.user?.fullName || pitch.user?.username}
                            </p>
                            <p className="text-xs text-slate-300">{pitch.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm line-clamp-1 text-white">
                          {pitch.opportunity?.title || `Opportunity #${pitch.opportunityId}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-300">{pitch.publication?.name || 'N/A'}</p>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <StatusBadge status={pitch.status} />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-300">{dateInfo.relative}</p>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-white hover:bg-slate-700/50">
                              ⋯
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-white/20">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPitchId(pitch.id);
                              setIsPitchDetailsModalOpen(true);
                            }} className="text-slate-300 hover:bg-slate-700/50">
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {Object.entries(statusConfig).map(([key, config]) => {
                              return (
                                <DropdownMenuItem 
                                  key={key}
                                  onClick={() => updatePitchStatus(pitch.id, key)}
                                  disabled={pitch.status === key}
                                  className="text-slate-300 hover:bg-slate-700/50"
                                >
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