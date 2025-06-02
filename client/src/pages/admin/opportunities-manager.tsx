import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiFetch } from "@/lib/apiFetch";
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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Newspaper, 
  Calendar, 
  DollarSign, 
  Tag, 
  Clock, 
  Plus, 
  Edit, 
  MoreHorizontal, 
  Trash2,
  X,
  Search,
  Filter,
  Target,
  Activity,
  Users,
  TrendingUp,
  Eye,
  MessageSquare,
  Award,
  ExternalLink,
  Briefcase,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { INDUSTRY_OPTIONS, OPPORTUNITY_TIERS, REQUEST_TYPES, MEDIA_TYPES } from "@/lib/constants";

// Form schema for creating/editing opportunities
const opportunitySchema = z.object({
  publicationId: z.coerce.number({
    required_error: "Publication is required",
  }),
  // For creating new publications
  newPublication: z.boolean().default(false).optional(),
  publicationName: z.string().optional(),
  publicationLogo: z.string().optional(),
  publicationWebsite: z.string().optional(),
  // Opportunity fields  
  title: z.string().min(1, "Title is required"),
  requestType: z.string().min(1, "Request type is required"),
  mediaType: z.string().min(1, "Media type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  tags: z.array(z.string()).min(1, "At least one tag is required"),
  minimumBid: z.coerce.number().min(1, "Minimum bid is required"),
  deadline: z.string().min(1, "Deadline is required"),
  tier: z.string().min(1, "Opportunity tier is required"),
  industry: z.string().min(1, "Industry category is required"),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

export default function OpportunitiesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const [isCreatingPublication, setIsCreatingPublication] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  
  // Fetch all opportunities
  const { data: opportunities = [], isLoading: loadingOpportunities } = useQuery<any[]>({
    queryKey: ['/api/opportunities'],
  });
  
  // Fetch all publications for the dropdown
  const { data: publications = [], isLoading: loadingPublications } = useQuery<any[]>({
    queryKey: ['/api/publications'],
  });
  
  // Form setup
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      publicationId: 0,
      newPublication: false,
      publicationName: "",
      publicationLogo: "",
      publicationWebsite: "",
      title: "",
      requestType: "",
      mediaType: "",
      description: "",
      tags: [],
      minimumBid: 100,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tier: "",
      industry: "",
    },
  });
  
  // Create a new publication
  const createPublicationMutation = useMutation({
    mutationFn: async (data: { name: string; logo: string; website: string }) => {
      const res = await apiRequest('POST', '/api/admin/publications', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create publication');
      }
      return await res.json();
    },
    onSuccess: () => {
      // Immediately invalidate the publications query to fetch the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/publications"] });
      toast({
        title: "Publication created",
        description: "New publication added successfully and is now available in the dropdown."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create publication",
        description: error.message || "An error occurred while creating the publication.",
        variant: "destructive"
      });
    }
  });

  // Create a new opportunity
  const createOpportunityMutation = useMutation({
    mutationFn: async (data: OpportunityFormValues) => {
      // Handle new publication creation if selected
      if (data.newPublication && data.publicationName) {
        try {
          const publication = await createPublicationMutation.mutateAsync({
            name: data.publicationName,
            logo: data.publicationLogo || '',
            website: data.publicationWebsite || ''
          });
          // Update the publicationId with newly created publication
          data.publicationId = publication.id;
        } catch (error: any) {
          throw new Error(`Failed to create publication: ${error.message}`);
        }
      }
      
      // Format tags as array if it was passed as string
      const formattedData = {
        ...data,
        tags: typeof data.tags === 'string' ? [data.tags] : data.tags,
        // Format the deadline as an ISO string
        deadline: new Date(data.deadline).toISOString(),
        // Set primary industry as the same value as industry for notifications
        industry: data.industry,
        // Add the media type field
        mediaType: data.mediaType,
      };
      
      // Remove publication creation fields
      delete formattedData.newPublication;
      delete formattedData.publicationName;
      delete formattedData.publicationLogo;
      delete formattedData.publicationWebsite;
      
      const res = await apiRequest('POST', '/api/admin/opportunities', formattedData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create opportunity');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/publications'] });
      toast({
        title: "Opportunity created",
        description: "The new PR opportunity has been successfully created.",
      });
      setIsCreateDialogOpen(false);
      setIsCreatingPublication(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create opportunity",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update opportunity status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/opportunities/${id}/status`, { status });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update opportunity status');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      toast({
        title: "Status updated",
        description: "The opportunity status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: OpportunityFormValues) => {
    createOpportunityMutation.mutate(data);
  };
  
  // Handle industry tag selection
  const onTagSelect = (value: string) => {
    const currentTags = form.getValues('tags') || [];
    
    // Only add the tag if it doesn't exist already
    if (!currentTags.includes(value)) {
      form.setValue('tags', [...currentTags, value]);
    }
  };
  
  // Handle tag removal
  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };
  
  // Filter opportunities based on search term, status, and tier
  const filteredOpportunities = opportunities?.filter(opp => {
    const matchesSearch = searchTerm === '' || 
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.publication?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || opp.status === selectedStatus;
    const matchesTier = selectedTier === 'all' || opp.tier === selectedTier;
    
    return matchesSearch && matchesStatus && matchesTier;
  }) || [];

  // Calculate stats
  const stats = {
    totalOpportunities: opportunities?.length || 0,
    openOpportunities: opportunities?.filter(opp => opp.status === 'open').length || 0,
    closedOpportunities: opportunities?.filter(opp => opp.status === 'closed').length || 0,
    avgMinimumBid: opportunities?.length ? 
      Math.round(opportunities.reduce((sum, opp) => sum + (opp.minimumBid || 0), 0) / opportunities.length) : 0
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Header Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Opportunity Manager
                </span>
              </h1>
              <p className="text-gray-600 text-lg">
                Create and manage PR opportunities for users to bid on
              </p>
            </div>
            <button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              Add New Opportunity
            </button>
          </div>

          {/* Search and Filter Section */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search opportunities by title, description, publication, or industry..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                />
              </div>
              
              {/* Status Filter */}
              <div className="sm:w-40">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                    <Filter className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Tier Filter */}
              <div className="sm:w-40">
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                    <Award className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="Tier 1">Tier 1</SelectItem>
                    <SelectItem value="Tier 2">Tier 2</SelectItem>
                    <SelectItem value="Tier 3">Tier 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Results Counter */}
            {searchTerm && (
              <div className="mt-4 text-sm text-gray-600">
                Found {filteredOpportunities.length} opportunity{filteredOpportunities.length === 1 ? '' : 'ies'} matching "{searchTerm}"
              </div>
            )}
          </div>
          
          {/* Enhanced Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">Total Opportunities</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalOpportunities}</p>
                </div>
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">Open</p>
                  <p className="text-2xl font-bold text-green-900">{stats.openOpportunities}</p>
                </div>
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-4 border border-red-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">Closed</p>
                  <p className="text-2xl font-bold text-red-900">{stats.closedOpportunities}</p>
                </div>
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-1">Avg. Min Bid</p>
                  <p className="text-2xl font-bold text-purple-900">${stats.avgMinimumBid}</p>
                </div>
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Opportunities Grid */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          {loadingOpportunities ? (
            <div className="flex justify-center items-center py-16">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-gray-600 font-medium">Loading opportunities...</span>
              </div>
            </div>
          ) : filteredOpportunities && filteredOpportunities.length > 0 ? (
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredOpportunities.map((opportunity: any) => (
                  <div key={opportunity.id} className="bg-white rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl hover:border-gray-300/50 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                    {/* Card Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">{opportunity.publication?.name}</h3>
                            <p className="text-xs text-gray-500">
                              {new Date(opportunity.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowDetails(opportunity.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => updateStatusMutation.mutate({ 
                                id: opportunity.id, 
                                status: opportunity.status === 'open' ? 'closed' : 'open'
                              })}
                              className={opportunity.status === 'open' ? 'text-red-600' : 'text-green-600'}
                            >
                              {opportunity.status === 'open' ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Close Opportunity
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Reopen Opportunity
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="mb-4">
                        <Badge className={
                          opportunity.status === 'open' 
                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-200' 
                            : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-200'
                        } variant="outline">
                          {opportunity.status === 'open' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              OPEN
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              CLOSED
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      {/* Title */}
                      <h4 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">{opportunity.title}</h4>
                      
                      {/* Description */}
                      <p className="text-sm text-gray-600 line-clamp-3 mb-4">{opportunity.description}</p>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {opportunity.tier && (
                          <Badge 
                            variant="secondary" 
                            className={`
                              text-xs
                              ${opportunity.tier === 'Tier 1' ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200' : ''}
                              ${opportunity.tier === 'Tier 2' ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200' : ''}
                              ${opportunity.tier === 'Tier 3' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' : ''}
                            `}
                          >
                            <Award className="w-3 h-3 mr-1" />
                            {opportunity.tier}
                          </Badge>
                        )}
                        
                        {opportunity.industry && (
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                            <Tag className="w-3 h-3 mr-1" />
                            {opportunity.industry}
                          </Badge>
                        )}
                        
                        {opportunity.mediaType && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            <Zap className="w-3 h-3 mr-1" />
                            {opportunity.mediaType}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Key Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                          <span className="font-medium">${opportunity.minimumBid}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                          <span>{new Date(opportunity.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Footer */}
                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                      <button
                        onClick={() => setShowDetails(opportunity.id)}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 group"
                      >
                        <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 px-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <Briefcase className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {searchTerm ? 'No opportunities found' : 'No opportunities yet'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchTerm ? 
                  `No opportunities match your search criteria "${searchTerm}".` :
                  'Get started by creating your first PR opportunity for users to bid on.'
                }
              </p>
              {!searchTerm && (
                <button 
                  onClick={() => setIsCreateDialogOpen(true)} 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-5 w-5" />
                  Create Your First Opportunity
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create Opportunity Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-2xl">
            <DialogHeader className="pb-6 border-b border-gray-200/50">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Create New PR Opportunity
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Fill out the details below to create a new PR opportunity for users to bid on.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Select Publication */}
                <div className="space-y-4 rounded-xl border border-gray-200/50 p-6 bg-gradient-to-br from-blue-50/30 to-purple-50/30">
                  <h3 className="text-lg font-semibold flex items-center text-gray-800">
                    <Newspaper className="h-5 w-5 mr-3 text-blue-600" />
                    Publication Details
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="publicationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-gray-900">Select Publication</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            if (value === "new") {
                              setIsCreatingPublication(true);
                              form.setValue("newPublication", true);
                            } else {
                              setIsCreatingPublication(false);
                              form.setValue("newPublication", false);
                              field.onChange(value);
                            }
                          }}
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                              <SelectValue placeholder="Select a publication" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new">
                              <span className="flex items-center text-blue-600 font-semibold">
                                <Plus className="mr-2 h-4 w-4" />
                                Create New Publication
                              </span>
                            </SelectItem>
                            <SelectItem value="separator" disabled>
                              ──────────────────
                            </SelectItem>
                            {publications?.map((pub: any) => (
                              <SelectItem key={pub.id} value={pub.id.toString()}>
                                {pub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose an existing publication or create a new one
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {isCreatingPublication && (
                    <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50/30">
                      <h4 className="text-md font-semibold text-blue-800">New Publication Details</h4>
                      
                      <FormField
                        control={form.control}
                        name="publicationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-gray-900">Publication Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Forbes, Wall Street Journal, CNBC" 
                                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="publicationWebsite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-gray-900">Website URL</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://publication.com" 
                                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Enter the main website for the publication
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
                
                {/* Step 2: Opportunity Details */}
                <div className="space-y-4 rounded-xl border border-gray-200/50 p-6 bg-gradient-to-br from-green-50/30 to-blue-50/30">
                  <h3 className="text-lg font-semibold flex items-center text-gray-800">
                    <Tag className="h-5 w-5 mr-3 text-green-600" />
                    Opportunity Details
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-gray-900">Opportunity Title *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Expert commentary on cryptocurrency market trends" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Create a clear, compelling title that describes what you're looking for
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="requestType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-gray-900">Request Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                                <SelectValue placeholder="Select a request type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {REQUEST_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
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
                          <FormLabel className="font-semibold text-gray-900">Media Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                                <SelectValue placeholder="Select a media type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MEDIA_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-gray-900">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter a detailed description" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg resize-none"
                            {...field} 
                            rows={3} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-gray-900">Opportunity Tier</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                                <SelectValue placeholder="Select tier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {OPPORTUNITY_TIERS.map((tier) => (
                                <SelectItem key={tier.value} value={tier.value}>
                                  {tier.label}
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
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-gray-900">Industry Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INDUSTRY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-gray-900">Industry Tags</FormLabel>
                        <div className="flex flex-col">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {field.value?.map((tag) => (
                              <Badge key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs py-1 px-3 border border-blue-200">
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(tag)}
                                  className="ml-1 text-xs rounded-full hover:bg-blue-200 w-4 h-4 flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <Select onValueChange={onTagSelect}>
                            <FormControl>
                              <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                                <SelectValue placeholder="Add industry tag" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INDUSTRY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Step 3: Pricing & Deadline */}
                <div className="space-y-4 rounded-xl border border-gray-200/50 p-6 bg-gradient-to-br from-purple-50/30 to-pink-50/30">
                  <h3 className="text-lg font-semibold flex items-center text-gray-800">
                    <DollarSign className="h-5 w-5 mr-3 text-purple-600" />
                    Pricing & Deadline
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="minimumBid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-gray-900">Starting Bid Price ($) *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                              <Input 
                                type="number" 
                                min="1" 
                                className="pl-8 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Set the initial bid price - will increase as slots fill up
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deadline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-gray-900">Deadline *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                              <Input 
                                type="date" 
                                className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Final date for accepting bids
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <DialogFooter className="border-t border-gray-200/50 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createOpportunityMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Opportunity Details Modal */}
        {showDetails && (
          <Dialog open={!!showDetails} onOpenChange={() => setShowDetails(null)}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-2xl">
              <DialogHeader className="pb-6 border-b border-gray-200/50">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Opportunity Details
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {opportunities?.find((o: any) => o.id === showDetails) && (
                  <div className="space-y-6">
                    {/* Publication Info */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/50">
                      <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                        <Newspaper className="h-5 w-5 mr-2" />
                        Publication
                      </h3>
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-lg font-semibold text-blue-900">
                            {opportunities.find((o: any) => o.id === showDetails).publication.name}
                          </p>
                          {opportunities.find((o: any) => o.id === showDetails).publication?.website && (
                            <a 
                              href={opportunities.find((o: any) => o.id === showDetails).publication.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm flex items-center mt-1"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              {opportunities.find((o: any) => o.id === showDetails).publication.website}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Opportunity Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Title</h3>
                          <p className="text-gray-700 text-lg">{opportunities.find((o: any) => o.id === showDetails).title}</p>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Request Type</h3>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {opportunities.find((o: any) => o.id === showDetails).requestType}
                          </Badge>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                          <Badge className={
                            opportunities.find((o: any) => o.id === showDetails).status === 'open'
                              ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-200'
                              : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-200'
                          } variant="outline">
                            {opportunities.find((o: any) => o.id === showDetails).status === 'open' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                OPEN
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                CLOSED
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Minimum Bid</h3>
                            <div className="flex items-center text-green-600 font-semibold text-lg">
                              <DollarSign className="h-5 w-5 mr-1" />
                              ${opportunities.find((o: any) => o.id === showDetails).minimumBid}
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Deadline</h3>
                            <div className="flex items-center text-blue-600 font-semibold">
                              <Calendar className="h-4 w-4 mr-2" />
                              {new Date(opportunities.find((o: any) => o.id === showDetails).deadline).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Tier</h3>
                            <Badge 
                              variant="secondary" 
                              className={`
                                ${opportunities.find((o: any) => o.id === showDetails).tier === 'Tier 1' ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200' : ''}
                                ${opportunities.find((o: any) => o.id === showDetails).tier === 'Tier 2' ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200' : ''}
                                ${opportunities.find((o: any) => o.id === showDetails).tier === 'Tier 3' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' : ''}
                              `}
                            >
                              {opportunities.find((o: any) => o.id === showDetails).tier || "Not specified"}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Industry</h3>
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              {opportunities.find((o: any) => o.id === showDetails).industry || "Not specified"}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Media Type</h3>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {opportunities.find((o: any) => o.id === showDetails).mediaType || "Not specified"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-gray-700 leading-relaxed">
                          {opportunities.find((o: any) => o.id === showDetails).description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Industry Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {opportunities.find((o: any) => o.id === showDetails).tags?.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter className="border-t border-gray-200/50 pt-6">
                <Button 
                  variant="outline"
                  onClick={() => setShowDetails(null)}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Close
                </Button>
                <Button 
                  variant={opportunities?.find((o: any) => o.id === showDetails)?.status === 'open' ? 'destructive' : 'default'}
                  onClick={() => {
                    const opportunity = opportunities?.find((o: any) => o.id === showDetails);
                    if (opportunity) {
                      updateStatusMutation.mutate({
                        id: opportunity.id,
                        status: opportunity.status === 'open' ? 'closed' : 'open'
                      });
                      setShowDetails(null);
                    }
                  }}
                  className="shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {opportunities?.find((o: any) => o.id === showDetails)?.status === 'open' ? (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Close Opportunity
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Reopen Opportunity
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}