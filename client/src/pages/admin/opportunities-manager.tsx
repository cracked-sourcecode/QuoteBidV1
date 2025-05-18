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
  X
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
  
  // We've removed the filters as requested
  
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
  
  // No more filtering at this level
  const filteredOpportunities = opportunities;
  
  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Manage PR Opportunities</h2>
        
        <Button className="flex items-center" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Opportunity
        </Button>
        
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
                            <SelectTrigger>
                              <SelectValue placeholder="Select a publication" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new">
                              <span className="flex items-center text-blue-600">
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
                      <h4 className="text-md font-medium text-blue-600">New Publication Details</h4>
                      
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
                                        
                                        // Upload the file
                                        const formData = new FormData();
                                        formData.append('logo', file);
                                        
                                        try {
                                          const res = await apiFetch('/api/upload/publication-logo', {
                                            method: 'POST',
                                            credentials: 'include',
                                            body: formData
                                          });
                                          
                                          if (!res.ok) {
                                            const errorData = await res.json();
                                            throw new Error(errorData.message || 'Upload failed');
                                          }
                                          
                                          const data = await res.json();
                                          // Update the field with the actual URL after upload
                                          field.onChange(data.fileUrl);
                                          
                                          toast({
                                            title: "Logo uploaded",
                                            description: "Logo has been uploaded successfully.",
                                          });
                                        } catch (error) {
                                          console.error('Upload error:', error);
                                          toast({
                                            title: "Upload failed",
                                            description: error instanceof Error ? error.message : "Failed to upload image",
                                            variant: "destructive"
                                          });
                                        }
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
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="requestType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
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
                        <FormLabel>Media Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter a detailed description" {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Tags</FormLabel>
                      <div className="flex flex-col">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {field.value?.map((tag) => (
                            <Badge key={tag} className="flex items-center gap-1 bg-primary text-xs py-0.5 px-2 mb-1">
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 text-xs rounded-full hover:bg-primary-dark"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <Select onValueChange={onTagSelect}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-sm">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createOpportunityMutation.isPending}
                  >
                    {createOpportunityMutation.isPending ? "Creating..." : "Create Opportunity"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* This section is no longer needed as we moved the button to the header */}
      
      {loadingOpportunities ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredOpportunities?.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunities.map((opportunity: any) => (
            <Card key={opportunity.id} className="overflow-hidden">
              <CardHeader className="relative pb-2">
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
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
                <div className="flex items-center">
                  {opportunity.publication.logo ? (
                    <img 
                      src={opportunity.publication.logo} 
                      alt={opportunity.publication.name}
                      className="w-8 h-8 mr-2 rounded"
                    />
                  ) : (
                    <Newspaper className="w-8 h-8 mr-2 text-gray-400" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                    <CardDescription>{opportunity.publication.name}</CardDescription>
                  </div>
                </div>
                <Badge className={
                  opportunity.status === 'open' 
                    ? 'bg-green-500 hover:bg-green-600 mt-2' 
                    : 'bg-red-500 hover:bg-red-600 mt-2'
                }>
                  {opportunity.status.toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-sm mb-4 line-clamp-3">
                  {opportunity.description}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {opportunity.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Min Bid: ${opportunity.minimumBid}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(opportunity.deadline).toLocaleDateString()}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                  {opportunity.tier && (
                    <Badge variant="outline" className="justify-center">{opportunity.tier}</Badge>
                  )}
                  {opportunity.industry && (
                    <Badge variant="secondary" className="justify-center">{opportunity.industry}</Badge>
                  )}
                  {opportunity.mediaType && (
                    <Badge variant="outline" className="justify-center bg-primary/10">{opportunity.mediaType}</Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between text-sm text-muted-foreground">
                <span>Pitches: {opportunity.pitchCount || 0}</span>
                <span>ID: {opportunity.id}</span>
              </CardFooter>
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