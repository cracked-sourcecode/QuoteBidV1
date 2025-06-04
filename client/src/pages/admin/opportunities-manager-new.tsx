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
  CalendarIcon
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

// Schema specifically for editing (content only - no pricing/deadline changes)
const editOpportunitySchema = z.object({
  title: z.string().min(50, "Title must be at least 50 characters").max(80, "Title must be 80 characters or less"),
  description: z.string().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  tags: z.array(z.string()).min(1, "At least one industry tag is required"),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;
type EditOpportunityFormValues = z.infer<typeof editOpportunitySchema>;

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
      // Ensure publicationId is a number
      if (typeof data.publicationId === 'string') {
        data.publicationId = Number(data.publicationId);
      }
      console.log('Updating opportunity with data:', JSON.stringify(data));
      
      const res = await apiRequest("PUT", `/api/admin/opportunities/${id}`, data);
      
      // Check if the response is OK
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Update failed with status:', res.status, 'Error:', errorText);
        throw new Error(errorText || `Update failed with status ${res.status}`);
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
        
        // Status filter
        const matchesStatus = selectedStatus === 'all' || opp.status === selectedStatus;
        
        // Tier filter
        const matchesTier = selectedTier === 'all' || opp.tier === selectedTier;
        
        // Publication filter - FIX: Compare publication ID with selected publication ID
        const matchesPublication = selectedPublication === 'all' || 
          opp.publication?.id?.toString() === selectedPublication;
        
        // Industry filter
        const matchesIndustry = selectedIndustry === 'all' || opp.industry === selectedIndustry;
        
        // Request Type filter
        const matchesRequestType = selectedRequestType === 'all' || opp.requestType === selectedRequestType;
        
        // Tab filter (keeping the existing tab functionality)
        const matchesTab =
          activeTab === "all" ||
          (activeTab === "open" && opp.status === "open") ||
          (activeTab === "closed" && opp.status === "closed");
        
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
    
    // Preserve all existing data and only update the content fields we allow editing
    const submissionData = {
      // Keep all existing opportunity data
      publicationId: editingOpportunity.publication?.id || editingOpportunity.publicationId,
      requestType: editingOpportunity.requestType,
      mediaType: editingOpportunity.mediaType,
      industry: editingOpportunity.industry,
      deadline: editingOpportunity.deadline,
      minimumBid: editingOpportunity.minimumBid || 225,
      tier: editingOpportunity.tier,
      // Override with edited content fields
      title: data.title,
      description: data.description,
      tags: data.tags,
    };

    console.log("Updating opportunity with preserved data:", submissionData);
    updateOpportunityMutation.mutate({ id: editingOpportunity.id, data: submissionData });
  };

  const handleEditOpportunity = (opportunity: any) => {
    setEditingOpportunity(opportunity);
    
    // Pre-populate the edit form with only the editable fields
    editForm.reset({
      title: opportunity.title || "",
      description: opportunity.description || "",
      tags: opportunity.tags || [],
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-4xl font-bold tracking-tight flex items-center">
              <Newspaper className="h-10 w-10 mr-3" />
              Opportunity Manager
            </h2>
            <p className="text-blue-100 mt-2 text-lg">
              Create and manage PR opportunities to connect journalists with industry experts
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              className="bg-white text-blue-600 hover:bg-gray-100 shadow-lg font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Opportunity
            </Button>
          </div>
        </div>
      </div>
      
      {/* Enhanced Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2 text-blue-600" />
          Search & Filter Opportunities
        </h3>
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
            <Input
              placeholder="Search by title, description, publication, industry, tier, or tags..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-12 h-12 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl shadow-sm bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10 bg-white border-2 hover:border-blue-300 focus:border-blue-500">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Open
                  </div>
                </SelectItem>
                <SelectItem value="closed">
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
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Tier</label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="h-10 bg-white border-2 hover:border-blue-300 focus:border-blue-500">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {OPPORTUNITY_TIERS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Publication Filter */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Publication</label>
            <Select value={selectedPublication} onValueChange={setSelectedPublication}>
              <SelectTrigger className="h-10 bg-white border-2 hover:border-blue-300 focus:border-blue-500">
                <SelectValue placeholder="All Publications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Publications</SelectItem>
                {publications && publications.length > 0 && (
                  <>
                    <div className="border-t my-2"></div>
                    <div className="px-2 py-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Publications</p>
                    </div>
                    {publications.map((pub: any) => (
                      <SelectItem key={pub.id} value={pub.id.toString()}>
                        <div className="flex items-center py-1">
                          <Building2 className="mr-3 h-4 w-4 text-blue-500" />
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
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Industry</label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="h-10 bg-white border-2 hover:border-blue-300 focus:border-blue-500">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {INDUSTRY_OPTIONS.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Request Type Filter */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Request Type</label>
            <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
              <SelectTrigger className="h-10 bg-white border-2 hover:border-blue-300 focus:border-blue-500">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {REQUEST_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
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
              className="h-10 w-full border-2 border-gray-300 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-gray-100 p-1 rounded-lg shadow-inner">
          <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md px-6">
            All Opportunities
          </TabsTrigger>
          <TabsTrigger value="open" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md px-6">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Open
            </div>
          </TabsTrigger>
          <TabsTrigger value="closed" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md px-6">
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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <p className="text-gray-600 font-medium">Loading opportunities...</p>
          </div>
        </div>
      ) : opportunitiesError ? (
        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xl font-bold text-gray-800 mb-2">Failed to Load Opportunities</p>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              {opportunitiesError.message || "We couldn't fetch the opportunities. Please try again."}
            </p>
            <Button 
              onClick={() => {
                queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities-with-pitches"]});
                queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities"]});
              }}
              variant="outline"
              className="border-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <Loader2 className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredOpportunities?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 xl:gap-8">
          {filteredOpportunities.map((opportunity: any) => (
            <Card key={opportunity.id} className="group relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col overflow-hidden">
              {/* Status ribbon */}
              <div className={`absolute top-0 right-0 px-4 py-1 text-xs font-bold uppercase tracking-wider ${
                opportunity.status === 'open' 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' 
                  : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
              }`}>
                {opportunity.status}
              </div>
              
              <CardHeader className="pb-3 pt-4 flex-shrink-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                {/* Publication Info with Logo */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {opportunity.publication.name}
                      </p>
                      {opportunity.tier && (
                        <p className="text-xs text-gray-500">{opportunity.tier}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Title and Tags */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {opportunity.title}
                  </h3>
                  
                  {/* Tags */}
                  {opportunity.tags && opportunity.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {opportunity.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col pt-4 pb-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-bold text-green-700">
                        ${opportunity.currentPrice || opportunity.minimumBid}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">Current Bid</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-bold text-blue-700">
                        {new Date(opportunity.deadline).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Deadline</p>
                  </div>
                </div>
                
                {/* Pitch Statistics */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <MessageSquare className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-lg font-bold text-gray-800">
                          {opportunity.pitchCount || 0}
                        </p>
                        <p className="text-xs text-gray-600">Pitches</p>
                      </div>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <p className={`text-sm font-semibold text-purple-700 ${opportunity.highestBid > 0 ? '' : 'opacity-0'}`}>
                        ${opportunity.highestBid || 0}
                      </p>
                      <p className={`text-xs text-purple-600 ${opportunity.highestBid > 0 ? '' : 'opacity-0'}`}>
                        Highest
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Spacer */}
                <div className="flex-1"></div>
                
                {/* Action Buttons */}
                <div className="space-y-3 mt-auto">
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowPitches(opportunity.id);
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      View Pitches
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
                      className="flex-1 border-2 hover:bg-gray-50"
                    >
                      <MoreHorizontal className="h-4 w-4 mr-1.5" />
                      Manage
                    </Button>
                  </div>
                  
                  {/* Footer Info */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      {opportunity.requestType && (
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                          {opportunity.requestType}
                        </span>
                      )}
                      {opportunity.mediaType && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                          {opportunity.mediaType}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      #{opportunity.id}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
              <Newspaper className="h-10 w-10 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-2">No Opportunities Yet</p>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              Start creating PR opportunities to connect journalists with experts and grow your platform.
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Opportunity
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Pitches Modal */}
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
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center text-xl">
                <MessageSquare className="h-6 w-6 mr-3 text-blue-600" />
                Pitches for: {finalOpportunities?.find((o: any) => o.id === showPitches)?.title}
              </DialogTitle>
              <DialogDescription className="text-base">
                {(() => {
                  const opportunity = finalOpportunities?.find((o: any) => o.id === showPitches);
                  const pitchCount = opportunity?.pitches?.length || 0;
                  const highestBid = opportunity?.highestBid || 0;
                  
                  return (
                    <div className="flex items-center gap-6 mt-2">
                      <span className="flex items-center">
                        <span className="font-semibold text-gray-700">{pitchCount}</span>
                        <span className="ml-1 text-gray-600">
                          {pitchCount === 1 ? 'pitch submitted' : 'pitches submitted'}
                        </span>
                      </span>
                      {highestBid > 0 && (
                        <span className="flex items-center">
                          <span className="text-green-600 font-semibold">Highest bid: ${highestBid}</span>
                        </span>
                      )}
                      <span className="text-blue-600">
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
                          className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${
                            pitch.status === 'successful' ? 'border-l-green-500 bg-green-50/30' :
                            pitch.status === 'sent' ? 'border-l-blue-500 bg-blue-50/30' :
                            pitch.status === 'pending' ? 'border-l-yellow-500 bg-yellow-50/30' :
                            'border-l-gray-400 bg-gray-50/30'
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
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start space-x-4 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  {pitch.user?.avatar ? (
                                    <img 
                                      src={pitch.user.avatar} 
                                      alt={pitch.user.fullName}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-2 border-white shadow-md">
                                      <User className="w-6 h-6 text-gray-500" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900 leading-tight">
                                        {pitch.user?.fullName || 'Unknown User'}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-sm text-gray-600">
                                          {pitch.user?.title || 'Expert'}
                                          {pitch.user?.company_name && ` • ${pitch.user.company_name}`}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      {pitch.bidAmount && (
                                        <div className="text-right">
                                          <p className="text-xs text-gray-500 uppercase tracking-wide">Bid Amount</p>
                                          <span className="text-lg font-bold text-green-600">
                                            ${pitch.bidAmount}
                                          </span>
                                        </div>
                                      )}
                                      <Badge 
                                        className={`px-3 py-1 text-sm font-medium ${
                                          pitch.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                          pitch.status === 'sent' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                          pitch.status === 'successful' ? 'bg-green-100 text-green-800 border-green-300' :
                                          'bg-gray-100 text-gray-800 border-gray-300'
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
                                    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-3">
                                      <p className="text-sm text-gray-700 line-clamp-4 leading-relaxed">
                                        {pitch.content}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center gap-4">
                                      {pitch.createdAt && (
                                        <span className="flex items-center">
                                          <Calendar className="w-3 h-3 mr-1" />
                                          Submitted {new Date(pitch.createdAt).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      )}
                                      <span className="text-gray-400">ID: {pitch.id}</span>
                                    </div>
                                    
                                    <div className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
                                      <span className="text-xs font-medium">View Details</span>
                                      <Eye className="w-3 h-3 ml-1" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-blue-900 mb-1">
                              💡 Managing Pitches
                            </h4>
                            <p className="text-sm text-blue-800 leading-relaxed">
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
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <MessageSquare className="h-10 w-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No Pitches Yet</h3>
                        <p className="text-gray-600 leading-relaxed mb-6">
                          No pitches have been submitted for this opportunity yet. Once experts start bidding, 
                          their pitches will appear here for you to review and manage.
                        </p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800">
                            <strong>Tip:</strong> You can promote this opportunity to attract more expert submissions, 
                            or adjust the minimum bid if needed.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
            
            <DialogFooter className="pt-4 border-t bg-gray-50/50">
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
                className="mr-3"
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Open in Pitches Manager
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Create Opportunity Dialog - Clean, Scrollable Design */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-8 z-10">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <Plus className="h-6 w-6 mr-3 text-blue-600" />
              Create New PR Opportunity
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2 text-base">
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
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Publication & Outlet Selection</h3>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
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
                          className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                            selectedPublicationTier === tierOption.tier
                              ? tierOption.tier === "Tier 1" 
                                ? 'border-emerald-500 bg-emerald-50 shadow-lg ring-4 ring-emerald-100'
                                : tierOption.tier === "Tier 2"
                                ? 'border-blue-500 bg-blue-50 shadow-lg ring-4 ring-blue-100'
                                : 'border-orange-500 bg-orange-50 shadow-lg ring-4 ring-orange-100'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          {/* Selection indicator */}
                          {selectedPublicationTier === tierOption.tier && (
                            <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                              tierOption.tier === "Tier 1" ? 'bg-emerald-500' :
                              tierOption.tier === "Tier 2" ? 'bg-blue-500' : 'bg-orange-500'
                            }`}>
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          
                          {/* Tier badge */}
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                            tierOption.tier === "Tier 1" ? "bg-emerald-100 text-emerald-800" :
                            tierOption.tier === "Tier 2" ? "bg-blue-100 text-blue-800" :
                            "bg-orange-100 text-orange-800"
                          }`}>
                            {tierOption.tier}
                          </div>
                          
                          {/* Content */}
                          <div className="space-y-4">
                            <div>
                              <h5 className="text-lg font-semibold text-gray-900 mb-2">{tierOption.title}</h5>
                              <p className="text-gray-600 text-sm leading-relaxed">{tierOption.description}</p>
                            </div>
                            
                            {/* Price */}
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-gray-900">{tierOption.price}</span>
                              <span className="text-sm text-gray-500">min bid</span>
                            </div>
                            
                            {/* Examples */}
                            <div className="pt-3 border-t border-gray-100">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Examples</p>
                              <div className="flex flex-wrap gap-1">
                                {tierOption.examples.map((example) => (
                                  <span key={example} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
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
                    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                      <div className="text-center mb-8">
                        <h4 className="text-xl font-semibold text-gray-900 mb-2">
                          Step 2: Choose Your {selectedPublicationTier} Publication
                        </h4>
                        <p className="text-gray-600">
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
                                <SelectTrigger className="h-16 text-base bg-white border-2 border-gray-300 hover:border-blue-400 focus:border-blue-500 transition-colors shadow-sm rounded-xl">
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
                              <SelectContent className="max-w-2xl bg-white border border-gray-200 shadow-lg">
                                {/* Create New Publication Option */}
                                <SelectItem value="new" className="p-4 hover:bg-gray-50">
                                  Create New Publication (Opens in new tab)
                                </SelectItem>
                                
                                {/* Existing Publications */}
                                {filteredPublications.length > 0 && (
                                  <>
                                    <div className="border-t border-gray-200 my-3"></div>
                                    <div className="px-4 py-3 bg-gray-50 rounded-lg mx-2 mb-3">
                                      <p className="text-sm font-semibold text-gray-700 flex items-center">
                                        <Building2 className="h-4 w-4 mr-2" />
                                        {selectedPublicationTier} Publications ({filteredPublications.length})
                                      </p>
                                    </div>
                                    {filteredPublications.map((pub: any) => (
                                      <SelectItem key={pub.id} value={pub.id.toString()} className="p-4 hover:bg-gray-50">
                                        {pub.name}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                
                                {/* No Publications Available */}
                                {filteredPublications.length === 0 && selectedPublicationTier && (
                                  <div className="px-6 py-12 text-center bg-white">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <Building2 className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h5 className="text-lg font-medium text-gray-600 mb-2">
                                      No {selectedPublicationTier} publications available
                                    </h5>
                                    <p className="text-gray-500 mb-4">
                                      Click "Create New Publication" to add your first {selectedPublicationTier} outlet
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => window.open('/admin/publications?create=true', '_blank')}
                                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Building2 className="h-10 w-10 text-blue-600" />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-800 mb-3">Select a Publication Tier Above</h4>
                      <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
                        Choose Tier 1, 2, or 3 to see available publications for that tier level. This helps organize your growing library of outlets.
                      </p>
                    </div>
                  )}
                </div>

                {/* Basic Details */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">Opportunity Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Opportunity Title *</FormLabel>
                        <FormDescription className="text-sm text-gray-600">
                          Create a descriptive title between 50-80 characters for consistent card display
                        </FormDescription>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="e.g., Expert Commentary on AI Market Trends for TechCrunch Article"
                              className="text-base h-12 pr-16"
                              maxLength={80}
                              minLength={50}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium z-10">
                              <span className={`px-2 py-1 rounded-md ${
                                field.value?.length < 50 
                                  ? "bg-red-100 text-red-700 border border-red-300"
                                  : field.value?.length > 70 
                                  ? "bg-orange-100 text-orange-700 border border-orange-300" 
                                  : "bg-green-100 text-green-700 border border-green-300"
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
                        <FormLabel className="text-base font-medium">Detailed Description *</FormLabel>
                        <FormDescription className="text-sm text-gray-600">
                          Provide a concise summary of the story and expertise needed (500 chars max)
                        </FormDescription>
                        <FormControl>
                          <div className="relative">
                            <Textarea 
                              {...field} 
                              placeholder="Briefly describe the story context, angle, and type of expert commentary you need..."
                              rows={5}
                              className="resize-none text-base pr-16"
                              maxLength={500}
                            />
                            <div className="absolute right-3 bottom-3 text-sm font-medium z-10">
                              <span className={`px-2 py-1 rounded-md ${
                                field.value?.length > 480 
                                  ? "bg-orange-100 text-orange-700 border border-orange-300" 
                                  : "bg-gray-100 text-gray-700 border border-gray-300"
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
                          <FormLabel className="text-base font-medium">Request Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select request type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {REQUEST_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
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
                          <FormLabel className="text-base font-medium">Media Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select media type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MEDIA_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
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
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">Expert Targeting</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Primary Industry *</FormLabel>
                          <FormDescription className="text-sm text-gray-600">
                            Main industry focus for this opportunity
                          </FormDescription>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select primary industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INDUSTRY_OPTIONS.map((industry) => (
                                <SelectItem key={industry.value} value={industry.value}>
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
                          <FormLabel className="text-base font-medium">Industry Tags *</FormLabel>
                          <FormDescription className="text-sm text-gray-600">
                            Add relevant industry tags to help experts find this opportunity
                          </FormDescription>
                          <div className="space-y-4">
                            {/* Add Tags */}
                            <div>
                              <Select onValueChange={(value) => onTagSelect(value)}>
                                <SelectTrigger className="h-auto min-h-12 p-3">
                                  {field.value?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 w-full">
                                      {field.value.map((tag: string) => (
                                        <span 
                                          key={tag} 
                                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium"
                                        >
                                          {tag}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeTag(tag);
                                            }}
                                            className="ml-2 hover:bg-blue-200 rounded-full p-1 transition-colors"
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
                                <SelectContent>
                                  {INDUSTRY_OPTIONS
                                    .filter((industry) => !field.value?.includes(industry.value))
                                    .map((industry) => (
                                      <SelectItem key={industry.value} value={industry.value}>
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
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Dynamic Pricing & Timeline</h3>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
                      Automatic pricing based on publication tier and deadline selection
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Automatic Minimum Bid Display */}
                    <div className="space-y-6 flex flex-col">
                      <div className="text-center lg:text-left">
                        <h4 className="text-xl font-semibold text-gray-900 mb-2">Minimum Bid (Auto-Set)</h4>
                        <p className="text-gray-600 leading-relaxed">
                          Automatically determined by your selected publication's tier
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200 shadow-sm flex-1">
                        <div className="text-center space-y-4 h-full flex flex-col justify-center">
                          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                            <DollarSign className="h-8 w-8 text-white" />
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-green-700 uppercase tracking-wide">Minimum Bid Amount</p>
                            <div className="text-4xl font-bold text-green-800">
                              ${form.watch("minimumBid") || 225}
                            </div>
                          </div>
                          
                          {/* Status indicators */}
                          <div className="space-y-3 pt-4 border-t border-green-200">
                            {!watchedPublicationId ? (
                              <div className="flex items-center justify-center text-amber-600">
                                <Clock className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">Select a publication above</span>
                              </div>
                            ) : (
                              watchedPublicationId && publications && (() => {
                                const selectedPub = publications.find(pub => pub.id === watchedPublicationId);
                                return selectedPub?.tier && (
                                  <div className="flex items-center justify-center text-green-600">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
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
                        <h4 className="text-xl font-semibold text-gray-900 mb-2">Response Deadline</h4>
                        <p className="text-gray-600 leading-relaxed">
                          Choose when you need expert responses by
                        </p>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 shadow-sm h-full">
                                <div className="text-center space-y-6 h-full flex flex-col justify-center">
                                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                    <CalendarIcon className="h-8 w-8 text-white" />
                                  </div>
                                  
                                  <div className="space-y-4">
                                    <p className="text-sm font-medium text-blue-700 uppercase tracking-wide">Deadline Date</p>
                                    
                                    <div className="space-y-3">
                                      <input
                                        type="date"
                                        value={field.value || ''}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        min={new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]}
                                        className="w-full h-14 px-4 text-lg font-medium text-center bg-white border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                      />
                                      {field.value && (
                                        <div className="bg-white rounded-lg p-3 text-center">
                                          <p className="text-xs text-blue-600 font-medium">
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
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-8 z-10">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  form.reset();
                }}
                className="flex-1 h-12"
                disabled={createOpportunityMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={form.handleSubmit(onSubmit)}
                className="flex-1 h-12"
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

      {/* Edit Opportunity Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <Edit className="h-6 w-6 mr-3 text-blue-600" />
              Edit Opportunity
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2 text-base">
              Update the opportunity details below.
            </DialogDescription>
          </div>
          
          {/* Scrollable Content */}
          <div className="p-6">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                
                {/* Content Editing Only */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Content Editing</h3>
                  <p className="text-sm text-gray-600">You can only edit content-based fields to protect pricing and deadline variables.</p>
                  
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Opportunity Title *</FormLabel>
                        <FormDescription className="text-sm text-gray-600">
                          Update the title (50-80 characters for consistent card display)
                        </FormDescription>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="e.g., Expert Commentary on AI Market Trends for TechCrunch Article"
                              className="text-base h-12 pr-16"
                              maxLength={80}
                              minLength={50}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium z-10">
                              <span className={`px-2 py-1 rounded-md ${
                                field.value?.length < 50 
                                  ? "bg-red-100 text-red-700 border border-red-300"
                                  : field.value?.length > 70 
                                  ? "bg-orange-100 text-orange-700 border border-orange-300" 
                                  : "bg-green-100 text-green-700 border border-green-300"
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
                        <FormLabel className="text-base font-medium">Description * (500 chars max)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Textarea 
                              {...field} 
                              placeholder="Briefly describe the story context, angle, and type of expert commentary you need..."
                              rows={4}
                              className="resize-none text-base pr-16"
                              maxLength={500}
                            />
                            <div className="absolute right-3 bottom-3 text-sm font-medium z-10">
                              <span className={`px-2 py-1 rounded-md ${
                                field.value?.length > 480 
                                  ? "bg-orange-100 text-orange-700 border border-orange-300" 
                                  : "bg-gray-100 text-gray-700 border border-gray-300"
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
                        <FormLabel className="text-base font-medium">Industry Tags *</FormLabel>
                        <div className="space-y-3">
                          <div>
                            <Select onValueChange={(value) => onEditTagSelect(value)}>
                              <SelectTrigger className="h-auto min-h-12 p-3">
                                {field.value?.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 w-full">
                                    {field.value.map((tag: string) => (
                                      <span 
                                        key={tag} 
                                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium"
                                      >
                                        {tag}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeEditTag(tag);
                                          }}
                                          className="ml-2 hover:bg-blue-200 rounded-full p-1 transition-colors"
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
                              <SelectContent>
                                {INDUSTRY_OPTIONS
                                  .filter((industry) => !field.value?.includes(industry.value))
                                  .map((industry) => (
                                    <SelectItem key={industry.value} value={industry.value}>
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
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">🔒 Protected Fields</h4>
                  <p className="text-sm text-yellow-700">Publication, deadline, pricing, request type, and media type cannot be edited to protect pricing engine variables.</p>
                </div>
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 z-10">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingOpportunity(null);
                  editForm.reset();
                }}
                className="flex-1 h-12"
                disabled={updateOpportunityMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={editForm.handleSubmit(onEditSubmit)}
                className="flex-1 h-12"
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
      
      {/* Manage Opportunity Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <MoreHorizontal className="h-6 w-6 mr-3 text-blue-600" />
              Manage Opportunity
            </DialogTitle>
            <DialogDescription>
              Manage settings and actions for this opportunity
            </DialogDescription>
          </DialogHeader>
          
          {managingOpportunity && (
            <div className="space-y-6">
              {/* Opportunity Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{managingOpportunity.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{managingOpportunity.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant={managingOpportunity.status === 'open' ? 'default' : 'secondary'}>
                    {managingOpportunity.status.toUpperCase()}
                  </Badge>
                  <span className="text-gray-500">
                    {managingOpportunity.publication?.name} • {managingOpportunity.tier}
                  </span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Available Actions</h4>
                
                {/* Edit Button */}
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setIsManageModalOpen(false);
                    handleEditOpportunity(managingOpportunity);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Opportunity Content
                </Button>
                
                {/* Close Opportunity Button - Only shown if open */}
                {managingOpportunity.status === 'open' && (
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => {
                      updateStatusMutation.mutate({
                        id: managingOpportunity.id,
                        status: 'closed'
                      });
                      setIsManageModalOpen(false);
                      setManagingOpportunity(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close Opportunity
                  </Button>
                )}
                
                {/* Notice for closed opportunities */}
                {managingOpportunity.status === 'closed' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This opportunity is closed and cannot be reopened. Closed opportunities no longer accept new pitches.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Stats */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">Opportunity Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{managingOpportunity.pitchCount || 0}</p>
                    <p className="text-sm text-gray-600">Total Pitches</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold">${managingOpportunity.highestBid || managingOpportunity.minimumBid || 0}</p>
                    <p className="text-sm text-gray-600">Highest Bid</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
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
    </div>
  );
}