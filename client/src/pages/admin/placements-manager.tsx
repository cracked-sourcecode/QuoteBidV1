import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminHeader from "@/components/admin-header";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle,
  FileText,
  FileCheck,
  Search,
  DollarSign,
  Calendar,
  User as UserIcon,
  CreditCard,
  Link as LinkIcon,
  Image as ImageIcon,
  BarChart,
  AlertCircle,
  Printer,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  X,
  Clock,
  Download,
  Share,
  Mail
} from "lucide-react";

// Type definition for Placement with related data
type PlacementWithRelations = {
  id: number;
  pitchId: number;
  userId: number;
  opportunityId: number;
  publicationId: number;
  amount: number;
  status: string;
  articleTitle: string | null;
  articleUrl: string | null;
  screenshotUrl: string | null;
  publicationDate: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  notificationSent: boolean;
  metrics: Record<string, any>;
  createdAt: string;
  chargedAt: string | null;
  // Relations
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    avatar: string | null;
    stripeCustomerId: string | null;
  };
  opportunity: {
    id: number;
    title: string;
    publicationId: number;
  };
  publication: {
    id: number;
    name: string;
    logo: string;
  };
  pitch: {
    id: number;
    content: string | null;
  };
};

// Type for placement filter state
type FilterState = {
  customer: string;
  publication: string;
  status: string;
  minAmount: number | "";
  maxAmount: number | "";
  dateRange: "all" | "today" | "week" | "month";
};

export default function PlacementsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterState, setFilterState] = useState<FilterState>({
    customer: "",
    publication: "",
    status: "",
    minAmount: "",
    maxAmount: "",
    dateRange: "all",
  });
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementWithRelations | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [isConfirmPaymentLoading, setIsConfirmPaymentLoading] = useState(false);
  const [isSendNotificationLoading, setIsSendNotificationLoading] = useState(false);
  
  // Fetch all placements
  const { data: placements = [], isLoading: loadingPlacements } = useQuery<PlacementWithRelations[]>({
    queryKey: ['/api/admin/placements'],
  });

  // Bill now mutation
  const billPlacementMutation = useMutation({
    mutationFn: async (placementId: number) => {
      const res = await apiRequest('POST', `/api/admin/placements/${placementId}/bill`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to bill placement');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
      toast({
        title: "Payment successful",
        description: "The customer has been billed successfully.",
      });
      setIsBillingDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to process payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Retry failed billing mutation
  const retryBillingMutation = useMutation({
    mutationFn: async (placementId: number) => {
      const res = await apiRequest('POST', `/api/admin/placements/${placementId}/retry-billing`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to retry billing');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
      toast({
        title: "Payment retry successful",
        description: "The payment has been reprocessed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to retry payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (placementId: number) => {
      const res = await apiRequest('POST', `/api/admin/placements/${placementId}/notify`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to send notification');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
      toast({
        title: "Notification sent",
        description: "The customer has been notified of their successful placement.",
      });
      setIsNotifyDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send notification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Filter placements based on filter state
  const filteredPlacements = placements.filter(placement => {
    // Filter by customer name or email
    if (filterState.customer && 
        !placement.user.fullName.toLowerCase().includes(filterState.customer.toLowerCase()) && 
        !placement.user.email.toLowerCase().includes(filterState.customer.toLowerCase())) {
      return false;
    }
    
    // Filter by publication
    if (filterState.publication && 
        !placement.publication.name.toLowerCase().includes(filterState.publication.toLowerCase())) {
      return false;
    }
    
    // Filter by status
    if (filterState.status && placement.status !== filterState.status) {
      return false;
    }
    
    // Filter by min amount
    if (filterState.minAmount !== "" && placement.amount < filterState.minAmount) {
      return false;
    }
    
    // Filter by max amount
    if (filterState.maxAmount !== "" && placement.amount > filterState.maxAmount) {
      return false;
    }
    
    // Filter by date range
    if (filterState.dateRange !== "all") {
      const placementDate = new Date(placement.createdAt);
      const now = new Date();
      
      if (filterState.dateRange === "today") {
        if (placementDate.setHours(0, 0, 0, 0) !== now.setHours(0, 0, 0, 0)) {
          return false;
        }
      } else if (filterState.dateRange === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (placementDate < weekAgo) {
          return false;
        }
      } else if (filterState.dateRange === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        if (placementDate < monthAgo) {
          return false;
        }
      }
    }
    
    return true;
  });
  
  // Calculate total billable amount from filtered placements
  const totalBillableAmount = filteredPlacements
    .filter(p => p.status === 'pending_invoice')
    .reduce((total, p) => total + p.amount, 0);
  
  // Calculate monthly revenue
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = placements
    .filter(p => {
      if (p.status !== 'paid' || !p.chargedAt) return false;
      const paidDate = new Date(p.chargedAt);
      return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
    })
    .reduce((total, p) => total + p.amount, 0);

  return (
    <div>
      <AdminHeader active="placements" />
      
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Coverage & Billing</h1>
            <p className="text-muted-foreground">
              Manage placements, billing, and client notifications
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Today's Billable</CardTitle>
              <CardDescription>Placements pending invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <DollarSign className="h-5 w-5 text-amber-500 mr-1" />
                ${totalBillableAmount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>Total for {new Date().toLocaleString('default', { month: 'long' })}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <DollarSign className="h-5 w-5 text-green-500 mr-1" />
                ${monthlyRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Placement Stats</CardTitle>
              <CardDescription>Current placement status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 hover:bg-amber-600">
                    {placements.filter(p => p.status === 'pending_invoice').length}
                  </Badge>
                  <span className="text-sm">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500 hover:bg-green-600">
                    {placements.filter(p => p.status === 'paid').length}
                  </Badge>
                  <span className="text-sm">Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 hover:bg-red-600">
                    {placements.filter(p => p.status === 'failed').length}
                  </Badge>
                  <span className="text-sm">Failed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="all">All Placements</TabsTrigger>
              <TabsTrigger value="pending">Pending Invoice</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="failed">Failed Charges</TabsTrigger>
            </TabsList>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                className="pl-9 w-[300px]"
                value={filterState.customer}
                onChange={(e) => setFilterState({...filterState, customer: e.target.value})}
              />
            </div>
          </div>
          
          <div className="rounded-md border mb-6">
            <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Publication</label>
                <Input
                  placeholder="Any publication"
                  value={filterState.publication}
                  onChange={(e) => setFilterState({...filterState, publication: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Amount Range</label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={filterState.minAmount}
                    onChange={(e) => setFilterState({...filterState, minAmount: e.target.value ? parseInt(e.target.value) : ""})}
                  />
                  <span>-</span>
                  <Input
                    placeholder="Max"
                    type="number"
                    value={filterState.maxAmount}
                    onChange={(e) => setFilterState({...filterState, maxAmount: e.target.value ? parseInt(e.target.value) : ""})}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={filterState.status}
                  onChange={(e) => setFilterState({...filterState, status: e.target.value})}
                >
                  <option value="">Any status</option>
                  <option value="pending_invoice">Pending Invoice</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Date Range</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={filterState.dateRange}
                  onChange={(e) => setFilterState({...filterState, dateRange: e.target.value as FilterState['dateRange']})}
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">Past week</option>
                  <option value="month">Past month</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setFilterState({
                    customer: "",
                    publication: "",
                    status: "",
                    minAmount: "",
                    maxAmount: "",
                    dateRange: "all",
                  })}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
          
          <TabsContent value="all" className="mt-0">
            {renderPlacementsTable(filteredPlacements)}
          </TabsContent>
          
          <TabsContent value="pending" className="mt-0">
            {renderPlacementsTable(filteredPlacements.filter(p => p.status === 'pending_invoice'))}
          </TabsContent>
          
          <TabsContent value="paid" className="mt-0">
            {renderPlacementsTable(filteredPlacements.filter(p => p.status === 'paid'))}
          </TabsContent>
          
          <TabsContent value="failed" className="mt-0">
            {renderPlacementsTable(filteredPlacements.filter(p => p.status === 'failed'))}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Placement details dialog */}
      {selectedPlacement && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Placement Details</DialogTitle>
              <DialogDescription>
                View complete information about this media placement
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Article details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img 
                      src={selectedPlacement.publication.logo} 
                      alt={selectedPlacement.publication.name} 
                      className="h-10 w-10 object-contain"
                    />
                    <div>
                      <h3 className="text-lg font-bold">{selectedPlacement.publication.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPlacement.publicationDate ? 
                          new Date(selectedPlacement.publicationDate).toLocaleDateString() : 
                          "Publication date pending"}
                      </p>
                    </div>
                  </div>
                  
                  <Badge className={
                    selectedPlacement.status === 'paid' ? 'bg-green-500 hover:bg-green-600' :
                    selectedPlacement.status === 'pending_invoice' ? 'bg-amber-500 hover:bg-amber-600' :
                    'bg-red-500 hover:bg-red-600'
                  }>
                    {selectedPlacement.status === 'paid' ? 'PAID' :
                     selectedPlacement.status === 'pending_invoice' ? 'PENDING INVOICE' :
                     'FAILED'}
                  </Badge>
                </div>
                
                <div className="p-4 border rounded-md">
                  <h4 className="font-semibold mb-2">
                    {selectedPlacement.articleTitle || selectedPlacement.opportunity.title}
                  </h4>
                  
                  {selectedPlacement.articleUrl && (
                    <div className="flex items-center mb-2">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      <a 
                        href={selectedPlacement.articleUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedPlacement.articleUrl}
                      </a>
                    </div>
                  )}
                  
                  {selectedPlacement.screenshotUrl && (
                    <div className="mt-3">
                      <img 
                        src={selectedPlacement.screenshotUrl} 
                        alt="Article screenshot" 
                        className="rounded-md border max-h-[300px] object-contain"
                      />
                    </div>
                  )}
                  
                  <div className="mt-3">
                    <h4 className="font-medium text-sm mb-1">Client's Contribution:</h4>
                    <p className="text-sm p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      {selectedPlacement.pitch.content}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Customer details */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold">Client Information</h3>
                
                <div className="flex items-center space-x-4 p-3 border rounded-md">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(selectedPlacement.user.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{selectedPlacement.user.fullName}</h4>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Mail className="h-3 w-3 mr-1" /> {selectedPlacement.user.email}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Payment details */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold">Billing Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="font-bold">${selectedPlacement.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Stripe Customer:</span>
                      <span>{selectedPlacement.user.stripeCustomerId ? 
                        `${selectedPlacement.user.stripeCustomerId.substring(0, 8)}...` : 
                        'Not available'}</span>
                    </div>
                    {selectedPlacement.invoiceId && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Invoice ID:</span>
                        <span>{selectedPlacement.invoiceId.substring(0, 8)}...</span>
                      </div>
                    )}
                    {selectedPlacement.chargedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Charged On:</span>
                        <span>{new Date(selectedPlacement.chargedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Notification Sent:</span>
                      <Badge variant={selectedPlacement.notificationSent ? "default" : "outline"}>
                        {selectedPlacement.notificationSent ? "SENT" : "PENDING"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created On:</span>
                      <span>{new Date(selectedPlacement.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Performance metrics */}
              {selectedPlacement.metrics && Object.keys(selectedPlacement.metrics).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-md font-semibold">Performance Metrics</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(selectedPlacement.metrics).map(([key, value]) => (
                      <div key={key} className="p-3 border rounded-md">
                        <h4 className="text-sm text-muted-foreground mb-1 capitalize">{key}:</h4>
                        <p className="font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between items-center">
              <div className="flex gap-2">
                {!selectedPlacement.notificationSent && selectedPlacement.status === 'paid' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      setIsNotifyDialogOpen(true);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Notification
                  </Button>
                )}
                
                {selectedPlacement.status === 'pending_invoice' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      setIsBillingDialogOpen(true);
                    }}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Bill Now
                  </Button>
                )}
                
                {selectedPlacement.status === 'failed' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      retryBillingMutation.mutate(selectedPlacement.id);
                    }}
                    disabled={retryBillingMutation.isPending}
                  >
                    {retryBillingMutation.isPending && (
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    )}
                    Retry Payment
                  </Button>
                )}
              </div>
              
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Billing confirmation dialog */}
      {selectedPlacement && (
        <Dialog open={isBillingDialogOpen} onOpenChange={setIsBillingDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Billing</DialogTitle>
              <DialogDescription>
                You are about to charge the client for this media placement.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Customer:</span>
                  <span className="font-semibold">{selectedPlacement.user.fullName}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Publication:</span>
                  <span className="font-semibold">{selectedPlacement.publication.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-bold text-lg">${selectedPlacement.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Stripe Customer:</span>
                  <span>{selectedPlacement.user.stripeCustomerId ? 
                    `${selectedPlacement.user.stripeCustomerId.substring(0, 8)}...` : 
                    'Not available'}</span>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  This will charge the customer's card on file through Stripe and mark the placement as paid.
                </p>
                <p>
                  If there is no valid payment method on file or the charge fails, you will need to contact the customer.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsBillingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsConfirmPaymentLoading(true);
                  billPlacementMutation.mutate(selectedPlacement.id);
                }}
                disabled={isConfirmPaymentLoading || billPlacementMutation.isPending}
              >
                {(isConfirmPaymentLoading || billPlacementMutation.isPending) && (
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                )}
                Confirm Billing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Send notification dialog */}
      {selectedPlacement && (
        <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Client Notification</DialogTitle>
              <DialogDescription>
                Send the placement success notification to the client.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="border rounded-md p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-sm">Email Preview:</h3>
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md space-y-3">
                  <div>
                    <p className="font-semibold">Subject: 🎉 Your Expertise Was Featured in {selectedPlacement.publication.name}!</p>
                  </div>
                  
                  <div>
                    <p>Congrats {selectedPlacement.user.fullName.split(' ')[0]}!</p>
                    <p className="mt-2">Your bid of ${selectedPlacement.amount.toLocaleString()} secured your spot in this breaking story:</p>
                    <p className="mt-1">→ {selectedPlacement.articleTitle || selectedPlacement.opportunity.title} – {selectedPlacement.publication.name}</p>
                    {selectedPlacement.articleUrl && (
                      <p className="mt-1">→ <span className="text-blue-600">{selectedPlacement.articleUrl}</span></p>
                    )}
                    
                    <p className="mt-3">A receipt for ${selectedPlacement.amount.toLocaleString()} has been charged to your card on file.</p>
                    <p className="mt-1">Thank you for trusting our marketplace!</p>
                  </div>
                </div>
                
                <div className="mt-3 text-sm text-muted-foreground">
                  <p>This notification will be sent to: {selectedPlacement.user.email}</p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsNotifyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsSendNotificationLoading(true);
                  sendNotificationMutation.mutate(selectedPlacement.id);
                }}
                disabled={isSendNotificationLoading || sendNotificationMutation.isPending}
              >
                {(isSendNotificationLoading || sendNotificationMutation.isPending) && (
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                )}
                Send Notification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
  
  function renderPlacementsTable(placements: PlacementWithRelations[]) {
    if (loadingPlacements) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }
    
    if (placements.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold">No placements found</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            {Object.values(filterState).some(v => v !== "" && v !== "all") 
              ? "Try adjusting your filters to see more results."
              : "There are no placements available at this time."}
          </p>
        </div>
      );
    }
    
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Publication</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placements.map((placement) => (
                <TableRow key={placement.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(placement.user.fullName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium truncate max-w-[150px]">
                          {placement.user.fullName}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {placement.user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <img 
                        src={placement.publication.logo} 
                        alt={placement.publication.name} 
                        className="h-6 w-6 object-contain"
                      />
                      <span>{placement.publication.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">${placement.amount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {placement.articleTitle || "Placement confirmed"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {placement.status === 'paid' ? (
                      <Badge className="bg-green-500 hover:bg-green-600">PAID</Badge>
                    ) : placement.status === 'pending_invoice' ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600">PENDING</Badge>
                    ) : (
                      <Badge className="bg-red-500 hover:bg-red-600">FAILED</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      {new Date(placement.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {placement.chargedAt && `Paid: ${new Date(placement.chargedAt).toLocaleDateString()}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedPlacement(placement);
                                setIsDetailsDialogOpen(true);
                              }}
                            >
                              <FileCheck className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <DropdownMenu>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Actions</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <DropdownMenuContent align="end">
                          {placement.status === 'pending_invoice' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPlacement(placement);
                                setIsBillingDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Bill Now
                            </DropdownMenuItem>
                          )}
                          
                          {placement.status === 'paid' && !placement.notificationSent && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPlacement(placement);
                                setIsNotifyDialogOpen(true);
                              }}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Send Notification
                            </DropdownMenuItem>
                          )}
                          
                          {placement.status === 'failed' && (
                            <DropdownMenuItem
                              onClick={() => {
                                retryBillingMutation.mutate(placement.id);
                              }}
                              disabled={retryBillingMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Retry Payment
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPlacement(placement);
                              setIsDetailsDialogOpen(true);
                            }}
                          >
                            <FileCheck className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
}