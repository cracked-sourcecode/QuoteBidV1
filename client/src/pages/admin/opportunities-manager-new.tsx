import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Calendar,
  Clock,
  DollarSign,
  Edit,
  Filter,
  MoreHorizontal,
  Newspaper,
  Plus,
  Search,
  Tag,
  X,
  User,
  MessageSquare,
  Eye,
  Building2,
  Loader2,
  CalendarIcon,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { INDUSTRY_OPTIONS, MEDIA_TYPES, OPPORTUNITY_TIERS, REQUEST_TYPES } from "@/lib/constants";
import { useLocation } from 'wouter';
import { Publication } from '@shared/schema';
import LogoUniform from '@/components/ui/logo-uniform';
import { DayPicker } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import { cn } from "@/lib/utils";
import 'react-day-picker/dist/style.css';
import { getPublicationLogo } from '@/lib/responsive-utils';
import { useLivePrice } from '@/hooks/useLivePrice';
import { usePrices } from '@/contexts/PriceContext';

const opportunitySchema = z.object({
  publicationId: z.coerce.number(),
  title: z.string().min(50, "Title must be at least 50 characters").max(80, "Title must be 80 characters or less"),
  requestType: z.string().min(1, "Request type is required"),
  mediaType: z.string().min(1, "Media type is required"),
  description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  tags: z.array(z.string()).min(1, "At least one industry tag is required"),
  industry: z.string().min(1, "Primary industry is required"),
  minimumBid: z.coerce.number().min(1, "Minimum bid must be at least $1"),
  deadline: z.string().min(1, "Deadline is required"),
});

// Schema specifically for editing (content only - no pricing/deadline changes to protect pricing engine)
const editOpportunitySchema = z.object({
  title: z.string().min(50, "Title must be at least 50 characters").max(80, "Title must be 80 characters or less"),
  description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  tags: z.array(z.string()).min(1, "At least one industry tag is required"),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;
type EditOpportunityFormValues = z.infer<typeof editOpportunitySchema>;

// Function to determine actual opportunity status based on deadline
const getOpportunityStatus = (opportunity: any) => {
  if (!opportunity.deadline) return opportunity.status || 'open';
  
  const now = new Date();
  const deadline = new Date(opportunity.deadline);
  
  // If deadline has passed, it should be closed regardless of stored status
  if (deadline < now) {
    return 'closed';
  }
  
  // If deadline hasn't passed, it should be open (unless manually closed)
  return opportunity.status === 'closed' ? 'closed' : 'open';
};

export default function OpportunitiesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedPublication, setSelectedPublication] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedRequestType, setSelectedRequestType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState("all");
  const [showPitches, setShowPitches] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<any | null>(null);
  const [location, setLocation] = useLocation();
  const [selectedPublicationTier, setSelectedPublicationTier] = useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<Record<number, boolean>>({});
  const [managingOpportunity, setManagingOpportunity] = useState<any | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState<number | null>(null);
  
  // Initialize live price updates for admin
  const { connectionStatus, joinAdminRoom } = useLivePrice();
  const { getPrice } = usePrices();
  
  // Join admin room for real-time price updates
  useEffect(() => {
    joinAdminRoom();
  }, [joinAdminRoom]);
  
  // Helper function to get live price for an opportunity
  const getLivePrice = (opportunity: any) => {
    const livePrice = getPrice(opportunity.id);
    if (livePrice && livePrice.currentPrice) {
      // Log price updates for debugging
      console.log(`💰 Live price for OPP ${opportunity.id}: $${livePrice.currentPrice} (trend: ${livePrice.trend})`);
      return livePrice.currentPrice;
    }
    // Fallback to opportunity data if no live price available
    return opportunity.currentPrice || opportunity.current_price || opportunity.minimumBid;
  };
  
  // Helper function to get price trend/animation class
  const getPriceTrend = (opportunity: any) => {
    const livePrice = getPrice(opportunity.id);
    return livePrice?.trend || 'stable';
  };
  
  // Auto-open create modal if coming from quick actions
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create') === 'true') {
      setIsCreateDialogOpen(true);
      // Clean up URL without triggering navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      publicationId: 0,
      title: "",
      requestType: "",
      mediaType: "",
      description: "",
      tags: [],
      industry: "",
      minimumBid: 225, // Default to Tier 1 amount
      deadline: new Date().toISOString().split("T")[0],
    },
  });
  
  const editForm = useForm<EditOpportunityFormValues>({
    resolver: zodResolver(editOpportunitySchema),
    defaultValues: {
      title: "",
      description: "",
      tags: [],
    },
  });
  
  // Watch publication changes to automatically update minimum bid based on publication's tier
  const watchedPublicationId = form.watch("publicationId");
  
  const { data: publications, isLoading: loadingPublications } = useQuery<Publication[]>({
    queryKey: ["/api/admin/publications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/publications");
      return res.json();
    },
    // Disable caching and refetch frequently to show new publications immediately
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Filter publications by selected tier
  const filteredPublications = publications?.filter(pub => 
    !selectedPublicationTier || pub.tier === selectedPublicationTier
  ) || [];

  // Auto-update minimum bid based on selected publication's tier (only for create form)
  useEffect(() => {
    if (watchedPublicationId && publications && !isEditDialogOpen) {
      const selectedPublication = publications.find(pub => pub.id === watchedPublicationId);
      if (selectedPublication?.tier) {
        let bidAmount = 225; // Default Tier 1
        switch (selectedPublication.tier) {
          case "Tier 1":
            bidAmount = 225;
            break;
          case "Tier 2":
            bidAmount = 175;
            break;
          case "Tier 3":
            bidAmount = 125;
            break;
          default:
            bidAmount = 225;
        }
        form.setValue("minimumBid", bidAmount);
      }
    }
  }, [watchedPublicationId, publications, form, isEditDialogOpen]);
  
  // Also update minimum bid when tier is selected (before publication is chosen) - only for create form
  useEffect(() => {
    if (selectedPublicationTier && !isEditDialogOpen) {
      let bidAmount = 225; // Default Tier 1
      switch (selectedPublicationTier) {
        case "Tier 1":
          bidAmount = 225;
          break;
        case "Tier 2":
          bidAmount = 175;
          break;
        case "Tier 3":
          bidAmount = 125;
          break;
        default:
          bidAmount = 225;
      }
      form.setValue("minimumBid", bidAmount);
    }
  }, [selectedPublicationTier, form, isEditDialogOpen]);
  
  const { data: opportunities, isLoading: loadingOpportunities, error: opportunitiesError } = useQuery({
    queryKey: ["/api/admin/opportunities-with-pitches"],
    queryFn: async () => {
      console.log("Fetching opportunities with pitches...");
      const res = await apiRequest("GET", "/api/admin/opportunities-with-pitches");
      if (!res.ok) {
        console.error("Failed to fetch opportunities:", res.status, res.statusText);
        throw new Error(`Failed to fetch opportunities: ${res.status}`);
      }
      const data = await res.json();
      console.log("Opportunities data received:", data);
      return data;
    },
    retry: (failureCount, error) => {
      console.log("Query failed, attempt:", failureCount, "Error:", error);
      return failureCount < 2; // Try up to 2 times
    },
    retryDelay: 1000,
  });

  // Fallback query for basic opportunities without pitch data
  const { data: fallbackOpportunities, isLoading: loadingFallback } = useQuery({
    queryKey: ["/api/admin/opportunities"],
    queryFn: async () => {
      console.log("Fetching fallback opportunities...");
      const res = await apiRequest("GET", "/api/admin/opportunities");
      if (!res.ok) {
        throw new Error(`Failed to fetch fallback opportunities: ${res.status}`);
      }
      const data = await res.json();
      console.log("Fallback opportunities data received:", data);
      // Transform to match expected structure with empty pitch data
      return data.map((opp: any) => ({
        ...opp,
        pitches: [],
        pitchCount: 0,
        highestBid: 0
      }));
    },
    enabled: !!opportunitiesError, // Only run if main query failed
  });
  
  // Use fallback data if main query failed
  const finalOpportunities = opportunities || fallbackOpportunities;
  const finalLoading = loadingOpportunities || (opportunitiesError && loadingFallback);
  
  const createOpportunityMutation = useMutation({
    mutationFn: async (data: OpportunityFormValues) => {
      // CRITICAL FIX: Triple ensure publicationId is a number before sending
      if (typeof data.publicationId === 'string') {
        data.publicationId = Number(data.publicationId);
        console.log('MUTATION FIX: Converted string publicationId to number:', data.publicationId);
      }
      console.log('Submitting opportunity with data:', JSON.stringify(data));
      
      // Create the opportunity directly (no inline publication creation)
      const res = await apiRequest("POST", "/api/admin/opportunities", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities-with-pitches"]});
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities"]});
      queryClient.invalidateQueries({queryKey: ["/api/admin/publications"]});
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Opportunity created",
        description: "The opportunity has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create opportunity",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateOpportunityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log('Updating opportunity with data:', JSON.stringify(data, null, 2));
      
      const res = await apiRequest("PUT", `/api/admin/opportunities/${id}`, data);
      
      // Check if the response is OK
      if (!res.ok) {
        let errorText;
        try {
          const errorData = await res.json();
          errorText = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch {
          errorText = await res.text();
        }
        console.error('Update failed with status:', res.status, 'Error:', errorText);
        console.error('Data that failed:', JSON.stringify(data, null, 2));
        throw new Error(`Failed to update: ${errorText}` || `Update failed with status ${res.status}`);
      }
      
      const responseData = await res.json();
      console.log('Update successful, response:', responseData);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities-with-pitches"]});
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities"]});
      setIsEditDialogOpen(false);
      setEditingOpportunity(null);
      editForm.reset();
      toast({
        title: "Opportunity updated",
        description: "The opportunity has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Update mutation error:', error);
      toast({
        title: "Failed to update opportunity",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      console.log("Updating opportunity status:", { id, status });
      setUpdatingStatus(prev => ({ ...prev, [id]: true }));
      
      const res = await apiRequest(
        "PUT",
        `/api/admin/opportunities/${id}`,
        { status }
      );
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Failed to update status: ${res.status} - ${errorData}`);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      setUpdatingStatus(prev => ({ ...prev, [variables.id]: false }));
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities-with-pitches"]});
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities"]});
      toast({
        title: "Status updated",
        description: "The opportunity status has been updated successfully.",
      });
    },
    onError: (error: Error, variables) => {
      setUpdatingStatus(prev => ({ ...prev, [variables.id]: false }));
      console.error("Status update error:", error);
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Enhanced filtering with comprehensive search and multiple filter criteria
  const filteredOpportunities = finalOpportunities
    ? finalOpportunities.filter((opp: any) => {
        // Enhanced search - searches through multiple fields
        const matchesSearch = filter === '' || 
          opp.title.toLowerCase().includes(filter.toLowerCase()) ||
          opp.description?.toLowerCase().includes(filter.toLowerCase()) ||
          opp.publication?.name.toLowerCase().includes(filter.toLowerCase()) ||
          opp.industry?.toLowerCase().includes(filter.toLowerCase()) ||
          opp.tier?.toLowerCase().includes(filter.toLowerCase()) ||
          opp.requestType?.toLowerCase().includes(filter.toLowerCase()) ||
          opp.mediaType?.toLowerCase().includes(filter.toLowerCase()) ||
          opp.tags?.some((tag: string) => tag.toLowerCase().includes(filter.toLowerCase()));
        
        // Status filter - use calculated status
        const actualStatus = getOpportunityStatus(opp);
        const matchesStatus = selectedStatus === 'all' || actualStatus === selectedStatus;
        
        // Tier filter
        const matchesTier = selectedTier === 'all' || opp.tier === selectedTier;
        
        // Publication filter - FIX: Compare publication ID with selected publication ID
        const matchesPublication = selectedPublication === 'all' || 
          opp.publication?.id?.toString() === selectedPublication;
        
        // Industry filter
        const matchesIndustry = selectedIndustry === 'all' || opp.industry === selectedIndustry;
        
        // Request Type filter
        const matchesRequestType = selectedRequestType === 'all' || opp.requestType === selectedRequestType;
        
        // Tab filter (keeping the existing tab functionality) - use calculated status
        const matchesTab =
          activeTab === "all" ||
          (activeTab === "open" && actualStatus === "open") ||
          (activeTab === "closed" && actualStatus === "closed");
        
        return matchesSearch && matchesStatus && matchesTier && matchesPublication && 
               matchesIndustry && matchesRequestType && matchesTab;
      })
    : [];
  
  const onSubmit = (data: OpportunityFormValues) => {
    // CRITICAL FIX: Ensure publicationId is a number before submission
    if (typeof data.publicationId === 'string') {
      data.publicationId = Number(data.publicationId);
      console.log("Pre-submission fix: Converted publicationId to number:", data.publicationId);
    }

    // Get the tier from the selected publication
    const selectedPublication = publications?.find(pub => pub.id === data.publicationId);
    const tier = selectedPublication?.tier || "Tier 1"; // Default to Tier 1 if not found

    // Add tier to the submission data
    const submissionData = {
      ...data,
      tier
    };

    console.log("Submitting opportunity with automatic tier:", submissionData);
    createOpportunityMutation.mutate(submissionData);
  };
  
  const onTagSelect = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(tag)) {
      form.setValue("tags", [...currentTags, tag]);
    }
  };
  
  const removeTag = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter((t) => t !== tag));
  };
  
  const onEditSubmit = (data: EditOpportunityFormValues) => {
    console.log("onEditSubmit called with data:", data);
    console.log("editingOpportunity:", editingOpportunity);
    
    if (!editingOpportunity) {
      console.error("No editing opportunity found!");
      return;
    }
    
    // Ensure deadline is in correct format (YYYY-MM-DD)
    let formattedDeadline = editingOpportunity.deadline;
    if (formattedDeadline) {
      const deadlineDate = new Date(formattedDeadline);
      formattedDeadline = deadlineDate.toISOString().split('T')[0];
    }
    
    // ONLY send the fields that are actually being edited
    const submissionData = {
      title: data.title.trim(),
      description: data.description.trim(),
      tags: Array.isArray(data.tags) ? data.tags : [],
    };

    console.log("Updating opportunity with preserved data:", JSON.stringify(submissionData, null, 2));
    updateOpportunityMutation.mutate({ id: editingOpportunity.id, data: submissionData });
  };

  const handleEditOpportunity = (opportunity: any) => {
    console.log("Setting up edit for opportunity:", opportunity);
    setEditingOpportunity(opportunity);
    
    // Pre-populate the edit form with only the editable fields
    editForm.reset({
      title: opportunity.title || "",
      description: opportunity.description || "",
      tags: Array.isArray(opportunity.tags) ? opportunity.tags : [],
    });
    
    setIsEditDialogOpen(true);
  };

  const onEditTagSelect = (tag: string) => {
    const currentTags = editForm.getValues("tags") || [];
    if (!currentTags.includes(tag)) {
      editForm.setValue("tags", [...currentTags, tag]);
    }
  };
  
  const removeEditTag = (tag: string) => {
    const currentTags = editForm.getValues("tags") || [];
    editForm.setValue("tags", currentTags.filter((t) => t !== tag));
  };
  
  // Get optimized logo URL for retina displays
  const getOptimizedLogoUrl = (originalUrl: string, outletName: string) => {
    // Yahoo Finance specific handling
    if (outletName.toLowerCase().includes('yahoo finance')) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"%3E%3Crect width="200" height="80" fill="%23fff"/%3E%3Ctext x="100" y="40" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="24" fill="%23410093"%3EYahoo%3C/text%3E%3Ctext x="100" y="60" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="16" fill="%236001D2"%3EFinance%3C/text%3E%3C/svg%3E';
    }
    
    // Bloomberg specific handling
    if (outletName.toLowerCase().includes('bloomberg')) {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"%3E%3Crect width="200" height="80" fill="%23000"/%3E%3Ctext x="100" y="50" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="20" fill="%23fff"%3EBloomberg%3C/text%3E%3C/svg%3E';
    }
    
    // For other URLs, try to use them as-is
    return originalUrl;
  };
  
  return (
    <div className="space-y-6">
      {/* Header Section with Gradient Background */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h2 className="text-3xl font-bold text-white flex items-center">
                <Newspaper className="h-8 w-8 mr-3 text-slate-300" />
                Opportunity Manager
              </h2>
              {/* Live Price Connection Indicator */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
                connectionStatus.connected 
                  ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                  : 'bg-red-500/20 text-red-300 border border-red-400/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus.connected 
                    ? 'bg-green-400 animate-pulse' 
                    : 'bg-red-400'
                }`}></div>
                                 <span>
                   {connectionStatus.connected ? 'Live Pricing' : 'Disconnected'}
                 </span>
               </div>
             </div>
             <p className="text-slate-300 text-lg">
               Create and manage PR opportunities with real-time pricing updates
               {connectionStatus.lastUpdate && (
                 <span className="block text-sm text-slate-400 mt-1">
                   Last update: {new Date(connectionStatus.lastUpdate).toLocaleTimeString()}
                 </span>
               )}
             </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Opportunity
            </Button>
          </div>
        </div>
      </div>
      
      {/* Enhanced Search and Filter Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2 text-slate-300" />
          Search & Filter Opportunities
        </h3>
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input
              placeholder="Search by title, description, publication, industry, tier, or tags..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-12 h-12 text-base border border-white/20 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none rounded-lg bg-slate-700/50 text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10 bg-slate-700/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border border-white/20 text-white">
                <SelectItem value="all" className="focus:bg-slate-700 focus:text-white">All Statuses</SelectItem>
                <SelectItem value="open" className="focus:bg-slate-700 focus:text-white">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Open
                  </div>
                </SelectItem>
                <SelectItem value="closed" className="focus:bg-slate-700 focus:text-white">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                    Closed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tier Filter */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Tier</label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="h-10 bg-slate-700/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border border-white/20 text-white">
                <SelectItem value="all" className="focus:bg-slate-700 focus:text-white">All Tiers</SelectItem>
                {OPPORTUNITY_TIERS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value} className="focus:bg-slate-700 focus:text-white">
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Publication Filter */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Publication</label>
            <Select value={selectedPublication} onValueChange={setSelectedPublication}>
              <SelectTrigger className="h-10 bg-slate-700/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                <SelectValue placeholder="All Publications" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border border-white/20 text-white">
                <SelectItem value="all" className="focus:bg-slate-700 focus:text-white">All Publications</SelectItem>
                {publications && publications.length > 0 && (
                  <>
                    <div className="border-t border-white/20 my-2"></div>
                    <div className="px-2 py-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Available Publications</p>
                    </div>
                    {publications.map((pub: any) => (
                      <SelectItem key={pub.id} value={pub.id.toString()} className="focus:bg-slate-700 focus:text-white">
                        <div className="flex items-center py-1">
                          <Building2 className="mr-3 h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium">{pub.name}</p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Industry Filter */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Industry</label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="h-10 bg-slate-700/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border border-white/20 text-white">
                <SelectItem value="all" className="focus:bg-slate-700 focus:text-white">All Industries</SelectItem>
                {INDUSTRY_OPTIONS.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value} className="focus:bg-slate-700 focus:text-white">
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Request Type Filter */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Request Type</label>
            <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
              <SelectTrigger className="h-10 bg-slate-700/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border border-white/20 text-white">
                <SelectItem value="all" className="focus:bg-slate-700 focus:text-white">All Types</SelectItem>
                {REQUEST_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="focus:bg-slate-700 focus:text-white">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilter('');
                setSelectedStatus('all');
                setSelectedTier('all');
                setSelectedPublication('all');
                setSelectedIndustry('all');
                setSelectedRequestType('all');
              }}
              className="h-10 w-full bg-slate-800/50 border border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-slate-300 hover:text-amber-400 font-medium transition-all duration-200"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-slate-800/50 p-1 rounded-lg border border-white/10">
          <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-300 rounded-md px-6">
            All Opportunities
          </TabsTrigger>
          <TabsTrigger value="open" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-300 rounded-md px-6">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Open
            </div>
          </TabsTrigger>
          <TabsTrigger value="closed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-300 rounded-md px-6">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
              Closed
            </div>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {finalLoading ? (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
            </div>
            <p className="text-slate-300 font-medium">Loading opportunities...</p>
          </div>
        </div>
      ) : opportunitiesError ? (
        <Card className="bg-red-500/10 border border-red-400/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <X className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-xl font-bold text-white mb-2">Failed to Load Opportunities</p>
            <p className="text-slate-300 mb-6 text-center max-w-md">
              {opportunitiesError.message || "We couldn't fetch the opportunities. Please try again."}
            </p>
            <Button 
              onClick={() => {
                queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities-with-pitches"]});
                queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities"]});
              }}
              variant="outline"
              className="border border-red-400/50 text-red-400 hover:bg-red-500/20"
            >
              <Loader2 className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredOpportunities?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredOpportunities.map((opportunity: any) => (
            <Card key={opportunity.id} className="group relative bg-slate-900/80 backdrop-blur-sm border-2 border-white/20 hover:border-amber-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col overflow-hidden hover:scale-[1.02]">
              {/* Status indicator */}
              <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                getOpportunityStatus(opportunity) === 'open' 
                  ? 'bg-green-400 shadow-green-400/50 shadow-lg' 
                  : 'bg-gray-400 shadow-gray-400/50 shadow-lg'
              }`}>
              </div>
              
              <CardHeader className="pb-6 pt-6">
                {/* Publication Header */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-xl border border-amber-400/30 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">
                      {opportunity.publication.name}
                    </h4>
                    <p className="text-sm text-amber-400 font-medium">
                      {opportunity.tier || 'Tier 1'}
                    </p>
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-white leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors duration-300">
                  {opportunity.title}
                </h3>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col px-6 pb-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Price */}
                  <div className={`bg-gradient-to-br rounded-xl p-4 border transition-all duration-300 ${
                    getPriceTrend(opportunity) === 'up' 
                      ? 'from-green-500/20 to-emerald-600/20 border-green-400/40 shadow-green-500/20 shadow-lg'
                      : getPriceTrend(opportunity) === 'down'
                      ? 'from-red-500/20 to-red-600/20 border-red-400/40 shadow-red-500/20 shadow-lg'
                      : 'from-green-500/10 to-emerald-600/10 border-green-400/20'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-2xl font-bold transition-colors duration-300 ${
                        getPriceTrend(opportunity) === 'up' ? 'text-green-300' :
                        getPriceTrend(opportunity) === 'down' ? 'text-red-300' :
                        'text-white'
                      }`}>
                        ${getLivePrice(opportunity)}
                      </span>
                      {getPriceTrend(opportunity) !== 'stable' && (
                        <div className={`flex items-center ${
                          getPriceTrend(opportunity) === 'up' ? 'text-green-200' : 'text-red-200'
                        }`}>
                          {getPriceTrend(opportunity) === 'up' ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${
                      getPriceTrend(opportunity) === 'up' ? 'text-green-200' :
                      getPriceTrend(opportunity) === 'down' ? 'text-red-200' :
                      'text-green-300'
                    }`}>
                      Current Price
                    </p>
                  </div>
                  
                  {/* Deadline */}
                  <div className={`rounded-xl p-4 border ${
                    new Date(opportunity.deadline) < new Date() 
                      ? 'bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-400/30' 
                      : 'bg-gradient-to-br from-slate-500/10 to-slate-600/10 border-slate-400/20'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className={`h-5 w-5 ${
                        new Date(opportunity.deadline) < new Date() 
                          ? 'text-red-400' 
                          : 'text-slate-300'
                      }`} />
                      <span className={`text-2xl font-bold ${
                        new Date(opportunity.deadline) < new Date() 
                          ? 'text-red-400' 
                          : 'text-white'
                      }`}>
                        {new Date(opportunity.deadline).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${
                      new Date(opportunity.deadline) < new Date() 
                        ? 'text-red-300' 
                        : 'text-slate-300'
                    }`}>
                      {new Date(opportunity.deadline) < new Date() ? 'EXPIRED' : 'Deadline'}
                    </p>
                  </div>
                </div>
                
                {/* Pitch Count */}
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-4 border border-blue-400/20 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">
                          {opportunity.pitchCount || 0}
                        </p>
                        <p className="text-sm text-blue-300 font-medium">Pitches Received</p>
                      </div>
                    </div>
                    {opportunity.highestBid > 0 && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          ${opportunity.highestBid}
                        </p>
                        <p className="text-sm text-slate-300">
                          Highest
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Spacer */}
                <div className="flex-1"></div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowPitches(opportunity.id);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setManagingOpportunity(opportunity);
                        setIsManageModalOpen(true);
                      }}
                      className="bg-slate-800/80 border-2 border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 font-semibold transition-all duration-200"
                    >
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-800/50 border border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
              <Newspaper className="h-10 w-10 text-slate-300" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">No Opportunities Yet</p>
            <p className="text-slate-300 mb-6 text-center max-w-md">
              Start creating PR opportunities to connect journalists with experts and grow your platform.
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Opportunity
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* View Pitches Modal - Dark Theme */}
      {showPitches && (
        <Dialog 
          open={!!showPitches} 
          onOpenChange={(open) => {
            if (!open) {
              setShowPitches(null);
              // Ensure clean focus restoration
              setTimeout(() => {
                document.body.focus();
              }, 100);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-slate-900 border border-white/20 text-white shadow-2xl">
            <DialogHeader className="pb-4 border-b border-white/10">
              <DialogTitle className="flex items-center text-xl font-bold text-white">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                Pitches: {finalOpportunities?.find((o: any) => o.id === showPitches)?.title}
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-base mt-2">
                {(() => {
                  const opportunity = finalOpportunities?.find((o: any) => o.id === showPitches);
                  const pitchCount = opportunity?.pitches?.length || 0;
                  const highestBid = opportunity?.highestBid || 0;
                  
                  return (
                    <div className="flex items-center gap-4 mt-3">
                      <span className="flex items-center bg-gradient-to-r from-slate-700/50 to-slate-800/50 px-3 py-2 rounded-lg border border-white/10">
                        <span className="font-bold text-blue-400 text-lg">{pitchCount}</span>
                        <span className="ml-2 text-slate-300 font-medium">
                          {pitchCount === 1 ? 'pitch' : 'pitches'}
                        </span>
                      </span>
                      {highestBid > 0 && (
                        <span className="flex items-center bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-3 py-2 rounded-lg border border-green-400/20">
                          <span className="text-green-300 font-bold text-lg">Top: ${highestBid}</span>
                        </span>
                      )}
                      <span className="text-amber-400 font-semibold px-3 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-400/20">
                        {opportunity?.publication?.name}
                      </span>
                    </div>
                  );
                })()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto py-4">
              {(() => {
                const opportunity = finalOpportunities?.find((o: any) => o.id === showPitches);
                const pitches = opportunity?.pitches || [];
                
                if (pitches.length > 0) {
                  return (
                    <div className="space-y-4">
                      {pitches
                        .sort((a: any, b: any) => {
                          // Sort by status priority (successful > sent > pending) then by bid amount (highest first)
                          const statusPriority = { 'successful': 3, 'sent': 2, 'pending': 1 };
                          const aStatus = statusPriority[a.status as keyof typeof statusPriority] || 0;
                          const bStatus = statusPriority[b.status as keyof typeof statusPriority] || 0;
                          
                          if (aStatus !== bStatus) return bStatus - aStatus;
                          
                          const aBid = a.bidAmount || 0;
                          const bBid = b.bidAmount || 0;
                          return bBid - aBid;
                        })
                        .map((pitch: any, index: number) => (
                        <Card 
                          key={pitch.id} 
                          className={`hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 bg-slate-800/50 backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-slate-800/70 ${
                            pitch.status === 'successful' ? 'border-l-green-400 hover:shadow-green-500/20' :
                            pitch.status === 'sent' ? 'border-l-blue-400 hover:shadow-blue-500/20' :
                            pitch.status === 'pending' ? 'border-l-yellow-400 hover:shadow-yellow-500/20' :
                            'border-l-gray-400 hover:shadow-gray-500/20'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const pitchIdToOpen = pitch.id;
                            setShowPitches(null);
                            // Navigate after cleaning up modal state
                            setTimeout(() => {
                              setLocation(`/admin/pitches?openDetails=${pitchIdToOpen}`);
                            }, 100);
                          }}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start space-x-4 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  {pitch.user?.avatar ? (
                                    <img 
                                      src={pitch.user.avatar} 
                                      alt={pitch.user.fullName}
                                      className="w-14 h-14 rounded-full object-cover border-2 border-white/20 shadow-lg"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border-2 border-white/20 shadow-lg">
                                      <User className="w-7 h-7 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-4">
                                    <div>
                                      <h4 className="text-xl font-bold text-white leading-tight">
                                        {pitch.user?.fullName || 'Unknown User'}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-sm text-slate-300 font-medium">
                                          {pitch.user?.title || 'Expert'}
                                          {pitch.user?.company_name && (
                                            <span className="text-slate-400"> • {pitch.user.company_name}</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                      {pitch.bidAmount && (
                                        <div className="text-right bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-4 py-2 rounded-lg border border-green-400/20">
                                          <p className="text-xs text-green-300 uppercase tracking-wide font-semibold">Bid Amount</p>
                                          <span className="text-2xl font-bold text-green-300">
                                            ${pitch.bidAmount}
                                          </span>
                                        </div>
                                      )}
                                      <Badge 
                                        className={`px-4 py-2 text-sm font-bold ${
                                          pitch.status === 'pending' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-400/30' :
                                          pitch.status === 'sent' ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-400/30' :
                                          pitch.status === 'successful' ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-400/30' :
                                          'bg-gradient-to-r from-slate-500/20 to-gray-500/20 text-slate-300 border-gray-400/30'
                                        }`}
                                        variant="outline"
                                      >
                                        {pitch.status === 'successful' ? '✓ Successful' : 
                                         pitch.status === 'sent' ? '→ Sent' :
                                         pitch.status === 'pending' ? '⏳ Pending' :
                                         pitch.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  {pitch.content && (
                                    <div className="bg-slate-700/50 rounded-lg p-4 border border-white/10 mb-4">
                                      <p className="text-sm text-slate-200 line-clamp-4 leading-relaxed">
                                        {pitch.content}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-6">
                                      {pitch.createdAt && (
                                        <span className="flex items-center text-slate-400">
                                          <Calendar className="w-4 h-4 mr-2" />
                                          <span className="font-medium">
                                            Submitted {new Date(pitch.createdAt).toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        </span>
                                      )}
                                      <span className="text-slate-500 font-medium">ID: {pitch.id}</span>
                                    </div>
                                    
                                    <div className="flex items-center text-blue-400 hover:text-blue-300 transition-colors font-medium">
                                      <span className="text-sm">View Details</span>
                                      <Eye className="w-4 h-4 ml-2" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      <div className="mt-6 p-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg border border-blue-400/20">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-blue-400/30">
                              <MessageSquare className="w-5 h-5 text-blue-400" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-blue-300 mb-2 flex items-center">
                              💡 Managing Pitches
                            </h4>
                            <p className="text-sm text-blue-200 leading-relaxed">
                              Click on any pitch card to view full details, update status, or manage the pitch in the dedicated pitches manager. 
                              Successful pitches will automatically create billing entries for payment processing.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center py-16">
                      <div className="max-w-md mx-auto">
                        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                          <MessageSquare className="h-12 w-12 text-slate-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">No Pitches Yet</h3>
                        <p className="text-slate-300 leading-relaxed mb-8 text-base">
                          No pitches have been submitted for this opportunity yet. Once experts start bidding, 
                          their pitches will appear here for you to review and manage.
                        </p>
                        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/30 rounded-lg p-6">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <div className="text-yellow-400 font-bold">💡</div>
                            </div>
                            <div className="text-left">
                              <h4 className="text-sm font-semibold text-yellow-400 mb-1">Pro Tip</h4>
                              <p className="text-sm text-yellow-200 leading-relaxed">
                                You can promote this opportunity to attract more expert submissions, 
                                or adjust the minimum bid if needed.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
            
            <DialogFooter className="pt-4 border-t border-white/10 bg-slate-800/50">
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPitches(null);
                  // Ensure clean focus restoration
                  setTimeout(() => {
                    document.body.focus();
                  }, 100);
                }}
                variant="outline"
                className="mr-3 bg-slate-700/50 border-2 border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 font-semibold"
              >
                Close
              </Button>
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const pitchId = showPitches;
                  setShowPitches(null);
                  // Navigate after cleaning up modal state
                  setTimeout(() => {
                    setLocation(`/admin/pitches?opportunity=${pitchId}`);
                  }, 100);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg font-semibold"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Open in Pitches Manager
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Create Opportunity Dialog - Dark Theme */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 bg-slate-900 border border-white/20 text-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-sm border-b border-white/10 p-8 z-10">
            <DialogTitle className="text-3xl font-bold text-white flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mr-4">
                <Plus className="h-6 w-6 text-white" />
              </div>
              Create New PR Opportunity
            </DialogTitle>
            <DialogDescription className="text-slate-300 mt-3 text-lg font-medium">
              Fill out the form below to create a new opportunity for experts to bid on.
            </DialogDescription>
          </div>
          
          {/* Scrollable Content */}
          <div className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Publication */}
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold text-white mb-4">Publication & Outlet Selection</h3>
                    <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
                      Choose the tier first to filter publications, then select your target outlet
                    </p>
                  </div>
                  
                  {/* Tier Selection Cards */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          tier: "Tier 1",
                          title: "Premium Outlets",
                          price: "$225",
                          description: "Top-tier publications like Yahoo Finance, Forbes",
                          color: "emerald",
                          examples: ["Yahoo Finance", "Forbes", "TechCrunch"]
                        },
                        {
                          tier: "Tier 2", 
                          title: "Standard Outlets",
                          price: "$175",
                          description: "Established publications with strong readership",
                          color: "blue",
                          examples: ["Industry Today", "Business Weekly", "Tech News"]
                        },
                        {
                          tier: "Tier 3",
                          title: "Emerging Outlets", 
                          price: "$125",
                          description: "Growing publications with targeted audiences",
                          color: "orange",
                          examples: ["Startup Daily", "Niche News", "Local Business"]
                        }
                      ].map((tierOption) => (
                        <div
                          key={tierOption.tier}
                          onClick={() => {
                            setSelectedPublicationTier(tierOption.tier);
                            form.setValue("publicationId", 0);
                          }}
                          className={`relative cursor-pointer rounded-xl p-6 border-2 transition-all duration-200 hover:shadow-xl transform hover:scale-105 ${
                            selectedPublicationTier === tierOption.tier
                              ? tierOption.color === 'emerald' 
                                ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/20 to-green-600/20 shadow-lg shadow-emerald-500/20 backdrop-blur-sm'
                                : tierOption.color === 'blue'
                                ? 'border-blue-400 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 shadow-lg shadow-blue-500/20 backdrop-blur-sm'
                                : 'border-orange-400 bg-gradient-to-br from-orange-500/20 to-yellow-600/20 shadow-lg shadow-orange-500/20 backdrop-blur-sm'
                              : 'border-white/20 bg-gradient-to-br from-slate-800/50 to-slate-700/50 hover:border-white/30 hover:from-slate-700/60 hover:to-slate-600/60 backdrop-blur-sm'
                          }`}
                        >
                          {/* Selection indicator */}
                          {selectedPublicationTier === tierOption.tier && (
                            <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                              tierOption.color === 'emerald' ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                              tierOption.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                              'bg-gradient-to-r from-orange-500 to-yellow-500'
                            }`}>
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Tier badge */}
                          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold mb-4 shadow-sm ${
                            tierOption.color === 'emerald' ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-400/30' :
                            tierOption.color === 'blue' ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-400/30' :
                            'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 text-orange-300 border border-orange-400/30'
                          }`}>
                            {tierOption.tier}
                          </div>
                          
                          {/* Content */}
                          <div className="space-y-4">
                            <div>
                              <h5 className="text-lg font-semibold text-white mb-2">{tierOption.title}</h5>
                              <p className="text-slate-300 text-sm leading-relaxed">{tierOption.description}</p>
                            </div>
                            
                            {/* Price */}
                            <div className="flex items-center justify-between">
                              <span className={`text-3xl font-bold ${
                                tierOption.color === 'emerald' ? 'text-emerald-300' :
                                tierOption.color === 'blue' ? 'text-blue-300' :
                                'text-orange-300'
                              }`}>{tierOption.price}</span>
                              <span className={`text-sm font-medium ${
                                tierOption.color === 'emerald' ? 'text-emerald-400' :
                                tierOption.color === 'blue' ? 'text-blue-400' :
                                'text-orange-400'
                              }`}>min bid</span>
                            </div>
                            
                            {/* Examples */}
                            <div className={`pt-3 border-t ${
                              tierOption.color === 'emerald' ? 'border-emerald-400/30' :
                              tierOption.color === 'blue' ? 'border-blue-400/30' :
                              'border-orange-400/30'
                            }`}>
                              <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                                tierOption.color === 'emerald' ? 'text-emerald-400' :
                                tierOption.color === 'blue' ? 'text-blue-400' :
                                'text-orange-400'
                              }`}>Examples</p>
                              <div className="flex flex-wrap gap-1">
                                {tierOption.examples.map((example) => (
                                  <span key={example} className={`text-xs px-2 py-1 rounded-md font-medium ${
                                    tierOption.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/20' :
                                    tierOption.color === 'blue' ? 'bg-blue-500/10 text-blue-300 border border-blue-400/20' :
                                    'bg-orange-500/10 text-orange-300 border border-orange-400/20'
                                  }`}>
                                    {example}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Publication Selection */}
                  {selectedPublicationTier && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-white/10">
                      <div className="text-center mb-8">
                        <h4 className="text-xl font-semibold text-white mb-2">
                          Step 2: Choose Your {selectedPublicationTier} Publication
                        </h4>
                        <p className="text-slate-300">
                          Select from available {selectedPublicationTier} publications or add a new one
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="publicationId"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <Select
                              value={field.value && field.value !== 0 ? String(field.value) : ""}
                              onValueChange={(value) => {
                                if (value === "new") {
                                  window.open('/admin/publications?create=true', '_blank');
                                } else if (value) {
                                  field.onChange(Number(value));
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="h-16 text-base bg-slate-700/50 border border-white/20 hover:border-amber-400/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:ring-offset-0 focus:outline-none text-white transition-colors rounded-lg">
                                  <SelectValue placeholder={`Choose a ${selectedPublicationTier} publication...`} />
                                  <style dangerouslySetInnerHTML={{
                                    __html: `
                                      .h-16 svg {
                                        display: none !important;
                                      }
                                    `
                                  }} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-w-2xl bg-slate-800 border border-white/20 text-white shadow-lg">
                                {/* Create New Publication Option */}
                                <SelectItem value="new" className="p-4 hover:bg-slate-700 focus:bg-slate-700 focus:text-white">
                                  Create New Publication (Opens in new tab)
                                </SelectItem>
                                
                                {/* Existing Publications */}
                                {filteredPublications.length > 0 && (
                                  <>
                                    <div className="border-t border-white/20 my-3"></div>
                                    <div className="px-4 py-3 bg-slate-700/50 rounded-lg mx-2 mb-3">
                                      <p className="text-sm font-semibold text-slate-300 flex items-center">
                                        <Building2 className="h-4 w-4 mr-2" />
                                        {selectedPublicationTier} Publications ({filteredPublications.length})
                                      </p>
                                    </div>
                                    {filteredPublications.map((pub: any) => (
                                      <SelectItem key={pub.id} value={pub.id.toString()} className="p-4 hover:bg-slate-700 focus:bg-slate-700 focus:text-white">
                                        {pub.name}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                
                                {/* No Publications Available */}
                                {filteredPublications.length === 0 && selectedPublicationTier && (
                                  <div className="px-6 py-12 text-center bg-slate-800">
                                    <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <Building2 className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h5 className="text-lg font-medium text-white mb-2">
                                      No {selectedPublicationTier} publications available
                                    </h5>
                                    <p className="text-slate-300 mb-4">
                                      Click "Create New Publication" to add your first {selectedPublicationTier} outlet
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => window.open('/admin/publications?create=true', '_blank')}
                                      className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add First {selectedPublicationTier} Publication
                                    </button>
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Instruction when no tier selected */}
                  {!selectedPublicationTier && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                        <Building2 className="h-10 w-10 text-slate-400" />
                      </div>
                      <h4 className="text-xl font-semibold text-white mb-3">Select a Publication Tier Above</h4>
                      <p className="text-slate-300 leading-relaxed max-w-md mx-auto">
                        Choose Tier 1, 2, or 3 to see available publications for that tier level. This helps organize your growing library of outlets.
                      </p>
                    </div>
                  )}
                </div>

                {/* Basic Details */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white border-b border-white/20 pb-3">Opportunity Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-white">Opportunity Title *</FormLabel>
                        <FormDescription className="text-sm text-slate-400">
                          Create a descriptive title between 50-80 characters for consistent card display
                        </FormDescription>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="e.g., Expert Commentary on AI Market Trends for TechCrunch Article"
                              className="text-base h-12 pr-16 bg-slate-800/50 border border-white/20 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400"
                              maxLength={80}
                              minLength={50}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium z-10">
                              <span className={`px-2 py-1 rounded-md ${
                                field.value?.length < 50 
                                  ? "bg-red-500/20 text-red-300 border border-red-400/30"
                                  : field.value?.length > 70 
                                  ? "bg-orange-500/20 text-orange-300 border border-orange-400/30" 
                                  : "bg-green-500/20 text-green-300 border border-green-400/30"
                              }`}>
                                {field.value?.length || 0}/80
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-white">Detailed Description *</FormLabel>
                        <FormDescription className="text-sm text-slate-400">
                          Provide a concise summary of the story and expertise needed (500 chars max)
                        </FormDescription>
                        <FormControl>
                          <div className="relative">
                            <Textarea 
                              {...field} 
                              placeholder="Briefly describe the story context, angle, and type of expert commentary you need..."
                              rows={5}
                              className="resize-none text-base pr-16 bg-slate-800/50 border border-white/20 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400"
                              maxLength={500}
                            />
                            <div className="absolute right-3 bottom-3 text-sm font-medium z-10">
                              <span className={`px-2 py-1 rounded-md ${
                                field.value?.length > 480 
                                  ? "bg-orange-500/20 text-orange-300 border border-orange-400/30" 
                                  : "bg-slate-600/50 text-slate-300 border border-slate-500/30"
                              }`}>
                                {field.value?.length || 0}/500
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="requestType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium text-white">Request Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 bg-slate-800/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                                <SelectValue placeholder="Select request type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-800 border border-white/20 text-white">
                              {REQUEST_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value} className="focus:bg-slate-700 focus:text-white">
                                  <div className="py-1">
                                    <p className="font-medium">{type.label}</p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mediaType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium text-white">Media Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 bg-slate-800/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                                <SelectValue placeholder="Select media type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-800 border border-white/20 text-white">
                              {MEDIA_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value} className="focus:bg-slate-700 focus:text-white">
                                  <div className="py-1">
                                    <p className="font-medium">{type.label}</p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Targeting */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white border-b border-white/20 pb-3">Expert Targeting</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium text-white">Primary Industry *</FormLabel>
                          <FormDescription className="text-sm text-slate-400">
                            Main industry focus for this opportunity
                          </FormDescription>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 bg-slate-800/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                                <SelectValue placeholder="Select primary industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-800 border border-white/20 text-white">
                              {INDUSTRY_OPTIONS.map((industry) => (
                                <SelectItem key={industry.value} value={industry.value} className="focus:bg-slate-700 focus:text-white">
                                  <div className="py-1">
                                    <p className="font-medium">{industry.label}</p>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium text-white">Industry Tags *</FormLabel>
                          <FormDescription className="text-sm text-slate-400">
                            Add relevant industry tags to help experts find this opportunity
                          </FormDescription>
                          <div className="space-y-4">
                            {/* Add Tags */}
                            <div>
                              <Select onValueChange={(value) => onTagSelect(value)}>
                                <SelectTrigger className="h-auto min-h-12 p-3 bg-slate-800/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                                  {field.value?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 w-full">
                                      {field.value.map((tag: string) => (
                                        <span 
                                          key={tag} 
                                          className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-400/30 rounded-md text-sm font-medium"
                                        >
                                          {tag}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeTag(tag);
                                            }}
                                            className="ml-2 hover:bg-amber-400/20 rounded-full p-1 transition-colors"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <SelectValue placeholder="Add industry tags..." />
                                  )}
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border border-white/20 text-white">
                                  {INDUSTRY_OPTIONS
                                    .filter((industry) => !field.value?.includes(industry.value))
                                    .map((industry) => (
                                      <SelectItem key={industry.value} value={industry.value} className="focus:bg-slate-700 focus:text-white">
                                        <div className="py-1">
                                          <p className="font-medium">{industry.label}</p>
                                        </div>
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Dynamic Pricing & Timeline */}
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className="text-3xl font-bold text-white mb-4">Dynamic Pricing & Timeline</h3>
                    <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
                      Automatic pricing based on publication tier and deadline selection
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Automatic Minimum Bid Display */}
                    <div className="space-y-6 flex flex-col">
                      <div className="text-center lg:text-left">
                        <h4 className="text-xl font-semibold text-white mb-2">Minimum Bid (Auto-Set)</h4>
                        <p className="text-slate-300 leading-relaxed">
                          Automatically determined by your selected publication's tier
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 rounded-xl p-8 border border-green-400/20 flex-1 shadow-lg backdrop-blur-sm">
                        <div className="text-center space-y-4 h-full flex flex-col justify-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                            <DollarSign className="h-8 w-8 text-white" />
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-green-300 uppercase tracking-wide">Minimum Bid Amount</p>
                            <div className="text-4xl font-bold text-green-300">
                              ${form.watch("minimumBid") || 225}
                            </div>
                          </div>
                          
                          {/* Status indicators */}
                          <div className="space-y-3 pt-4 border-t border-green-400/20">
                            {!watchedPublicationId ? (
                              <div className="flex items-center justify-center text-green-400">
                                <Clock className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">Select a publication above</span>
                              </div>
                            ) : (
                              watchedPublicationId && publications && (() => {
                                const selectedPub = publications.find(pub => pub.id === watchedPublicationId);
                                return selectedPub?.tier && (
                                  <div className="flex items-center justify-center text-green-300">
                                    <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium">
                                      {selectedPub.name} • {selectedPub.tier}
                                    </span>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        </div>
                        
                        {/* Hidden field to ensure minimumBid is submitted */}
                        <input type="hidden" {...form.register("minimumBid")} />
                      </div>
                    </div>

                    {/* Response Deadline */}
                    <div className="space-y-6 flex flex-col">
                      <div className="text-center lg:text-left">
                        <h4 className="text-xl font-semibold text-white mb-2">Response Deadline</h4>
                        <p className="text-slate-300 leading-relaxed">
                          Choose when you need expert responses by
                        </p>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-xl p-8 border border-blue-400/20 h-full shadow-lg backdrop-blur-sm">
                                <div className="text-center space-y-6 h-full flex flex-col justify-center">
                                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                    <CalendarIcon className="h-8 w-8 text-white" />
                                  </div>
                                  
                                  <div className="space-y-4">
                                    <p className="text-sm font-medium text-blue-300 uppercase tracking-wide">Deadline Date</p>
                                    
                                    <div className="space-y-3">
                                      <input
                                        type="date"
                                        value={field.value || ''}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        min={new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]}
                                        className="w-full h-14 px-4 text-lg font-medium text-center bg-slate-800/50 border border-white/20 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none transition-all shadow-sm text-white"
                                      />
                                      {field.value && (
                                        <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg p-3 text-center border border-blue-400/20 shadow-sm">
                                          <p className="text-sm text-blue-300 font-medium">
                                            {format(new Date(field.value), "EEEE, MMMM do, yyyy")}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gradient-to-r from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-sm border-t border-white/10 p-8 z-10">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  form.reset();
                }}
                className="flex-1 h-12 bg-slate-800/50 border-2 border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 font-semibold transition-all duration-200"
                disabled={createOpportunityMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={form.handleSubmit(onSubmit)}
                className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg font-semibold"
                disabled={createOpportunityMutation.isPending}
              >
                {createOpportunityMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Opportunity
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Opportunity Dialog - Dark Theme */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-slate-900 border border-white/20 text-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-b border-white/10 p-6 z-10">
            <DialogTitle className="text-2xl font-bold text-white flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                <Edit className="h-5 w-5 text-white" />
              </div>
              Edit Opportunity
            </DialogTitle>
            <DialogDescription className="text-slate-300 mt-2 text-base">
              Update the opportunity details below.
            </DialogDescription>
          </div>
          
          {/* Scrollable Content */}
          <div className="p-6">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                
                {/* Content Editing Only */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-white border-b border-white/20 pb-3 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                        <Edit className="h-4 w-4 text-white" />
                      </div>
                      Content Editing
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      You can only edit content-based fields to protect pricing and deadline variables.
                    </p>
                  </div>
                  
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-white">Opportunity Title *</FormLabel>
                        <FormDescription className="text-sm text-slate-400">
                          Update the title (50-80 characters for consistent card display)
                        </FormDescription>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="e.g., Looking For Capital Market Experts For A Story on eVTOL Stocks"
                              className="text-base h-12 pr-20 bg-slate-800/50 border border-white/20 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400"
                              maxLength={80}
                              minLength={50}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium z-10">
                              <span className={`px-2 py-1 rounded-md ${
                                field.value?.length < 50 
                                  ? "bg-red-500/20 text-red-300 border border-red-400/30"
                                  : field.value?.length > 70 
                                  ? "bg-orange-500/20 text-orange-300 border border-orange-400/30" 
                                  : "bg-green-500/20 text-green-300 border border-green-400/30"
                              }`}>
                                {field.value?.length || 0}/80
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-white">Description * (500 chars max)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Textarea 
                              {...field} 
                              placeholder="Stock Market Experts — The eVTOL sector is starting to heat up in the public equity market, questions needed are as followed:

1. Do you think that in the future the eVTOL industry will do well?"
                              rows={6}
                              className="resize-none text-base pr-20 bg-slate-800/50 border border-white/20 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400"
                              maxLength={500}
                            />
                            <div className="absolute right-3 bottom-3 text-sm font-medium z-10">
                              <span className={`px-2 py-1 rounded-md ${
                                field.value?.length > 480 
                                  ? "bg-orange-500/20 text-orange-300 border border-orange-400/30" 
                                  : "bg-slate-600/50 text-slate-300 border border-slate-500/30"
                              }`}>
                                {field.value?.length || 0}/500
                              </span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-white">Industry Tags *</FormLabel>
                        <FormDescription className="text-sm text-slate-400">
                          Add relevant industry tags to help experts find this opportunity
                        </FormDescription>
                        <div className="space-y-4">
                          <div>
                            <Select onValueChange={(value) => onEditTagSelect(value)}>
                              <SelectTrigger className="h-auto min-h-12 p-3 bg-slate-800/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none text-white">
                                {field.value?.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 w-full">
                                    {field.value.map((tag: string) => (
                                      <span 
                                        key={tag} 
                                        className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-400/30 rounded-md text-sm font-medium"
                                      >
                                        {tag}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeEditTag(tag);
                                          }}
                                          className="ml-2 hover:bg-amber-400/20 rounded-full p-1 transition-colors"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <SelectValue placeholder="Add industry tags..." />
                                )}
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border border-white/20 text-white">
                                {INDUSTRY_OPTIONS
                                  .filter((industry) => !field.value?.includes(industry.value))
                                  .map((industry) => (
                                    <SelectItem key={industry.value} value={industry.value} className="focus:bg-slate-700 focus:text-white">
                                      {industry.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Protected Fields Info */}
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/30 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="text-yellow-400 font-bold text-sm">🔒</div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-400 mb-2">Protected Fields</h4>
                      <p className="text-sm text-yellow-200 leading-relaxed">
                        Publication, deadline, pricing, request type, and media type cannot be edited to protect pricing engine variables.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-t border-white/10 p-6 z-10">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingOpportunity(null);
                  editForm.reset();
                }}
                className="flex-1 h-12 bg-slate-800/50 border-2 border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 font-semibold transition-all duration-200"
                disabled={updateOpportunityMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={editForm.handleSubmit(onEditSubmit)}
                className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg font-semibold"
                disabled={updateOpportunityMutation.isPending}
              >
                {updateOpportunityMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Update Opportunity
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Manage Opportunity Modal - Compact & Optimized */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-3xl bg-slate-900 border border-white/20 text-white shadow-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center text-white">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                <MoreHorizontal className="h-5 w-5 text-white" />
              </div>
              Manage Opportunity
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-base mt-1">
              Quick management options for this opportunity
            </DialogDescription>
          </DialogHeader>
          
          {managingOpportunity && (
            <div className="space-y-4 pt-4">
              {/* Opportunity Overview */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <h3 className="font-semibold text-lg text-white mb-2 leading-tight">{managingOpportunity.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">{managingOpportunity.description}</p>
                
                {/* Compact Info Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Building2 className="h-4 w-4 text-amber-400 mr-1" />
                      <span className="text-xs font-medium text-slate-400">Publication</span>
                    </div>
                    <p className="text-white text-sm font-semibold truncate">{managingOpportunity.publication?.name}</p>
                    <p className="text-amber-400 text-xs">{managingOpportunity.tier}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="h-4 w-4 text-blue-400 mr-1" />
                      <span className="text-xs font-medium text-slate-400">Deadline</span>
                    </div>
                    <p className="text-white text-sm font-semibold">
                      {new Date(managingOpportunity.deadline).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-blue-400 text-xs">
                      {new Date(managingOpportunity.deadline) > new Date() ? 'Active' : 'Expired'}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <div className={`w-2 h-2 rounded-full mr-1 ${
                        getOpportunityStatus(managingOpportunity) === 'open' ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs font-medium text-slate-400">Status</span>
                    </div>
                    <p className={`text-sm font-semibold capitalize ${
                      getOpportunityStatus(managingOpportunity) === 'open' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {getOpportunityStatus(managingOpportunity)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Stats & Actions Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quick Stats */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <h4 className="font-semibold text-white text-sm mb-3 flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    Statistics
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg p-3 border border-blue-400/20">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 text-blue-400 mr-2" />
                        <div>
                          <p className="text-blue-200 text-xs font-medium">Pitches</p>
                          <p className="text-xl font-bold text-white">{managingOpportunity.pitchCount || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-400/20">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-400 mr-2" />
                        <div>
                          <p className="text-green-200 text-xs font-medium">
                            {managingOpportunity.highestBid && managingOpportunity.highestBid > (managingOpportunity.minimumBid || 0) 
                              ? 'Highest' 
                              : 'Min Bid'
                            }
                          </p>
                          <p className="text-xl font-bold text-white">
                            ${managingOpportunity.highestBid || managingOpportunity.minimumBid || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <h4 className="font-semibold text-white text-sm mb-3">Quick Actions</h4>
                  
                  <div className="space-y-2">
                    {/* Edit Button */}
                    <Button
                      size="sm"
                      className="w-full justify-start bg-amber-500/10 border border-amber-400/30 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 font-medium h-8"
                      onClick={() => {
                        setIsManageModalOpen(false);
                        handleEditOpportunity(managingOpportunity);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-2" />
                      Edit Content
                    </Button>
                    
                    {/* View Pitches Button */}
                    <Button
                      size="sm"
                      className="w-full justify-start bg-blue-500/10 border border-blue-400/30 hover:bg-blue-500/20 text-blue-300 hover:text-blue-200 font-medium h-8"
                      onClick={() => {
                        setIsManageModalOpen(false);
                        setManagingOpportunity(null);
                        setShowPitches(managingOpportunity.id);
                      }}
                    >
                      <MessageSquare className="h-3 w-3 mr-2" />
                      View Pitches ({managingOpportunity.pitchCount || 0})
                    </Button>
                    
                    {/* Close Opportunity Button - Only shown if open */}
                    {getOpportunityStatus(managingOpportunity) === 'open' && (
                      <Button
                        size="sm"
                        className="w-full justify-start bg-red-500/10 border border-red-400/30 hover:bg-red-500/20 text-red-300 hover:text-red-200 font-medium h-8"
                        onClick={() => {
                          setShowCloseConfirmation(managingOpportunity.id);
                          setIsManageModalOpen(false);
                          setManagingOpportunity(null);
                        }}
                      >
                        <X className="h-3 w-3 mr-2" />
                        Close Opportunity
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Notice for closed opportunities */}
              {getOpportunityStatus(managingOpportunity) === 'closed' && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-400/30 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <X className="h-3 w-3 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="text-yellow-400 font-semibold text-sm mb-1">Opportunity Closed</h4>
                      <p className="text-yellow-200 text-xs leading-relaxed">
                        This opportunity no longer accepts new pitches.
                        {new Date(managingOpportunity.deadline) < new Date() && (
                          <span className="block mt-1 text-red-300 font-medium">
                            ⏰ Auto-closed on {new Date(managingOpportunity.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="border-t border-white/10 pt-3 mt-4">
            <Button
              size="sm"
              className="bg-slate-700/50 border border-white/20 hover:bg-slate-600/50 text-white hover:text-amber-300 font-medium px-6"
              onClick={() => {
                setIsManageModalOpen(false);
                setManagingOpportunity(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Close Opportunity Confirmation Modal */}
      <Dialog open={!!showCloseConfirmation} onOpenChange={(open) => !open && setShowCloseConfirmation(null)}>
        <DialogContent className="max-w-lg bg-slate-900 border border-white/20 text-white shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold text-white flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                <X className="h-5 w-5 text-white" />
              </div>
              Close Opportunity?
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-base leading-relaxed">
              Are you sure you want to close this opportunity? This action will stop accepting new pitches and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {showCloseConfirmation && (() => {
              const opportunity = finalOpportunities?.find((o: any) => o.id === showCloseConfirmation);
              return opportunity ? (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                  <h4 className="font-semibold text-white mb-2 leading-tight">{opportunity.title}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Publication:</span>
                      <p className="text-white font-medium">{opportunity.publication?.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Pitches:</span>
                      <p className="text-white font-medium">{opportunity.pitchCount || 0} received</p>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
          
          <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-400/30 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 font-bold text-sm">⚠️</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-400 mb-1">Important</h4>
                <p className="text-sm text-red-200 leading-relaxed">
                  Closing this opportunity will prevent new experts from submitting pitches. Existing pitches will remain available for review.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setShowCloseConfirmation(null)}
              className="bg-slate-800/50 border-2 border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 font-semibold"
              disabled={updatingStatus[showCloseConfirmation || 0]}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (showCloseConfirmation) {
                  updateStatusMutation.mutate({
                    id: showCloseConfirmation,
                    status: 'closed'
                  });
                  setShowCloseConfirmation(null);
                }
              }}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg font-semibold"
              disabled={updatingStatus[showCloseConfirmation || 0]}
            >
              {updatingStatus[showCloseConfirmation || 0] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Yes, Close Opportunity
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}