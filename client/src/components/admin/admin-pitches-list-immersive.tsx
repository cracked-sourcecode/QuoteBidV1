import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useQuery } from '@tanstack/react-query';
import { 
  Loader2, FileText, Mic, Check, X, ChevronDown, List, LayoutGrid, Send, 
  User, Calendar, Building2, Target, Eye, Clock, TrendingUp, AlertCircle,
  MessageSquare, Mail, Phone, Linkedin, Globe, DollarSign
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import PitchDetailsModal from './pitch-details-modal-redesigned';

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
  
  useEffect(() => {
    if (filter) {
      setSelectedStatus(filter);
    }
  }, [filter]);

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
  
  // Filter pitches based on selected status
  const filteredPitches = pitches.filter((pitch: Pitch) => {
    if (selectedStatus === 'all') return true;
    return pitch.status === selectedStatus;
  });

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
      <Badge variant="outline" className={`${config.color} inline-flex items-center gap-1.5 px-3 py-1.5 min-w-fit`}>
        <Icon className="h-3 w-3 flex-shrink-0" />
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

    return (
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" 
            onClick={() => {
              setSelectedPitchId(pitch.id);
              setIsPitchDetailsModalOpen(true);
            }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={pitch.user?.avatar || undefined} />
                <AvatarFallback className="bg-purple-100 text-purple-700">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {pitch.user?.fullName || pitch.user?.username || `User #${pitch.userId}`}
                </h3>
                <p className="text-sm text-gray-500">{pitch.user?.email}</p>
              </div>
            </div>
            <StatusBadge status={pitch.status} />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Opportunity Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Pitching for:</span>
            </div>
            <h4 className="font-semibold text-gray-900">
              {pitch.opportunity?.title || `Opportunity #${pitch.opportunityId}`}
            </h4>
            {pitch.publication && (
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{pitch.publication.name}</span>
              </div>
            )}
          </div>

          {/* Pitch Content Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {pitch.audioUrl ? (
                <>
                  <Mic className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Audio Pitch</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">Written Pitch</span>
                </>
              )}
            </div>
            
            {pitch.audioUrl ? (
              <div className="bg-blue-50 rounded-lg p-3">
                <audio controls className="w-full mb-2" onClick={(e) => e.stopPropagation()}>
                  <source src={pitch.audioUrl} type="audio/mpeg" />
                </audio>
                {pitch.transcript && (
                  <p className="text-sm text-gray-700 line-clamp-2">{pitch.transcript}</p>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <span className="line-clamp-3">{pitch.content || 'No content available'}</span>
                  {pitch.user?.fullName && pitch.user?.title && (
                    <span className="text-gray-600 italic">
                      —{pitch.user.fullName}, {pitch.user.title}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{dateInfo.relative}</span>
            </div>
            {pitch.bidAmount && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>${pitch.bidAmount}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPitchId(pitch.id);
                setIsPitchDetailsModalOpen(true);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Update Status</DropdownMenuLabel>
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
    <div className="space-y-4">
      {/* Enhanced Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full lg:w-auto">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full lg:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="sent_to_reporter">Sent</TabsTrigger>
            <TabsTrigger value="interested">Interested</TabsTrigger>
            <TabsTrigger value="not_interested">Declined</TabsTrigger>
            <TabsTrigger value="successful">Successful</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4 mr-1" />
            Table
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredPitches.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pitches found</h3>
            <p className="text-gray-500 max-w-md">
              {selectedStatus === 'all' 
                ? "There are no pitches in the system yet."
                : `No pitches with '${statusConfig[selectedStatus as keyof typeof statusConfig]?.label || selectedStatus}' status.`}
            </p>
          </div>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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