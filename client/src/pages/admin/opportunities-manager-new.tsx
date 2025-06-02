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
  Loader2
} from "lucide-react";
import { INDUSTRY_OPTIONS, MEDIA_TYPES, OPPORTUNITY_TIERS, REQUEST_TYPES } from "@/lib/constants";
import { useLocation } from 'wouter';
import { Publication } from '@shared/schema';
import LogoUniform from '@/components/ui/logo-uniform';

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
  const [showPitches, setShowPitches] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingPublication, setIsCreatingPublication] = useState(false);
  const [location, setLocation] = useLocation();
  
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
  
  const { data: publications, isLoading: loadingPublications } = useQuery<Publication[]>({
    queryKey: ["/api/admin/publications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/publications");
      return res.json();
    },
  });
  
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
      const res = await apiRequest(
        "PATCH",
        `/api/admin/opportunities/${id}/status`,
        { status }
      );
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
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const filteredOpportunities = finalOpportunities
    ? finalOpportunities.filter((opp: any) => {
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
                              // Clear tier when creating new publication
                              form.setValue("tier", "");
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
                                <span>{pub.name}</span>
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
                        name="tier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Publication Tier *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
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
                              Select the appropriate tier for this publication
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
                                    accept="image/png"
                                    className="h-9"
                                    onChange={async (e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        
                                        // Check file type - only PNG allowed
                                        if (!file.type.startsWith('image/png')) {
                                          toast({
                                            title: "Invalid file type",
                                            description: "Only PNG format is allowed for publication logos",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        
                                        // Check file size - max 2MB
                                        if (file.size > 2 * 1024 * 1024) {
                                          toast({
                                            title: "File too large",
                                            description: "Logo must be less than 2MB in size",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        
                                        // Check image dimensions
                                        const img = new Image();
                                        img.onload = () => {
                                          if (img.width > 512 || img.height > 512) {
                                            toast({
                                              title: "Image too large",
                                              description: "Logo dimensions must not exceed 512x512 pixels",
                                              variant: "destructive"
                                            });
                                            return;
                                          }
                                          
                                          // If all checks pass, process the image
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            if (event.target?.result) {
                                              field.onChange(event.target.result.toString());
                                              toast({
                                                title: "Logo ready",
                                                description: "PNG logo is ready to be used for the publication.",
                                              });
                                            }
                                          };
                                          reader.readAsDataURL(file);
                                        };
                                        
                                        img.onerror = () => {
                                          toast({
                                            title: "Invalid image",
                                            description: "Could not process the uploaded image",
                                            variant: "destructive"
                                          });
                                        };
                                        
                                        img.src = URL.createObjectURL(file);
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
                                    className="w-16 h-16 object-contain border rounded bg-white" 
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
                              <strong>Requirements:</strong> PNG format only, maximum 512x512px, under 2MB file size. Recommended: Square logos work best for consistent display.
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
                            value={field.value}
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
                            Select the appropriate tier for this publication
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <span className="font-medium">${opportunity.minimumBid}</span>
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
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">No Pitches Yet</h3>
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30">
            <DialogHeader className="pb-6 border-b border-gray-200">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center">
                <Eye className="h-6 w-6 mr-3 text-blue-600" />
                Opportunity Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto py-6 space-y-6">
              {finalOpportunities?.find((o: any) => o.id === showDetails) && (
                <div className="space-y-6">
                  {(() => {
                    const opportunity = finalOpportunities.find((o: any) => o.id === showDetails);
                    return (
                      <>
                        {/* Header Card with Publication & Status */}
                        <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl p-6 border border-gray-200 shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Publication</h3>
                              <p className="text-xl font-semibold text-gray-900">{opportunity.publication.name}</p>
                            </div>
                            <Badge className={
                              opportunity.status === 'open'
                                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 px-4 py-2 text-sm font-medium'
                                : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 px-4 py-2 text-sm font-medium'
                            } variant="outline">
                              {opportunity.status.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Opportunity Title</h3>
                            <p className="text-lg font-medium text-gray-900 leading-relaxed">{opportunity.title}</p>
                          </div>
                        </div>
                        
                        {/* Description Card */}
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Description
                          </h3>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{opportunity.description}</p>
                        </div>
                        
                        {/* Key Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-200">
                            <div className="flex items-center mb-2">
                              <Tag className="h-5 w-5 text-blue-600 mr-2" />
                              <h3 className="text-sm font-medium text-blue-700 uppercase tracking-wide">Request Type</h3>
                            </div>
                            <p className="text-blue-900 font-semibold">{opportunity.requestType}</p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-200">
                            <div className="flex items-center mb-2">
                              <Building2 className="h-5 w-5 text-purple-600 mr-2" />
                              <h3 className="text-sm font-medium text-purple-700 uppercase tracking-wide">Media Type</h3>
                            </div>
                            <p className="text-purple-900 font-semibold">{opportunity.mediaType || "Not specified"}</p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5 border border-amber-200">
                            <div className="flex items-center mb-2">
                              <Tag className="h-5 w-5 text-amber-600 mr-2" />
                              <h3 className="text-sm font-medium text-amber-700 uppercase tracking-wide">Tier</h3>
                            </div>
                            <p className="text-amber-900 font-semibold">{opportunity.tier || "Not specified"}</p>
                          </div>
                        </div>
                        
                        {/* Industry & Tags */}
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center">
                                <Building2 className="h-4 w-4 mr-2" />
                                Primary Industry
                              </h3>
                              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                {opportunity.industry || "Not specified"}
                              </span>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center">
                                <Tag className="h-4 w-4 mr-2" />
                                Industry Tags
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {opportunity.tags?.map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="px-3 py-1.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                                    {tag}
                                  </Badge>
                                )) || <span className="text-gray-400 text-sm">No tags specified</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Financial & Timeline */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-xl p-6 border border-green-200">
                            <div className="flex items-center mb-3">
                              <DollarSign className="h-6 w-6 text-green-600 mr-3" />
                              <h3 className="text-sm font-medium text-green-700 uppercase tracking-wide">Minimum Bid</h3>
                            </div>
                            <p className="text-2xl font-bold text-green-800">${opportunity.minimumBid}</p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-red-50 to-rose-100/50 rounded-xl p-6 border border-red-200">
                            <div className="flex items-center mb-3">
                              <Calendar className="h-6 w-6 text-red-600 mr-3" />
                              <h3 className="text-sm font-medium text-red-700 uppercase tracking-wide">Deadline</h3>
                            </div>
                            <p className="text-xl font-bold text-red-800">
                              {new Date(opportunity.deadline).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        
                        {/* Metadata Footer */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>Opportunity ID: #{opportunity.id}</span>
                            <span>Created: {new Date(opportunity.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            
            <DialogFooter className="pt-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30">
              <Button 
                onClick={() => setShowDetails(null)}
                variant="outline"
                className="mr-3 border-gray-300 hover:bg-gray-50"
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
                className={
                  finalOpportunities?.find((o: any) => o.id === showDetails)?.status === 'open' 
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                    : 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                }
              >
                {finalOpportunities?.find((o: any) => o.id === showDetails)?.status === 'open' 
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