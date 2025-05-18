import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useQuery } from '@tanstack/react-query';
import { Loader2, FileText, Mic, Check, X, ChevronDown, List, LayoutGrid, Send } from 'lucide-react';
import { format } from 'date-fns';
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
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Define the pitch type
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
  };
  opportunity?: {
    id: number;
    title: string;
    publicationId: number;
  };
  publication?: {
    id: number;
    name: string;
    logo?: string;
  };
}

interface AdminPitchesListProps {
  filter?: string;
}

export default function AdminPitchesList({ filter = 'all' }: AdminPitchesListProps) {
  console.log('AdminPitchesList component rendering with filter:', filter);
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  // State for view toggle - moved to top of component
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  // State for the pitch details modal
  const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);
  const [isPitchDetailsModalOpen, setIsPitchDetailsModalOpen] = useState(false);
  
  // Handler to open the pitch details modal
  const handleViewPitchDetails = (pitchId: number) => {
    setSelectedPitchId(pitchId);
    setIsPitchDetailsModalOpen(true);
  };
  
  // Handler to close the pitch details modal
  const handleClosePitchDetailsModal = () => {
    setIsPitchDetailsModalOpen(false);
    setSelectedPitchId(null);
  };
  
  useEffect(() => {
    console.log('Filter prop changed, updating selectedStatus to:', filter);
    if (filter) {
      setSelectedStatus(filter);
    }
  }, [filter]);

  // Fetch all pitches with a shorter staleTime to refresh more often
  const {
    data: pitches = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/pitches'],
    queryFn: async () => {
      console.log('Fetching admin pitches...');
      const res = await apiFetch('/api/admin/pitches', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!res.ok) {
        console.error(`Error fetching pitches: ${res.status}`);
        throw new Error(`Error fetching pitches: ${res.status}`);
      }
      
      const data = await res.json();
      console.log(`Received ${data.length} pitches from API`);
      return data;
    },
    staleTime: 60000, // Consider data stale after 60 seconds
    refetchOnWindowFocus: false, // Don't refresh when window regains focus
    refetchInterval: 60000 // Auto-refresh only every 60 seconds
  });
  
  // Force refresh when component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  // Filter pitches based on selected status
  const filteredPitches = pitches ? pitches.filter((pitch: Pitch) => {
    if (selectedStatus === 'all') return true;
    return pitch.status === selectedStatus;
  }) : [];

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

  // Move to billing manager
  const moveToBillingManager = async (pitchId: number) => {
    try {
      await apiRequest('POST', `/api/admin/sync-placements`, { pitchIds: [pitchId] });
      toast({
        title: 'Success',
        description: 'Pitch has been moved to billing manager',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to move pitch to billing manager',
        variant: 'destructive',
      });
    }
  };

  // Status badge component
  // Define available status options
  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'sent_to_reporter', label: 'Sent to Reporter', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'interested', label: 'Reporter Interested', color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'not_interested', label: 'Not Interested', color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'successful', label: 'Successful Coverage', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ];
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'sent_to_reporter':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sent to Reporter</Badge>;
      case 'interested':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Reporter Interested</Badge>;
      case 'not_interested':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Not Interested</Badge>;
      case 'successful':
        return <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">Successful Coverage</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Editable Status Cell Component
  const EditableStatusCell = ({ pitch }: { pitch: Pitch }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    
    const handleStatusChange = async (newStatus: string) => {
      setIsUpdating(true);
      try {
        await updatePitchStatus(pitch.id, newStatus);
      } finally {
        setIsUpdating(false);
      }
    };
    
    return (
      <div className="relative">
        <select
          value={pitch.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className={`w-full rounded-md border border-gray-200 p-2 text-sm focus:border-blue-500 focus:ring-blue-500 ${
            isUpdating ? 'bg-gray-100 opacity-70' : 'bg-white'
          }`}
          disabled={isUpdating}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          </div>
        )}
      </div>
    );
  };


  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Calculate time since (2 days ago, etc.)
  const getTimeSince = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} days ago`;
    } catch (e) {
      return 'Unknown';
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading pitches...</span>
      </div>
    );
  }

  // Handle error state
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

  // Kanban board component
  const KanbanBoard = ({ pitches }: { pitches: Pitch[] }) => {
    // Group pitches by status
    const statusGroups = {
      pending: pitches.filter(p => p.status === 'pending'),
      sent_to_reporter: pitches.filter(p => p.status === 'sent_to_reporter'),
      interested: pitches.filter(p => p.status === 'interested'),
      not_interested: pitches.filter(p => p.status === 'not_interested'),
      successful: pitches.filter(p => p.status === 'successful'),
    };
    
    const statusColumns = [
      { key: 'pending', label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      { key: 'sent_to_reporter', label: 'Sent to Reporter', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { key: 'interested', label: 'Reporter Interested', color: 'bg-green-50 text-green-700 border-green-200' },
      { key: 'not_interested', label: 'Not Interested', color: 'bg-red-50 text-red-700 border-red-200' },
      { key: 'successful', label: 'Successful Coverage', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    ];
    
    // Handle drag and drop functionality
    const handleDragStart = (e: React.DragEvent, pitch: Pitch) => {
      e.dataTransfer.setData('pitch_id', pitch.id.toString());
    };
    
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
    };
    
    const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
      e.preventDefault();
      const pitchId = parseInt(e.dataTransfer.getData('pitch_id'));
      if (pitchId) {
        try {
          await updatePitchStatus(pitchId, targetStatus);
        } catch (error) {
          console.error('Error updating status:', error);
        }
      }
    };
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
        {statusColumns.map(column => (
          <div key={column.key} className="flex flex-col">
            <div className={`p-3 rounded-t-md font-semibold ${column.color} shadow-sm`}>
              {column.label} ({statusGroups[column.key as keyof typeof statusGroups]?.length || 0})
            </div>
            <div 
              className="bg-white rounded-b-md p-1 min-h-[300px] flex flex-col space-y-1 overflow-y-auto max-h-[600px] border-t border-gray-100 shadow-inner"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.key)}
            >
              {statusGroups[column.key as keyof typeof statusGroups]?.map(pitch => (
                <div 
                  key={pitch.id} 
                  className="bg-white p-2 rounded border shadow-sm hover:shadow-md transition-shadow duration-200 hover:border-gray-300 cursor-move text-sm"
                  draggable
                  onDragStart={(e) => handleDragStart(e, pitch)}
                >
                  <div className="font-medium text-xs truncate mb-0.5">
                    {pitch.opportunity?.title || `Opportunity #${pitch.opportunityId}`}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {pitch.user?.username || `User #${pitch.userId}`}
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      {pitch.audioUrl ? 'Audio' : 'Text'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => handleViewPitchDetails(pitch.id)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
              {statusGroups[column.key as keyof typeof statusGroups]?.length === 0 && (
                <div 
                  className="flex flex-col items-center justify-center h-24 text-gray-400 text-xs p-2 bg-gray-50 rounded-md border border-dashed border-gray-200 m-1"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.key)}
                >
                  <FileText className="h-4 w-4 mb-1 text-gray-300" />
                  No {column.label.toLowerCase()} pitches
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Empty state - show the UI even with no data for demo purposes
  const isEmpty = !pitches || pitches.length === 0;

  return (
    <div className="space-y-3 pb-4 overflow-x-auto">
      {/* Toolbar with improved visual styling */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-gradient-to-r from-gray-50 to-white p-3 rounded-lg border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle - Enhanced styling */}
          <div className="flex space-x-1 border rounded-md shadow-sm overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none ${viewMode === 'list' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'hover:bg-slate-100'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none ${viewMode === 'kanban' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'hover:bg-slate-100'}`}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
          </div>
          
          {viewMode === 'kanban' && (
            <>
              <div className="border-r h-6 mx-1 hidden md:block" />
              
              <div className="inline-flex items-center rounded-md bg-gray-50 p-1 border shadow-sm">
                <Button 
                  variant="ghost"
                  size="sm"
                  className={`px-3 py-1 text-xs font-medium ${selectedStatus === 'all' ? 'bg-white shadow-sm text-indigo-600 rounded' : 'text-gray-600'}`}
                  onClick={() => setSelectedStatus('all')}
                >
                  All
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  className={`px-3 py-1 text-xs font-medium ${selectedStatus === 'pending' ? 'bg-white shadow-sm text-yellow-600 rounded' : 'text-gray-600'}`}
                  onClick={() => setSelectedStatus('pending')}
                >
                  Pending
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  className={`px-3 py-1 text-xs font-medium ${selectedStatus === 'sent_to_reporter' ? 'bg-white shadow-sm text-blue-600 rounded' : 'text-gray-600'}`}
                  onClick={() => setSelectedStatus('sent_to_reporter')}
                >
                  Sent to Reporter
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  className={`px-3 py-1 text-xs font-medium ${selectedStatus === 'interested' ? 'bg-white shadow-sm text-green-600 rounded' : 'text-gray-600'}`}
                  onClick={() => setSelectedStatus('interested')}
                >
                  Interested
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  className={`px-3 py-1 text-xs font-medium ${selectedStatus === 'not_interested' ? 'bg-white shadow-sm text-red-600 rounded' : 'text-gray-600'}`}
                  onClick={() => setSelectedStatus('not_interested')}
                >
                  Not Interested
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  className={`px-3 py-1 text-xs font-medium ${selectedStatus === 'successful' ? 'bg-white shadow-sm text-purple-600 rounded' : 'text-gray-600'}`}
                  onClick={() => setSelectedStatus('successful')}
                >
                  Successful
                </Button>
              </div>
            </>
          )}
        </div>
        
        {/* Empty space to maintain layout */}
        <div></div>
      </div>

      {viewMode === 'list' 
        ? filteredPitches.length === 0 
          ? (
            <div className="bg-white rounded-lg border shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="mb-4 bg-gray-50 p-4 rounded-full">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pitches found</h3>
              <p className="text-gray-500 text-center max-w-md mb-6">
                {selectedStatus === 'all' 
                  ? "There are no pitches in the system yet. Pitches will appear here once users submit them."
                  : `No pitches with '${selectedStatus}' status found. Try selecting a different filter or check again later.`
                }
              </p>
              <div className="flex flex-col items-center gap-3">
                <Button onClick={() => setSelectedStatus('all')} variant="outline">
                  View all pitches
                </Button>

              </div>
            </div>
          ) 
          : (
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-1">
                        Opportunity
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-1">
                        User
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-1">
                        Type
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                      </div>
                    </TableHead>
                    <TableHead className="max-w-xs font-semibold">Pitch Preview</TableHead>
                    <TableHead className="font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-1">
                        Status
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-1">
                        Date
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPitches.map((pitch: Pitch) => (
                    <TableRow key={pitch.id}>
                      <TableCell className="font-medium">
                        {pitch.opportunity ? pitch.opportunity.title : `Opportunity ID: ${pitch.opportunityId}`}
                      </TableCell>
                      <TableCell>
                        {pitch.user ? (
                          <div className="flex flex-col">
                            <span>{pitch.user.fullName || pitch.user.username}</span>
                            <span className="text-xs text-gray-500">{pitch.user.email}</span>
                          </div>
                        ) : (
                          `User ID: ${pitch.userId}`
                        )}
                      </TableCell>
                      <TableCell>
                        {pitch.audioUrl ? (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Mic className="h-4 w-4" />
                            <span>Audio</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-600">
                            <FileText className="h-4 w-4" />
                            <span>Text</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {pitch.audioUrl ? (
                          <div>
                            <audio controls className="w-full max-w-xs">
                              <source src={pitch.audioUrl} type="audio/mpeg" />
                            </audio>
                            <p className="text-xs text-gray-500 mt-1 truncate">{pitch.transcript}</p>
                          </div>
                        ) : (
                          pitch.content
                        )}
                      </TableCell>
                      <TableCell>
                        <EditableStatusCell pitch={pitch} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDate(pitch.createdAt)}</span>
                          <span className="text-xs text-gray-500">{getTimeSince(pitch.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewPitchDetails(pitch.id)}>
                            View Details
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                Actions <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updatePitchStatus(pitch.id, 'sent_to_reporter')}>
                                <Send className="mr-2 h-4 w-4 text-blue-500" /> Mark as Sent to Reporter
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updatePitchStatus(pitch.id, 'interested')}>
                                <Check className="mr-2 h-4 w-4 text-green-500" /> Mark as Interested
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updatePitchStatus(pitch.id, 'not_interested')}>
                                <X className="mr-2 h-4 w-4 text-red-500" /> Mark as Not Interested
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updatePitchStatus(pitch.id, 'successful')}>
                                <Check className="mr-2 h-4 w-4 text-purple-500" /> Mark as Successful
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => moveToBillingManager(pitch.id)}>
                                <Check className="mr-2 h-4 w-4 text-blue-500" /> Add to Billing Manager
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        : <KanbanBoard pitches={pitches} />
      }
      {/* Pitch details modal */}
      {selectedPitchId && (
        <PitchDetailsModal
          isOpen={isPitchDetailsModalOpen}
          onClose={handleClosePitchDetailsModal}
          pitchId={selectedPitchId}
        />
      )}
    </div>
  );
}