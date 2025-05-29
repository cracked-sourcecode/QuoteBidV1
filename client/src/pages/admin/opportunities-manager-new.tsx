import { useState } from "react";
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
} from "lucide-react";
import { INDUSTRY_OPTIONS, MEDIA_TYPES, OPPORTUNITY_TIERS, REQUEST_TYPES } from "@/lib/constants";

const opportunitySchema = z.object({
  publicationId: z.coerce.number(),
  newPublication: z.boolean().optional(),
  publicationName: z.string().optional(),
  publicationWebsite: z.string().url().optional().or(z.string().length(0)),
  publicationLogo: z.string().optional(),
  publicationDescription: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  requestType: z.string().min(1, "Request type is required"),
  mediaType: z.string().min(1, "Media type is required"),
  description: z.string().min(1, "Description is required"),
  tags: z.array(z.string()).min(1, "At least one industry tag is required"),
  tier: z.string().min(1, "Tier is required"),
  industry: z.string().min(1, "Primary industry is required"),
  minimumBid: z.coerce.number().min(1, "Minimum bid must be at least $1"),
  deadline: z.string().min(1, "Deadline is required"),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

export default function OpportunitiesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingPublication, setIsCreatingPublication] = useState(false);
  
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      requestType: "",
      mediaType: "",
      description: "",
      tags: [],
      tier: "",
      industry: "",
      minimumBid: 99,
      deadline: new Date().toISOString().split("T")[0],
      newPublication: false,
      publicationId: 0,
      publicationName: "",
      publicationWebsite: "",
      publicationLogo: "",
      publicationDescription: "",
    },
  });
  
  const { data: publications, isLoading: loadingPublications } = useQuery({
    queryKey: ["/api/admin/publications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/publications");
      return res.json();
    },
  });
  
  const { data: opportunities, isLoading: loadingOpportunities } = useQuery({
    queryKey: ["/api/admin/opportunities"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/opportunities");
      return res.json();
    },
  });
  
  const createOpportunityMutation = useMutation({
    mutationFn: async (data: OpportunityFormValues) => {
      // CRITICAL FIX: Triple ensure publicationId is a number before sending
      if (typeof data.publicationId === 'string') {
        data.publicationId = Number(data.publicationId);
        console.log('MUTATION FIX: Converted string publicationId to number:', data.publicationId);
      }
      console.log('Submitting opportunity with data:', JSON.stringify(data));
      
      // If creating a new publication
      if (data.newPublication && data.publicationName) {
        try {
          // First create the publication
          const pubRes = await apiRequest("POST", "/api/admin/publications", {
            name: data.publicationName,
            website: data.publicationWebsite || "",
            logo: data.publicationLogo || "",
            description: data.publicationDescription || ""
          });
          
          if (!pubRes.ok) {
            const errorData = await pubRes.json();
            throw new Error(errorData.message || "Failed to create publication");
          }
          
          // Get the new publication ID
          const publication = await pubRes.json();
          
          // Update the opportunity data with the new publication ID
          data.publicationId = publication.id;
        } catch (error: any) {
          toast({
            title: "Failed to create publication",
            description: error.message,
            variant: "destructive",
          });
          throw error;
        }
      }
      
      // Then create the opportunity
      const res = await apiRequest("POST", "/api/admin/opportunities", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities"]});
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
      const res = await apiRequest(
        "PATCH",
        `/api/admin/opportunities/${id}/status`,
        { status }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/admin/opportunities"]});
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
  
  const filteredOpportunities = opportunities
    ? opportunities.filter((opp: any) => {
        // Filter by search term
        const matchesSearch =
          filter === "" ||
          opp.title.toLowerCase().includes(filter.toLowerCase()) ||
          opp.description.toLowerCase().includes(filter.toLowerCase()) ||
          opp.publication.name.toLowerCase().includes(filter.toLowerCase());
        
        // Filter by tab
        const matchesTab =
          activeTab === "all" ||
          (activeTab === "open" && opp.status === "open") ||
          (activeTab === "closed" && opp.status === "closed");
        
        return matchesSearch && matchesTab;
      })
    : [];
  
  const onSubmit = (data: OpportunityFormValues) => {
    // CRITICAL FIX: Ensure publicationId is a number before submission
    if (typeof data.publicationId === 'string') {
      data.publicationId = Number(data.publicationId);
      console.log("Pre-submission fix: Converted publicationId to number:", data.publicationId);
    }
    createOpportunityMutation.mutate(data);
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
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search opportunities..."
              className="pl-8 w-full md:w-[260px]"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add New Opportunity
          </Button>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create New PR Opportunity</DialogTitle>
              <DialogDescription>
                Fill out the details below to create a new PR opportunity for users to bid on.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Select Publication */}
                <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                  <h3 className="text-lg font-medium flex items-center">
                    <Newspaper className="h-5 w-5 mr-2 text-blue-500" />
                    Publication Details
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="publicationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Publication</FormLabel>
                        <Select
                          value={String(field.value || '0')}
                          onValueChange={(value) => {
                            if (value === "new") {
                              setIsCreatingPublication(true);
                              form.setValue("newPublication", true);
                              field.onChange(0); // Clear the publication ID
                            } else {
                              setIsCreatingPublication(false);
                              form.setValue("newPublication", false);
                              // Reset the publication fields
                              form.setValue("publicationName", "");
                              form.setValue("publicationWebsite", "");
                              form.setValue("publicationLogo", "");
                              form.setValue("publicationDescription", "");
                              // CRITICAL FIX: Ensure we convert string to number
                              const numValue = Number(value);
                              console.log("Converting publicationId from", value, "to", numValue);
                              field.onChange(numValue);
                            }
                          }}
                          // No defaultValue needed when using controlled component with value prop
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a publication" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new">
                              <span className="flex items-center">
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
                    <div className="space-y-4 p-4 border rounded-md bg-gray-50">
                      <h4 className="text-md font-medium">New Publication Details</h4>
                      
                      <FormField
                        control={form.control}
                        name="publicationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Publication Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Forbes, Wall Street Journal, CNBC" {...field} />
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
                            <FormLabel>Website URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://publication.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Enter the main website for the publication
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="publicationLogo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Publication Logo</FormLabel>
                            <div className="flex flex-col gap-4">
                              <div className="flex gap-4 items-center">
                                <FormControl>
                                  <Input
                                    id="logo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="h-9"
                                    onChange={async (e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        
                                        // Check file size
                                        if (file.size > 5 * 1024 * 1024) {
                                          toast({
                                            title: "File too large",
                                            description: "Image must be less than 5MB",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        
                                        // Preview the image locally
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          if (event.target?.result) {
                                            // Create preview
                                            field.onChange(event.target.result.toString());
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                        
                                        // Keep the base64 data directly - we'll use this when creating the publication
                                        // This simplifies the process and avoids a separate upload endpoint
                                        toast({
                                          title: "Logo ready",
                                          description: "Image is ready to be used as publication logo.",
                                        });
                                      }
                                    }}
                                  />
                                </FormControl>
                              </div>
                              
                              {field.value && (
                                <div className="mt-2 flex gap-2 items-center">
                                  <img 
                                    src={field.value} 
                                    alt="Publication logo preview" 
                                    className="w-16 h-16 object-contain border rounded" 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Logo';
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => field.onChange('')}
                                    className="h-8"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </div>
                            <FormDescription>
                              Recommended size: 200x200px. PNG or JPG format.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="publicationDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Publication Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Provide details about the publication, its audience, and any other relevant information." 
                                className="min-h-[100px] resize-y"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              This description helps users understand the publication better
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
                
                {/* Step 2: Opportunity Details */}
                <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                  <h3 className="text-lg font-medium flex items-center">
                    <Tag className="h-5 w-5 mr-2 text-blue-500" />
                    Opportunity Details
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opportunity Title *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Expert commentary on cryptocurrency market trends" 
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
                      name="tier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Publication Tier *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
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
                          <FormDescription>
                            Tier 1: Major national publications<br />
                            Tier 2: Regional or industry-specific<br />
                            Tier 3: Smaller outlets with targeted audience
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Industry *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select primary industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INDUSTRY_OPTIONS.map((industry) => (
                                <SelectItem key={industry.value} value={industry.value}>
                                  {industry.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            This determines which users receive notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="requestType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Request Type *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select request type" />
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
                          <FormLabel>Media Type *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select media type" />
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
                        <FormLabel>Opportunity Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide a detailed description of what you're looking for from experts. Include information about the story angle, expertise required, and any specific requirements." 
                            className="min-h-[150px] resize-y"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Be specific about what you're looking for to attract the right experts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry Tags *</FormLabel>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 mb-2 min-h-[36px] p-2 border rounded-md bg-white">
                            {form.getValues('tags')?.length ? (
                              form.getValues('tags')?.map((tag) => (
                                <Badge key={tag} variant="secondary" className="h-6 gap-1 pl-2">
                                  {tag}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-transparent"
                                    onClick={() => removeTag(tag)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">No tags selected</span>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Select onValueChange={onTagSelect}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Add industry tag" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {INDUSTRY_OPTIONS.map((industry) => (
                                  <SelectItem key={industry.value} value={industry.value}>
                                    {industry.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <FormDescription>
                            Select all relevant industries to help experts find this opportunity
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                  
                {/* Step 3: Pricing & Deadline */}
                <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                  <h3 className="text-lg font-medium flex items-center">
                    <DollarSign className="h-5 w-5 mr-2 text-blue-500" />
                    Pricing & Deadline
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="minimumBid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Starting Bid Price ($) *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input type="number" min="1" className="pl-7" {...field} />
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
                          <FormLabel>Deadline *</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <Input type="date" {...field} />
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
                
                <DialogFooter className="pt-4 space-x-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createOpportunityMutation.isPending}
                  >
                    {createOpportunityMutation.isPending ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        Creating...
                      </>
                    ) : (
                      "Create Opportunity"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Opportunities</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {loadingOpportunities ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredOpportunities?.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map((opportunity: any) => (
            <Card key={opportunity.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
              <CardHeader className="relative pb-4 bg-gradient-to-r from-gray-50 to-white">
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/80">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowDetails(opportunity.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => updateStatusMutation.mutate({ 
                          id: opportunity.id, 
                          status: opportunity.status === 'open' ? 'closed' : 'open'
                        })}
                        className={opportunity.status === 'open' ? 'text-red-500' : 'text-green-500'}
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
                
                {/* Publication Logo and Name - Compact Header */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex-shrink-0">
                    {opportunity.publication.logo ? (
                      <img 
                        src={opportunity.publication.logo} 
                        alt={opportunity.publication.name}
                        className="w-6 h-6 rounded object-contain bg-white border border-gray-100"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Newspaper className={`w-6 h-6 text-gray-400 ${opportunity.publication.logo ? 'hidden' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 truncate">
                      {opportunity.publication.name}
                    </p>
                  </div>
                  <Badge className={
                    opportunity.status === 'open' 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' 
                      : 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200'
                  } variant="outline">
                    {opportunity.status.toUpperCase()}
                  </Badge>
                </div>
                
                {/* Opportunity Title */}
                <CardTitle className="text-lg leading-tight text-gray-900 pr-8">
                  {opportunity.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-4 pb-4">
                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                  {opportunity.description}
                </p>
                
                {/* Industry Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {opportunity.tags?.slice(0, 3).map((tag: string) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {opportunity.tags?.length > 3 && (
                    <Badge variant="outline" className="text-xs px-2 py-1 text-gray-500">
                      +{opportunity.tags.length - 3} more
                    </Badge>
                  )}
                </div>
                
                {/* Key Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="h-4 w-4 mr-1.5 text-green-600" />
                    <span className="font-medium">${opportunity.minimumBid}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-1.5 text-blue-600" />
                    <span>{new Date(opportunity.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                
                {/* Secondary Info */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {opportunity.tier && (
                      <span className="px-2 py-1 bg-gray-100 rounded-full">{opportunity.tier}</span>
                    )}
                    {opportunity.mediaType && (
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full">{opportunity.mediaType}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {opportunity.pitchCount || 0} pitches
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
      
      {/* Opportunity details modal */}
      {showDetails && (
        <Dialog open={!!showDetails} onOpenChange={() => setShowDetails(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Opportunity Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {opportunities?.find((o: any) => o.id === showDetails) && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">Publication</h3>
                    <p>{opportunities.find((o: any) => o.id === showDetails).publication.name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Title</h3>
                    <p>{opportunities.find((o: any) => o.id === showDetails).title}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Request Type</h3>
                    <p>{opportunities.find((o: any) => o.id === showDetails).requestType}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Description</h3>
                    <p>{opportunities.find((o: any) => o.id === showDetails).description}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Industry Tags</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {opportunities.find((o: any) => o.id === showDetails).tags?.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h3 className="font-semibold">Opportunity Tier</h3>
                      <p>{opportunities.find((o: any) => o.id === showDetails).tier || "Not specified"}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold">Primary Industry</h3>
                      <p>{opportunities.find((o: any) => o.id === showDetails).industry || "Not specified"}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold">Media Type</h3>
                      <p>{opportunities.find((o: any) => o.id === showDetails).mediaType || "Not specified"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold">Minimum Bid</h3>
                      <p>${opportunities.find((o: any) => o.id === showDetails).minimumBid}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold">Deadline</h3>
                      <p>{new Date(opportunities.find((o: any) => o.id === showDetails).deadline).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Status</h3>
                    <Badge className={
                      opportunities.find((o: any) => o.id === showDetails).status === 'open'
                        ? 'bg-green-500 hover:bg-green-600 mt-1'
                        : 'bg-red-500 hover:bg-red-600 mt-1'
                    }>
                      {opportunities.find((o: any) => o.id === showDetails).status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowDetails(null)}>Close</Button>
              <Button 
                variant={opportunities?.find((o: any) => o.id === showDetails)?.status === 'open' ? 'destructive' : 'outline'}
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
              >
                {opportunities?.find((o: any) => o.id === showDetails)?.status === 'open' 
                  ? 'Close Opportunity' 
                  : 'Reopen Opportunity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}