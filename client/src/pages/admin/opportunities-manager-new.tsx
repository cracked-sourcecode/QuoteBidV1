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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Trash2,
  X,
  User,
  MessageSquare,
  Eye,
  MoreVertical,
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

const opportunitySchema = z.object({
  publicationId: z.coerce.number(),
  title: z.string().min(1, "Title is required"),
  requestType: z.string().min(1, "Request type is required"),
  mediaType: z.string().min(1, "Media type is required"),
  description: z.string().min(1, "Description is required"),
  tags: z.array(z.string()).min(1, "At least one industry tag is required"),
  industry: z.string().min(1, "Primary industry is required"),
  minimumBid: z.coerce.number().min(1, "Minimum bid must be at least $1"),
  deadline: z.string().min(1, "Deadline is required"),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

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
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const [showPitches, setShowPitches] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const [selectedPublicationTier, setSelectedPublicationTier] = useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
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
  
  // Watch publication changes to automatically update minimum bid based on publication's tier
  const watchedPublicationId = form.watch("publicationId");
  
  const { data: publications, isLoading: loadingPublications } = useQuery<Publication[]>({
    queryKey: ["/api/admin/publications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/publications");
      return res.json();
    },
  });

  // Filter publications by selected tier
  const filteredPublications = publications?.filter(pub => 
    !selectedPublicationTier || pub.tier === selectedPublicationTier
  ) || [];

  // Auto-update minimum bid based on selected publication's tier
  useEffect(() => {
    if (watchedPublicationId && publications) {
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
  }, [watchedPublicationId, publications, form]);
  
  // Also update minimum bid when tier is selected (before publication is chosen)
  useEffect(() => {
    if (selectedPublicationTier) {
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
  }, [selectedPublicationTier, form]);
  
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
  
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      console.log("Updating opportunity status:", { id, status });
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
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities-with-pitches"]});
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities"]});
      toast({
        title: "Status updated",
        description: "The opportunity status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
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
        
        // Publication filter
        const matchesPublication = selectedPublication === 'all' || 
          opp.publication?.name === selectedPublication;
        
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
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Opportunity Manager</h2>
          <p className="text-muted-foreground">
            Create and manage PR opportunities for users to bid on.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add New Opportunity
          </Button>
        </div>
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="mb-6">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search by title, description, publication, industry, tier, request type, media type, or tags..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-12 h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl shadow-sm"
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tier Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tier</label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="h-10">
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
            <label className="text-sm font-medium text-gray-700 mb-2 block">Publication</label>
            <Select value={selectedPublication} onValueChange={setSelectedPublication}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Publications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Publications</SelectItem>
                {publications && publications.length > 0 && (
                  <>
                    <div className="border-t my-2"></div>
                    <div className="px-2 py-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Existing Publications</p>
                    </div>
                    {publications.map((pub: any) => (
                      <SelectItem key={pub.id} value={pub.id.toString()}>
                        <div className="flex items-center py-1">
                          <Building2 className="mr-3 h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{pub.name}</p>
                            {pub.tier && (
                              <p className="text-xs text-gray-500">
                                {pub.tier} - Min bid: ${pub.tier === "Tier 1" ? "225" : pub.tier === "Tier 2" ? "175" : "125"}
                              </p>
                            )}
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
            <label className="text-sm font-medium text-gray-700 mb-2 block">Industry</label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="h-10">
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
            <label className="text-sm font-medium text-gray-700 mb-2 block">Request Type</label>
            <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
              <SelectTrigger className="h-10">
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
              className="h-10 w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Opportunities</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {finalLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : opportunitiesError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-red-500 mb-4">
              <X className="h-12 w-12 mx-auto mb-2" />
              <p className="text-xl font-semibold mb-2">Failed to load opportunities</p>
              <p className="text-sm text-muted-foreground mb-4">
                {opportunitiesError.message || "An error occurred while fetching opportunities"}
              </p>
              <Button 
                onClick={() => {
                  queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities-with-pitches"]});
                  queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities"]});
                }}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredOpportunities?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOpportunities.map((opportunity: any) => (
            <Card key={opportunity.id} className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-lg flex flex-col h-full">
              <CardHeader className="pb-3 pt-4 flex-shrink-0">
                {/* Header with proper spacing to prevent overlap */}
                <div className="flex items-start justify-between mb-3">
                  {/* Status Badge - positioned to avoid overlap */}
                  <Badge className={
                    opportunity.status === 'open' 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' 
                      : 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200'
                  } variant="outline">
                    {opportunity.status.toUpperCase()}
                  </Badge>
                  
                  {/* Three dots menu with proper spacing */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuItem
                        onClick={() => setShowDetails(opportunity.id)}
                        className="cursor-pointer"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowPitches(opportunity.id)}
                        className="cursor-pointer"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        View Pitches ({opportunity.pitchCount || 0})
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => updateStatusMutation.mutate({
                          id: opportunity.id,
                          status: opportunity.status === 'open' ? 'closed' : 'open'
                        })}
                        className="cursor-pointer"
                      >
                        {opportunity.status === 'open' ? (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Close Opportunity
                          </>
                        ) : (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            Reopen Opportunity
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Publication Logo and Name */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-700 truncate">
                      {opportunity.publication.name}
                    </p>
                  </div>
                </div>
                
                {/* Opportunity Title */}
                <CardTitle className="text-xl leading-tight text-gray-900 mb-2">
                  {opportunity.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col pb-4">
                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-4">
                  {opportunity.description}
                </p>
                
                {/* Industry Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {opportunity.tags?.slice(0, 3).map((tag: string) => (
                    <div 
                      key={tag} 
                      className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full shadow-sm border border-gray-200 hover:bg-gray-150 transition-colors"
                    >
                      {tag}
                    </div>
                  ))}
                  {opportunity.tags?.length > 3 && (
                    <div className="text-xs px-3 py-1.5 bg-gray-50 text-gray-500 rounded-full shadow-sm border border-gray-200">
                      +{opportunity.tags.length - 3} more
                    </div>
                  )}
                </div>
                
                {/* Key Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="h-4 w-4 mr-1.5 text-green-600" />
                    <span className="font-medium">{opportunity.currentPrice || opportunity.minimumBid}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-1.5 text-blue-600" />
                    <span>{new Date(opportunity.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                
                {/* Pitch Summary */}
                <div className="bg-gray-50 rounded-md p-3 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-gray-700">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">
                        {opportunity.pitchCount || 0} Pitches
                      </span>
                    </div>
                    {opportunity.highestBid > 0 && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        High: ${opportunity.highestBid}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Spacer to push buttons to bottom */}
                <div className="flex-1"></div>
                
                {/* Action Buttons - Always at bottom */}
                <div className="space-y-3 mt-auto">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPitches(opportunity.id);
                      }}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Pitches ({opportunity.pitchCount || 0})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowDetails(opportunity.id);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Secondary Info */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {opportunity.tier && (
                        <span className="px-2 py-1 bg-gray-100 rounded-full">{opportunity.tier}</span>
                      )}
                      {opportunity.mediaType && (
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full">{opportunity.mediaType}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {opportunity.id}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Newspaper className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-xl font-semibold mb-2">No opportunities yet</p>
            <p className="text-muted-foreground mb-4">
              Create your first PR opportunity to get started.
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              className="flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Opportunity
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Pitches Modal */}
      {showPitches && (
        <Dialog open={!!showPitches} onOpenChange={() => setShowPitches(null)}>
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
                          onClick={() => {
                            setLocation(`/admin/pitches?openDetails=${pitch.id}`);
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
                onClick={() => setShowPitches(null)}
                variant="outline"
                className="mr-3"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  setLocation(`/admin/pitches?opportunity=${showPitches}`);
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
      
      {/* Opportunity details modal */}
      {showDetails && (
        <Dialog open={!!showDetails} onOpenChange={() => setShowDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-xl font-bold flex items-center">
                <Eye className="h-5 w-5 mr-2 text-blue-600" />
                Opportunity Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-6">
              {(() => {
                const opportunity = finalOpportunities?.find((o: any) => o.id === showDetails);
                
                if (!opportunity) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Opportunity not found</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Title</label>
                          <p className="text-base font-medium">{opportunity.title || 'No title'}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-500">Publication</label>
                          <p className="text-base">{opportunity.publication?.name || 'Unknown Publication'}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Status</label>
                            <Badge className={
                              opportunity.status === 'open' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }>
                              {opportunity.status || 'Unknown'}
                            </Badge>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Tier</label>
                            <p className="text-base">{opportunity.tier || 'Not specified'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Description */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {opportunity.description || 'No description provided'}
                        </p>
                      </CardContent>
                    </Card>
                    
                    {/* Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Additional Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Request Type</label>
                            <p className="text-base">{opportunity.requestType || 'Not specified'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Media Type</label>
                            <p className="text-base">{opportunity.mediaType || 'Not specified'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Industry</label>
                            <p className="text-base">{opportunity.industry || 'Not specified'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Minimum Bid</label>
                            <p className="text-base">${opportunity.minimumBid || opportunity.currentPrice || 0}</p>
                          </div>
                        </div>
                        
                        {opportunity.tags && opportunity.tags.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Tags</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {opportunity.tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Deadline</label>
                            <p className="text-base">
                              {opportunity.deadline 
                                ? new Date(opportunity.deadline).toLocaleDateString()
                                : 'Not specified'
                              }
                            </p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-500">Created</label>
                            <p className="text-base">
                              {opportunity.createdAt 
                                ? new Date(opportunity.createdAt).toLocaleDateString()
                                : 'Unknown'
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Pitch Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Pitch Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold">{opportunity.pitchCount || 0}</p>
                            <p className="text-sm text-gray-500">Total Pitches</p>
                          </div>
                          {opportunity.highestBid > 0 && (
                            <div>
                              <p className="text-2xl font-bold text-green-600">${opportunity.highestBid}</p>
                              <p className="text-sm text-gray-500">Highest Bid</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </div>
            
            <DialogFooter className="pt-4 border-t">
              <Button 
                onClick={() => setShowDetails(null)}
                variant="outline"
              >
                Close
              </Button>
              <Button 
                variant={finalOpportunities?.find((o: any) => o.id === showDetails)?.status === 'open' ? 'destructive' : 'default'}
                onClick={() => {
                  const opportunity = finalOpportunities?.find((o: any) => o.id === showDetails);
                  if (opportunity) {
                    updateStatusMutation.mutate({
                      id: opportunity.id,
                      status: opportunity.status === 'open' ? 'closed' : 'open'
                    });
                    setShowDetails(null);
                  }
                }}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {finalOpportunities?.find((o: any) => o.id === showDetails)?.status === 'open' 
                  ? 'Close Opportunity' 
                  : 'Reopen Opportunity'}
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
                          Create a clear, compelling title that describes what you're looking for
                        </FormDescription>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., Expert Commentary on AI Market Trends for TechCrunch Article"
                            className="text-base h-12"
                          />
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
                          Provide comprehensive details about the story, angle, and what type of expertise you're seeking
                        </FormDescription>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe the story context, specific angles you're exploring, the type of expert commentary needed, and any relevant background information..."
                            rows={5}
                            className="resize-none text-base"
                          />
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
    </div>
  );
}