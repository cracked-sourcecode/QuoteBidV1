import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Loader2, Grid, ListFilter, Check, List, LayoutGrid } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDistanceToNow } from 'date-fns';

// Define pitch status options
const PITCH_STATUSES = [
  { value: 'pending', label: 'Pitch Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'sent_to_reporter', label: 'Sent to Reporter', color: 'bg-blue-100 text-blue-800' },
  { value: 'interested', label: 'Reporter Interested', color: 'bg-green-100 text-green-800' },
  { value: 'not_interested', label: 'Reporter Not Interested', color: 'bg-red-100 text-red-800' },
  { value: 'successful', label: 'Successful Coverage', color: 'bg-purple-100 text-purple-800' },
];

// Define placement status options
const PLACEMENT_STATUSES = [
  { value: 'ready_for_billing', label: 'Ready for Billing', color: 'bg-amber-100 text-amber-800' },
  { value: 'paid', label: '🟢 Paid', color: 'bg-green-100 text-green-800' },
  { value: 'error', label: 'Error', color: 'bg-red-100 text-red-800' },
];

const getBadgeColorForStatus = (status: string) => {
  const statusItem = PITCH_STATUSES.find(s => s.value === status);
  return statusItem?.color || 'bg-gray-100 text-gray-800';
};

// Schema for placement creation when a pitch is successful
const placementFormSchema = z.object({
  articleTitle: z.string().min(1, "Article title is required"),
  articleUrl: z.string().url("Please enter a valid URL"),
  amount: z.string().min(1, "Amount is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format. Example: 1250 or 1250.50"),
  notes: z.string().optional(),
});

const PitchesManager = () => {
  const { toast } = useToast();
  const [selectedPitch, setSelectedPitch] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  
  // Sync the tab and filter status
  useEffect(() => {
    // When changing tabs, update the filter status
    if (activeTab !== 'all') {
      setFilterStatus(activeTab);
    }
  }, [activeTab]);
  
  // Form for placement creation
  const placementForm = useForm<z.infer<typeof placementFormSchema>>({
    resolver: zodResolver(placementFormSchema),
    defaultValues: {
      articleTitle: '',
      articleUrl: '',
      amount: '',
      notes: '',
    },
  });

  // Fetch all pitches
  const { 
    data: pitches, 
    isLoading, 
    error,
    refetch: refetchPitches,  // Add refetch function
  } = useQuery({
    queryKey: ['/api/admin/pitches'],
    queryFn: async () => {
      console.log("Fetching pitches for admin panel...");
      try {
        const res = await apiRequest('GET', '/api/admin/pitches');
        if (!res.ok) {
          console.error("Failed to fetch pitches:", res.status, res.statusText);
          throw new Error(`Failed to fetch pitches: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        
        // Enhanced debugging for pitch data
        console.log(`Successfully fetched ${data.length} pitches`);
        
        // Log critical pitch data patterns 
        if (data.length > 0) {
          const firstPitch = data[0];
          console.log('First pitch structure:', {
            id: firstPitch.id,
            // Check both formats
            userIdCamel: firstPitch.userId, 
            userIdSnake: firstPitch.user_id,
            // Check if nested user data exists
            hasUserObj: !!firstPitch.user,
            userObjId: firstPitch.user?.id,
            // Basic pitch properties
            hasContent: !!firstPitch.content,
            hasOpportunity: !!firstPitch.opportunity,
            status: firstPitch.status,
            createdAt: firstPitch.createdAt
          });
          
          // Log all available user IDs to help diagnose matching issues
          console.log('All pitch user IDs:', data.map((p: any) => 
            ({ pitchId: p.id, userId: p.userId || p.user_id, userObjId: p.user?.id }))
          );
        }
        
        return data;
      } catch (error) {
        console.error("Error fetching pitches:", error);
        throw error;
      }
    },
    retry: 2,
  });

  // Fetch users info for reference (to display names)
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('GET', '/api/admin/users').then(res => res.json()),
  });
  
  // Fetch placements for the billing tab
  const { data: placements, isLoading: placementsLoading } = useQuery({
    queryKey: ['/api/admin/placements'],
    queryFn: () => apiRequest('GET', '/api/admin/placements').then(res => res.json()),
  });

  // Update pitch status mutation
  const updatePitchStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/pitches/${id}/status`, { status });
      return res.json();
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pitches'] });
      
      // If the pitch is marked as successful, show the billing dialog
      if ((variables.status === 'successful' || variables.status === 'Successful Coverage') && selectedPitch) {
        // Get the actual bid amount for this user's bid on this opportunity
        let bidAmount = 0;
        
        try {
          const bidsRes = await apiRequest('GET', `/api/opportunities/${selectedPitch.opportunityId}/bids`);
          const bidsData = await bidsRes.json();
          
          // Find the bid from this specific user
          const userBid = bidsData.find((bid: any) => bid.userId === selectedPitch.userId);
          
          if (userBid) {
            bidAmount = userBid.amount;
          } else {
            // Fall back to opportunity minimum bid if no user bid found
            bidAmount = selectedPitch.opportunity?.minimumBid || 0;
          }
        } catch (error) {
          console.error("Error fetching bids:", error);
          // Fall back to opportunity min bid if bid fetch fails
          bidAmount = selectedPitch.opportunity?.minimumBid || 0;
        }
        
        // Pre-populate the form with the opportunity title if available
        if (selectedPitch?.opportunity?.title) {
          placementForm.setValue('articleTitle', selectedPitch.opportunity.title);
        }
        
        // Set the actual bid amount
        placementForm.setValue('amount', bidAmount.toString());
        
        // Show the billing dialog
        setShowBillingDialog(true);
        
        // Also create a placeholder/pending placement in the billing tab
        // This ensures it's visible in the billing queue immediately
        const publicationId = selectedPitch.opportunity?.publicationId;
        if (publicationId) {
          // Auto-create a placement with default/pending status for the billing tab
          const placementResponse = await apiRequest('POST', '/api/admin/placements', {
            pitchId: selectedPitch.id,
            userId: selectedPitch.userId,
            opportunityId: selectedPitch.opportunityId,
            publicationId,
            articleTitle: selectedPitch.opportunity?.title || 'Pending article',
            articleUrl: '#', // Placeholder URL
            amount: bidAmount,
            status: 'ready_for_billing'
          });
          
          if (placementResponse.ok) {
            // Get the newly created placement
            const newPlacement = await placementResponse.json();
            
            // Refresh placements list to show the new placement
            queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
            
            // Automatically process the billing
            try {
              toast({
                title: "Processing payment...",
                description: "Automatically charging the client's card for this successful placement.",
              });
              
              // Ensure user has a Stripe customer ID first
              try {
                // Check and create Stripe customer ID if needed
                const ensureUserResponse = await apiRequest('POST', `/api/admin/users/${selectedPitch.userId}/ensure-stripe-customer`, {});
                
                if (!ensureUserResponse.ok) {
                  const errorData = await ensureUserResponse.json();
                  console.error("Failed to ensure Stripe customer:", errorData);
                  toast({
                    title: "Stripe setup failed",
                    description: "Could not create/verify Stripe customer for this user.",
                    variant: "destructive"
                  });
                  throw new Error("Failed to ensure Stripe customer");
                }
              } catch (stripeSetupError) {
                console.error("Error setting up Stripe customer:", stripeSetupError);
                throw stripeSetupError; // Re-throw to be caught by the outer catch
              }
              
              // Process billing for the new placement
              const billingResponse = await apiRequest('POST', `/api/admin/placements/${newPlacement.id}/bill`, {});
              
              if (billingResponse.ok) {
                const billingResult = await billingResponse.json();
                
                toast({
                  title: "Payment processed",
                  description: `Client was automatically charged $${bidAmount} for the successful placement.`,
                });
                
                // If payment successful, also send notification
                if (billingResult.success) {
                  try {
                    await apiRequest('POST', `/api/admin/placements/${newPlacement.id}/notify`, {});
                    toast({
                      title: "Client notified",
                      description: "The client has been automatically notified of their successful placement.",
                    });
                  } catch (notifyError) {
                    toast({
                      title: "Notification failed",
                      description: "Payment successful, but client notification failed. Please notify manually.",
                      variant: "destructive"
                    });
                  }
                }
              }
            } catch (error) {
              console.error("Error processing automatic billing:", error);
              toast({
                title: "Automatic billing failed",
                description: "The placement was created but automatic billing failed. You can bill manually from the Placements tab.",
                variant: "destructive"
              });
            }
          }
        }
      } else {
        toast({
          title: 'Pitch status updated',
          description: 'The pitch status has been successfully updated.',
        });
        setDetailsOpen(false);
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to update pitch',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Create placement and process billing mutation
  const createPlacement = useMutation({
    mutationFn: async (data: {
      pitchId: number;
      userId: number;
      opportunityId: number;
      publicationId: number;
      articleTitle: string;
      articleUrl: string;
      amount: number;
      notes?: string;
    }) => {
      const res = await apiRequest('POST', '/api/admin/placements', data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Placement created',
        description: 'The client will be billed for this placement.',
      });
      
      // If the placement has an ID, immediately process the billing
      if (data.id) {
        processBilling.mutate(data.id);
      }
      
      // Close the dialog
      setShowBillingDialog(false);
      setDetailsOpen(false);
      
      // Refresh the pitches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pitches'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create placement',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Process billing mutation
  const processBilling = useMutation({
    mutationFn: async (placementId: number) => {
      const res = await apiRequest('POST', `/api/admin/placements/${placementId}/bill`, {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Payment processed',
          description: `Client has been charged $${data.placement.amount.toLocaleString()}.`,
        });
      } else {
        toast({
          title: 'Payment status',
          description: data.message || 'The payment is pending.',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Billing failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  // Function to get user name from id
  const getUserNameById = (userId: number | string) => {
    // Early return if no users or invalid userId
    if (!users || (!userId && userId !== 0)) {
      console.log(`No user found for ID: ${userId} (users data available: ${!!users})`);
      return 'Unknown User';
    }
    
    // Convert userId to number for comparison
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    
    // Try to find the user by ID
    let user = users.find((u: any) => u.id === userIdNum);
    
    // If user is not found, log detailed info for debugging
    if (!user) {
      console.log(`User lookup failed for ID: ${userId}. Available IDs: ${users.map((u: any) => u.id).join(', ')}`);
      
      // If we have the embedded user object directly in the pitch
      if (selectedPitch?.user && selectedPitch.user.id === userIdNum) {
        return selectedPitch.user.fullName || selectedPitch.user.username || 'User';
      }
      
      return 'Unknown User';
    }
    
    // Return user name if found
    return user.fullName || user.username || 'User';
  };

  // Function to format date relative to now
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Unknown date';
    }
  };

  // Filter pitches by status
  const filteredPitches = pitches?.filter((pitch: any) => {
    if (filterStatus === 'all') return true;
    return pitch.status === filterStatus;
  });

  // View pitch details handler
  const handleViewPitch = (pitch: any) => {
    setSelectedPitch(pitch);
    setDetailsOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = (newStatus: string) => {
    if (selectedPitch) {
      updatePitchStatus.mutate({ id: selectedPitch.id, status: newStatus });
    }
  };
  
  // Function to handle updating status from the table view
  const handleTableStatusUpdate = (pitchId: number, newStatus: string) => {
    updatePitchStatus.mutate({ id: pitchId, status: newStatus });
  };
  
  // Kanban board component
  const KanbanBoard = ({ pitches }: { pitches: any[] }) => {
    const { toast } = useToast();
    
    // Group pitches by status
    const pitchesByStatus = PITCH_STATUSES.reduce((acc: any, status) => {
      acc[status.value] = Array.isArray(pitches) ? pitches.filter((p: any) => p.status === status.value) : [];
      return acc;
    }, {});

    // Function to handle moving a pitch to a different status column
    const movePitchToStatus = (pitchId: number, newStatus: string) => {
      console.log(`Moving pitch ${pitchId} to status: ${newStatus}`);
      
      // Update the pitch status via API
      updatePitchStatus.mutate(
        { id: pitchId, status: newStatus },
        {
          onSuccess: () => {
            toast({
              title: "Pitch updated",
              description: `Pitch moved to ${PITCH_STATUSES.find(s => s.value === newStatus)?.label}`,
            })
          }
        }
      );
    };

    const handleCardContext = (e: React.MouseEvent, pitchId: number) => {
      e.preventDefault();
      e.stopPropagation();
      
      // For future enhancement: Show a context menu with quick status change options
      // For now, just open the detailed view
      const pitch = pitches.find(p => p.id === pitchId);
      if (pitch) {
        handleViewPitch(pitch);
      }
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PITCH_STATUSES.map((status) => (
          <div key={status.value} className="flex flex-col space-y-2">
            <div className={`py-2 px-3 rounded-t-lg font-semibold text-sm ${status.color}`}>
              {status.label} ({pitchesByStatus[status.value]?.length || 0})
            </div>
            <div className="bg-slate-50 rounded-b-lg p-2 min-h-[300px] flex flex-col space-y-2 overflow-y-auto">
              {pitchesByStatus[status.value]?.map((pitch: any) => (
                <Card 
                  key={pitch.id} 
                  className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-[160px]"
                  onClick={() => handleViewPitch(pitch)}
                  onContextMenu={(e) => handleCardContext(e, pitch.id)}
                >
                  {/* Content Area - grows to fill available space */}
                  <div className="flex-1 flex flex-col space-y-2">
                    <div className="text-sm font-medium line-clamp-2 leading-tight">
                      {pitch.opportunity?.title || `Story #${pitch.opportunityId}`}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {getUserNameById(pitch.userId)}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {pitch.audioUrl ? 'Audio' : 'Text'}
                      </Badge>
                      <div className="text-xs text-gray-400">
                        {formatDate(pitch.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Area - fixed at bottom */}
                  <div className="pt-3 border-t border-gray-200 mt-auto">
                    <Select 
                      defaultValue={pitch.status}
                      onValueChange={(value) => movePitchToStatus(pitch.id, value)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Move to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PITCH_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value} disabled={s.value === pitch.status}>
                            Move to: {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              ))}
              {(!pitchesByStatus[status.value] || pitchesByStatus[status.value].length === 0) && (
                <div className="text-sm text-gray-400 text-center p-4">
                  No pitches
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Enhanced table view with status dropdown
  const TableView = ({ pitches }: { pitches: any[] }) => {
    // Function to handle status change for a specific pitch
    const handleStatusChange = (pitchId: number, newStatus: string) => {
      console.log(`Changing pitch ${pitchId} status to: ${newStatus}`);
      updatePitchStatus.mutate({ id: pitchId, status: newStatus });
    };

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Opportunity</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Pitch Preview</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.isArray(pitches) && pitches.length > 0 ? (
            pitches.map((pitch: any) => (
              <TableRow key={pitch.id}>
                <TableCell className="font-medium">
                  {pitch.opportunity?.title 
                    ? `${pitch.opportunity.title} (${pitch.opportunity.publication?.name || 'N/A'})` 
                    : `Story #${pitch.opportunityId}`}
                </TableCell>
                <TableCell>{getUserNameById(pitch.userId)}</TableCell>
                <TableCell>
                  {pitch.audioUrl ? 
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">Audio</Badge> : 
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">Text</Badge>
                  }
                </TableCell>
                <TableCell className="max-w-xs">
                  {pitch.content ? (
                    <div className="truncate text-xs text-gray-600">
                      {pitch.content.length > 50 ? `${pitch.content.substring(0, 50)}...` : pitch.content}
                    </div>
                  ) : pitch.transcript ? (
                    <div className="truncate text-xs text-gray-600">
                      {pitch.transcript.length > 50 ? `${pitch.transcript.substring(0, 50)}...` : pitch.transcript}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No content</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="w-[180px]">
                    <Select 
                      defaultValue={pitch.status}
                      onValueChange={(value) => handleStatusChange(pitch.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status">
                          <Badge className={getBadgeColorForStatus(pitch.status)}>
                            {PITCH_STATUSES.find(s => s.value === pitch.status)?.label || pitch.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PITCH_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center">
                              <Badge className={status.color + " mr-2"}>
                                {status.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>{formatDate(pitch.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewPitch(pitch)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No pitches found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };
  
  // Handle placement form submission
  const handlePlacementSubmit = (formData: z.infer<typeof placementFormSchema>) => {
    if (!selectedPitch) return;
    
    // Convert amount to number
    const amount = parseFloat(formData.amount);
    
    // Get publication ID from the opportunity
    const publicationId = selectedPitch.opportunity?.publicationId;
    
    if (!publicationId) {
      toast({
        title: 'Missing publication',
        description: 'This opportunity does not have an associated publication.',
        variant: 'destructive',
      });
      return;
    }
    
    // Create the placement
    createPlacement.mutate({
      pitchId: selectedPitch.id,
      userId: selectedPitch.userId,
      opportunityId: selectedPitch.opportunityId,
      publicationId,
      articleTitle: formData.articleTitle,
      articleUrl: formData.articleUrl,
      amount,
      notes: formData.notes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pitch Management</h1>
        <div className="flex items-center space-x-4">
          <Button
            variant="default"
            onClick={() => {
              toast({
                title: "Refreshing pitches...",
                description: "Fetching the latest pitch data from the server."
              });
              refetchPitches();
            }}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Pitches
          </Button>
          
          <Select
            value={filterStatus}
            onValueChange={setFilterStatus}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PITCH_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/pitches'] })}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">All Pitches</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="interested">Interested</TabsTrigger>
            <TabsTrigger value="not_interested">Not Interested</TabsTrigger>
            <TabsTrigger value="successful">Successful</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            {/* View Toggle - Moved into tab row */}
            <div className="border rounded-md overflow-hidden flex mr-2">
              <Button 
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-none ${viewMode === 'table' ? 'bg-slate-700' : 'hover:bg-slate-100'}`}
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button 
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-none ${viewMode === 'kanban' ? 'bg-slate-700' : 'hover:bg-slate-100'}`}
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Kanban
              </Button>
            </div>
            
            <Link href="/admin/billing" className="inline-flex items-center px-4 py-2 rounded-md bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Go to Billing Manager
            </Link>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-destructive">Failed to load pitches</p>
              </CardContent>
            </Card>
          ) : filteredPitches?.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">No pitches found</p>
              </CardContent>
            </Card>
          ) : (
            viewMode === 'table' ? (
              <Card>
                <CardContent className="p-0">
                  <TableView pitches={filteredPitches} />
                </CardContent>
              </Card>
            ) : (
              <KanbanBoard pitches={filteredPitches} />
            )
          )}
        </TabsContent>


        
        {/* Status Tabs */}
        {PITCH_STATUSES.map((status) => (
          <TabsContent key={status.value} value={status.value} className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              viewMode === 'table' ? (
                <Card>
                  <CardContent className="p-0">
                    <TableView pitches={pitches?.filter((p: any) => p.status === status.value) || []} />
                  </CardContent>
                </Card>
              ) : (
                <KanbanBoard pitches={pitches?.filter((p: any) => p.status === status.value) || []} />
              )
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Pitch Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Pitch Details</SheetTitle>
            <SheetDescription>
              Review and update the pitch status
            </SheetDescription>
          </SheetHeader>

          {selectedPitch && (
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Opportunity</h3>
                <p className="text-lg font-semibold">
                  {selectedPitch.opportunity?.title 
                    ? `${selectedPitch.opportunity.title} (${selectedPitch.opportunity.publication?.name || 'N/A'})` 
                    : `Story #${selectedPitch.opportunityId}`}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">From</h3>
                <p>{getUserNameById(selectedPitch.userId)}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Current Status</h3>
                <Badge className={getBadgeColorForStatus(selectedPitch.status) + " text-sm py-1 px-2"}>
                  {PITCH_STATUSES.find(s => s.value === selectedPitch.status)?.label || selectedPitch.status}
                </Badge>
              </div>

              {selectedPitch.content && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Text Pitch</h3>
                  <div className="bg-muted p-4 rounded-md whitespace-pre-wrap border border-gray-200">
                    {selectedPitch.content}
                  </div>
                </div>
              )}

              {selectedPitch.audioUrl && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Voice Pitch</h3>
                  <div className="bg-muted p-4 rounded-md">
                    <audio src={selectedPitch.audioUrl} controls className="w-full"></audio>
                  </div>
                </div>
              )}

              {selectedPitch.transcript && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Voice Pitch Transcript</h3>
                  <div className="bg-muted p-4 rounded-md whitespace-pre-wrap border border-gray-200">
                    {selectedPitch.transcript}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Update Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PITCH_STATUSES.map((status) => (
                    <Button
                      key={status.value}
                      variant={selectedPitch.status === status.value ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => handleStatusUpdate(status.value)}
                      disabled={updatePitchStatus.isPending}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setDetailsOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Billing Dialog for Successful Pitches */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Placement & Bill Client</DialogTitle>
            <DialogDescription>
              Enter the placement details to create coverage record and bill the client.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...placementForm}>
            <form onSubmit={placementForm.handleSubmit(handlePlacementSubmit)} className="space-y-4 py-2">
              <FormField
                control={placementForm.control}
                name="articleTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the article title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={placementForm.control}
                name="articleUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://publication.com/article" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={placementForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Amount ($)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 1250.00" 
                        {...field} 
                        type="text"
                      />
                    </FormControl>
                    <FormDescription>
                      Amount to charge the client's card on file
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={placementForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional notes about this placement" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowBillingDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPlacement.isPending || processBilling.isPending}
                >
                  {createPlacement.isPending || processBilling.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Create & Bill Client"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PitchesManager;