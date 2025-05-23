import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiFetch } from '@/lib/apiFetch';
import { Publication, InsertPublication, Opportunity } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Loader2, Plus, Pencil, Trash, ExternalLink, Calendar, 
  DollarSign, Users, MessageSquare, ChevronRight, CircleCheck 
} from 'lucide-react';
const publicationFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters."
  }),
  logo: z.string(),
  website: z.string().url({
    message: "Website must be a valid URL."
  }).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
});

type PublicationFormValues = z.infer<typeof publicationFormSchema>;

export default function PublicationsManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentPublication, setCurrentPublication] = useState<Publication | null>(null);
  const [selectedOpportunities, setSelectedOpportunities] = useState<Opportunity[]>([]);
  const [selectedPitches, setSelectedPitches] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [publicationOpportunities, setPublicationOpportunities] = useState<Record<number, Opportunity[]>>({});

  // Query to fetch all publications
  const { data: publications, isLoading, isError } = useQuery({
    queryKey: ['/api/publications'],
    queryFn: async () => {
      const response = await apiFetch('/api/publications');
      if (!response.ok) {
        throw new Error('Failed to fetch publications');
      }
      return response.json() as Promise<Publication[]>;
    },
  });
  
  // Query to fetch opportunities
  const { data: opportunities, isLoading: isLoadingOpportunities } = useQuery({
    queryKey: ['/api/admin/opportunities'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/opportunities');
      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }
      return response.json() as Promise<Opportunity[]>;
    },
  });

  // Organize opportunities by publication
  useEffect(() => {
    if (opportunities && opportunities.length > 0) {
      const oppsByPublication: Record<number, Opportunity[]> = {};
      
      opportunities.forEach(opportunity => {
        if (opportunity.publicationId) {
          if (!oppsByPublication[opportunity.publicationId]) {
            oppsByPublication[opportunity.publicationId] = [];
          }
          oppsByPublication[opportunity.publicationId].push(opportunity);
        }
      });
      
      setPublicationOpportunities(oppsByPublication);
    }
  }, [opportunities]);
  
  // Create publication form
  const createForm = useForm<PublicationFormValues>({
    resolver: zodResolver(publicationFormSchema),
    defaultValues: {
      name: '',
      logo: '',
      website: '',
      description: '',
      category: '',
    },
  });

  // Edit publication form
  const editForm = useForm<PublicationFormValues>({
    resolver: zodResolver(publicationFormSchema),
    defaultValues: {
      name: '',
      logo: '',
      website: '',
      description: '',
      category: '',
    },
  });

  // Handle logo file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setLogoFile(file);
      
      // Generate preview URL
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  // Upload logo file and get URL
  const uploadLogo = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await apiFetch('/api/upload/publication-logo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }
      
      const data = await response.json();
      return data.fileUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Create publication mutation
  const createMutation = useMutation({
    mutationFn: async (publication: InsertPublication) => {
      const response = await apiFetch('/api/admin/publications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publication),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create publication');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/publications'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      setLogoFile(null);
      setLogoPreview(null);
      toast({
        title: 'Publication created',
        description: 'The publication has been successfully created.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create publication',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update publication mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Publication> }) => {
      const response = await apiFetch(`/api/admin/publications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update publication');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/publications'] });
      setIsEditDialogOpen(false);
      editForm.reset();
      setLogoFile(null);
      setLogoPreview(null);
      setCurrentPublication(null);
      toast({
        title: 'Publication updated',
        description: 'The publication has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update publication',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete publication mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/api/admin/publications/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        // Handle 409 error specifically
        if (response.status === 409) {
          const data = await response.json();
          throw new Error(`${data.message} (${data.count} opportunities use this publication)`);
        }
        throw new Error('Failed to delete publication');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/publications'] });
      setIsConfirmDeleteOpen(false);
      setCurrentPublication(null);
      toast({
        title: 'Publication deleted',
        description: 'The publication has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete publication',
        description: error.message,
        variant: 'destructive',
      });
      setIsConfirmDeleteOpen(false);
    },
  });

  // Handle creating a new publication
  const onCreateSubmit = async (values: PublicationFormValues) => {
    try {
      // Logo is required, so enforce the file upload requirement
      if (!logoFile && !logoPreview) {
        toast({
          title: "Logo required",
          description: "Please upload a logo image for the publication.",
          variant: "destructive",
        });
        return;
      }
      
      let logoUrl = values.logo;
      
      // If a file was selected, upload it first
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }
      
      await createMutation.mutateAsync({
        ...values,
        logo: logoUrl,
      });
    } catch (error) {
      console.error('Error creating publication:', error);
    }
  };

  // Handle updating a publication
  const onEditSubmit = async (values: PublicationFormValues) => {
    if (!currentPublication) return;
    
    try {
      // Logo is required, so enforce the file upload requirement
      if (!logoFile && !logoPreview) {
        toast({
          title: "Logo required",
          description: "Please upload a logo image for the publication.",
          variant: "destructive",
        });
        return;
      }
      
      let logoUrl = values.logo;
      
      // If a file was selected, upload it first
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }
      
      await updateMutation.mutateAsync({
        id: currentPublication.id,
        data: {
          ...values,
          logo: logoUrl,
        },
      });
    } catch (error) {
      console.error('Error updating publication:', error);
    }
  };

  // Open edit dialog and populate form
  const openEditDialog = (publication: Publication) => {
    setCurrentPublication(publication);
    editForm.reset({
      name: publication.name,
      logo: publication.logo,
      website: publication.website || '',
      description: publication.description || '',
      category: publication.category || '',
    });
    setLogoPreview(publication.logo);
    setIsEditDialogOpen(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (publication: Publication) => {
    setCurrentPublication(publication);
    setIsConfirmDeleteOpen(true);
  };

  // Handle delete confirmation
  const confirmDelete = () => {
    if (currentPublication) {
      deleteMutation.mutate(currentPublication.id);
    }
  };
  
  // Query to fetch pitches for a publication
  const { data: allPitches, isLoading: isLoadingPitches } = useQuery({
    queryKey: ['/api/admin/pitches'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/pitches');
      if (!response.ok) {
        throw new Error('Failed to fetch pitches');
      }
      return response.json();
    },
  });
  
  // Open publication details modal
  const openPublicationDetailsDialog = async (publication: Publication) => {
    setCurrentPublication(publication);
    
    // Get opportunities for this publication
    const pubOpportunities = publicationOpportunities[publication.id] || [];
    setSelectedOpportunities(pubOpportunities);
    
    // Get all pitches for these opportunities
    const opportunityIds = pubOpportunities.map(opp => opp.id);
    const relatedPitches = allPitches ? allPitches.filter(
      (pitch: any) => opportunityIds.includes(pitch.opportunityId)
    ) : [];
    setSelectedPitches(relatedPitches);
    
    setIsDetailsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">Failed to load publications. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Publications Manager</h1>
          <p className="text-gray-500 mt-1">
            Manage media outlets available for opportunities
          </p>
        </div>
        <Button onClick={() => {
          createForm.reset(); 
          setLogoFile(null);
          setLogoPreview(null);
          setIsCreateDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Add Publication
        </Button>
      </div>

      {/* Publications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {publications && publications.map((publication) => (
          <Card key={publication.id} className="overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="bg-gray-100 h-40 flex justify-center items-center p-4">
              <img 
                src={publication.logo} 
                alt={publication.name} 
                className="max-h-full max-w-full object-contain" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=No+Image';
                }}
              />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-center">
                {publication.name}
              </CardTitle>
              {publication.category && (
                <CardDescription className="text-sm">
                  Category: {publication.category}
                </CardDescription>
              )}
            </CardHeader>
            {publication.description && (
              <CardContent className="pt-0">
                <p className="text-sm line-clamp-3">{publication.description}</p>
              </CardContent>
            )}
            {/* Publication History Button */}
            {publicationOpportunities[publication.id] && (
              <div className="border-t pt-3 pb-3 px-4 text-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => openPublicationDetailsDialog(publication)}
                >
                  <Users className="h-4 w-4 mr-2" /> 
                  View Performance Analytics
                  {publicationOpportunities[publication.id]?.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {publicationOpportunities[publication.id].length}
                    </Badge>
                  )}
                </Button>
              </div>
            )}
            
            <CardFooter className="flex justify-between border-t p-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => openEditDialog(publication)}
              >
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => openDeleteDialog(publication)}
              >
                <Trash className="h-4 w-4 mr-1" /> Delete
              </Button>
            </CardFooter>
          </Card>
        ))}

        {publications && publications.length === 0 && (
          <div className="col-span-full flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No publications found</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Add Your First Publication
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Publication Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Publication</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new media outlet to the platform.
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="logo">Logo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Forbes, TechCrunch" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Technology, Finance" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the publication" 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="logo" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center">
                      {logoPreview ? (
                        <div className="relative mb-4">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="h-40 w-auto object-contain border rounded"
                          />
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="absolute top-0 right-0 rounded-full w-6 h-6 p-0"
                            type="button"
                            onClick={() => {
                              setLogoPreview(null);
                              setLogoFile(null);
                              createForm.setValue('logo', '');
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <div className="mb-4 border rounded p-8 bg-gray-50 flex flex-col items-center justify-center w-full h-40">
                          <p className="text-gray-500 text-sm mb-2">Upload a logo (200x200px recommended)</p>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Select File
                          </Button>
                        </div>
                      )}
                      
                      <Input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                      <input type="hidden" {...createForm.register('logo')} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
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
                  disabled={createMutation.isPending || isUploading}
                >
                  {(createMutation.isPending || isUploading) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Publication
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Publication Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Publication</DialogTitle>
            <DialogDescription>
              Update the publication details.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="logo">Logo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Forbes, TechCrunch" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Technology, Finance" {...field} />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the publication" 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="logo" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center">
                      {logoPreview ? (
                        <div className="relative mb-4">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="h-40 w-auto object-contain border rounded"
                          />
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="absolute top-0 right-0 rounded-full w-6 h-6 p-0"
                            type="button"
                            onClick={() => {
                              if (currentPublication) {
                                setLogoPreview(currentPublication.logo);
                                setLogoFile(null);
                                editForm.setValue('logo', currentPublication.logo);
                              } else {
                                setLogoPreview(null);
                                setLogoFile(null);
                                editForm.setValue('logo', '');
                              }
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <div className="mb-4 border rounded p-8 bg-gray-50 flex flex-col items-center justify-center w-full h-40">
                          <p className="text-gray-500 text-sm mb-2">Upload a logo (200x200px recommended)</p>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Select File
                          </Button>
                        </div>
                      )}
                      
                      <Input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={handleFileChange}
                      />
                      <input type="hidden" {...editForm.register('logo')} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending || isUploading}
                >
                  {(updateMutation.isPending || isUploading) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Publication
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{currentPublication?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Publication Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen} modal={true}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden p-0 mt-28 relative z-40 fixed">
          <div className="sticky top-0 z-10 bg-white p-6 border-b">
            <DialogHeader>
              <div className="flex items-center">
                {currentPublication?.logo && (
                  <img 
                    src={currentPublication.logo} 
                    alt={currentPublication.name} 
                    className="w-16 h-16 rounded object-contain mr-4" 
                  />
                )}
                <div>
                  <DialogTitle className="text-2xl">
                    {currentPublication?.name} Performance Analytics
                  </DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    Comprehensive analysis of historical opportunities, pitches, and yield data
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          
          <div className="overflow-y-auto max-h-[calc(90vh-10rem)] p-6">
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Total Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{selectedOpportunities.length}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedOpportunities.length > 0 
                      ? `Latest on ${format(new Date(selectedOpportunities[0].createdAt || new Date()), 'MMM d, yyyy')}` 
                      : 'No opportunities'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Total Pitches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{selectedPitches.length}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedPitches.length > 0
                      ? `${selectedPitches.filter((p: any) => p.status === 'accepted').length} accepted`
                      : 'No pitches'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Avg. Bid Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {selectedPitches.length > 0
                      ? `$${(selectedPitches.reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0) / selectedPitches.length).toFixed(2)}`
                      : '$0.00'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Based on {selectedPitches.length} pitches
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Tabs for detailed data */}
            <Tabs defaultValue="opportunities" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                <TabsTrigger value="pitches">Pitches & Bids</TabsTrigger>
                <TabsTrigger value="trends">Performance Trends</TabsTrigger>
              </TabsList>
              
              {/* Opportunities Tab */}
              <TabsContent value="opportunities" className="space-y-4 pt-4">
                <div className="bg-muted/40 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-2">All Opportunities</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete history of all opportunities published with this outlet
                  </p>
                  
                  {selectedOpportunities.length > 0 ? (
                    <div className="space-y-4">
                      {selectedOpportunities.map((opportunity) => (
                        <Card key={opportunity.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-md">{opportunity.title}</CardTitle>
                            <CardDescription className="text-xs">
                              Created on {format(new Date(opportunity.createdAt || new Date()), 'PPP')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="py-2">
                            <div className="flex flex-wrap gap-3 mb-2">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> 
                                {opportunity.deadline ? format(new Date(opportunity.deadline), 'PPP') : 'No deadline'}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> 
                                {opportunity.minimumBid ? `Min bid: $${opportunity.minimumBid.toFixed(2)}` : 'No min bid'}
                              </Badge>
                              {opportunity.tier && (
                                <Badge>{opportunity.tier}</Badge>
                              )}
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {selectedPitches.filter((p: any) => p.opportunityId === opportunity.id).length} pitches
                              </Badge>
                            </div>
                            {opportunity.description && (
                              <p className="text-sm mt-2">{opportunity.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No opportunities found for this publication</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Pitches Tab */}
              <TabsContent value="pitches" className="space-y-4 pt-4">
                <div className="bg-muted/40 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-2">All Pitches & Bids</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Comprehensive pitching history and bidding patterns
                  </p>
                  
                  {selectedPitches.length > 0 ? (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md">Bid Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-slate-100 h-4 rounded-full overflow-hidden">
                              <div 
                                className="bg-primary h-full rounded-full" 
                                style={{ width: `${Math.min(100, selectedPitches.filter((p: any) => p.status === 'accepted').length / selectedPitches.length * 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-sm font-medium">
                              {selectedPitches.filter((p: any) => p.status === 'accepted').length} / {selectedPitches.length}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            <div className="text-center p-3 bg-slate-50 rounded">
                              <div className="text-sm font-medium">Highest Bid</div>
                              <div className="text-lg font-bold mt-1">
                                ${Math.max(...selectedPitches.map((p: any) => p.bidAmount || 0), 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded">
                              <div className="text-sm font-medium">Lowest Bid</div>
                              <div className="text-lg font-bold mt-1">
                                ${Math.min(...selectedPitches.filter((p: any) => p.bidAmount > 0).map((p: any) => p.bidAmount || 0), 9999).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded">
                              <div className="text-sm font-medium">Average</div>
                              <div className="text-lg font-bold mt-1">
                                ${(selectedPitches.reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0) / selectedPitches.length).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div className="space-y-4 mt-6">
                        <h4 className="font-medium">Pitch History</h4>
                        <div className="max-h-[400px] overflow-y-auto space-y-3">
                          {selectedPitches.map((pitch: any) => {
                            const opportunity = selectedOpportunities.find(o => o.id === pitch.opportunityId);
                            return (
                              <Card key={pitch.id} className={`border-l-4 ${pitch.status === 'accepted' ? 'border-l-green-500' : pitch.status === 'pending' ? 'border-l-yellow-500' : 'border-l-slate-300'}`}>
                                <CardHeader className="py-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <CardTitle className="text-sm font-medium">
                                        {opportunity?.title || `Opportunity #${pitch.opportunityId}`}
                                      </CardTitle>
                                      <CardDescription className="text-xs">
                                        Pitched on {format(new Date(pitch.createdAt || new Date()), 'PPP')}
                                      </CardDescription>
                                    </div>
                                    <Badge className={`${pitch.status === 'accepted' ? 'bg-green-100 text-green-800' : pitch.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'}`}>
                                      {pitch.status === 'accepted' ? 'Accepted' : pitch.status === 'pending' ? 'Pending' : 'Rejected'}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="py-0">
                                  <div className="flex justify-between items-center text-sm mb-2">
                                    <div className="font-medium flex items-center">
                                      <DollarSign className="h-4 w-4 mr-1" /> 
                                      Bid Amount: <span className="font-bold ml-1">${pitch.bidAmount?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {pitch.paymentIntentId && 'Payment processed'}
                                    </div>
                                  </div>
                                  {pitch.content && (
                                    <div className="mt-2 text-sm">
                                      <Collapsible>
                                        <CollapsibleTrigger className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                                          <ChevronRight className="h-3 w-3 mr-1" />
                                          View pitch content
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <div className="mt-2 p-3 bg-slate-50 rounded text-xs">
                                            {pitch.content}
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No pitches found for this publication's opportunities</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-4 pt-4">
                <div className="bg-muted/40 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-2">Performance Analysis</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Long-term trends and financial yield analysis
                  </p>
                  
                  {selectedOpportunities.length > 0 ? (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md">Opportunity Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-slate-50 p-3 rounded">
                                <div className="text-sm text-muted-foreground">Total Yield</div>
                                <div className="text-xl font-bold mt-1">
                                  ${selectedPitches.filter((p: any) => p.status === 'accepted')
                                    .reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0).toFixed(2)}
                                </div>
                              </div>
                              <div className="bg-slate-50 p-3 rounded">
                                <div className="text-sm text-muted-foreground">Acceptance Rate</div>
                                <div className="text-xl font-bold mt-1">
                                  {selectedPitches.length > 0 
                                    ? `${Math.round(selectedPitches.filter((p: any) => p.status === 'accepted').length / selectedPitches.length * 100)}%`
                                    : '0%'}
                                </div>
                              </div>
                              <div className="bg-slate-50 p-3 rounded">
                                <div className="text-sm text-muted-foreground">Avg. Pitches / Opportunity</div>
                                <div className="text-xl font-bold mt-1">
                                  {selectedOpportunities.length > 0
                                    ? (selectedPitches.length / selectedOpportunities.length).toFixed(1)
                                    : '0'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-lg border mt-4">
                              <h4 className="text-sm font-medium mb-3">Opportunity Tier Distribution</h4>
                              <div className="space-y-3">
                                {Array.from(new Set(selectedOpportunities.map(o => o.tier || 'Unspecified'))).map((tier) => {
                                  const count = selectedOpportunities.filter(o => (o.tier || 'Unspecified') === tier).length;
                                  const percentage = Math.round(count / selectedOpportunities.length * 100);
                                  return (
                                    <div key={tier} className="space-y-1">
                                      <div className="flex justify-between text-sm">
                                        <span>{tier}</span>
                                        <span>{count} ({percentage}%)</span>
                                      </div>
                                      <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div 
                                          className="bg-primary h-2 rounded-full" 
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md">Bidding Patterns</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="bg-white p-4 rounded-lg border">
                              <h4 className="text-sm font-medium mb-3">Bid Amount Distribution</h4>
                              <div className="h-40 w-full bg-slate-50 rounded flex items-end justify-between px-4 py-2">
                                {/* Simple visualization of bid amounts */}
                                {Array.from({ length: 8 }, (_, i) => {
                                  const minBid = Math.min(...selectedPitches.filter((p: any) => p.bidAmount > 0).map((p: any) => p.bidAmount || 0), 0);
                                  const maxBid = Math.max(...selectedPitches.map((p: any) => p.bidAmount || 0), 1);
                                  const range = maxBid - minBid;
                                  const segment = range / 8;
                                  const lowerBound = minBid + segment * i;
                                  const upperBound = minBid + segment * (i + 1);
                                  const count = selectedPitches.filter((p: any) => 
                                    (p.bidAmount || 0) >= lowerBound && (p.bidAmount || 0) < upperBound
                                  ).length;
                                  const height = Math.max(10, Math.min(100, count / selectedPitches.length * 100));
                                  
                                  return (
                                    <div key={i} className="flex flex-col items-center">
                                      <div 
                                        className="w-6 bg-primary rounded-t" 
                                        style={{ height: `${height}%` }}
                                      ></div>
                                      <div className="text-xs mt-1">${lowerBound.toFixed(0)}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-lg border mt-4">
                              <h4 className="text-sm font-medium mb-3">Yield Optimization Recommendations</h4>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-start">
                                  <CircleCheck className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                                  <span>
                                    {selectedOpportunities.length > 0 && selectedPitches.length > 0
                                      ? `Based on ${selectedPitches.length} total pitches, optimal starting bid should be $${((selectedPitches.reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0) / selectedPitches.length) * 0.75).toFixed(2)}.`
                                      : 'Insufficient data for bid optimization recommendations.'}
                                  </span>
                                </li>
                                <li className="flex items-start">
                                  <CircleCheck className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                                  <span>
                                    {selectedOpportunities.length > 0
                                      ? `${selectedOpportunities.filter(o => o.tier).length} out of ${selectedOpportunities.length} opportunities have tier classifications. ${selectedOpportunities.filter(o => o.tier).length < selectedOpportunities.length ? 'Consider adding tiers to all opportunities.' : 'Good tier coverage.'}`
                                      : 'No opportunities available for tier analysis.'}
                                  </span>
                                </li>
                                <li className="flex items-start">
                                  <CircleCheck className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                                  <span>
                                    {selectedPitches.filter((p: any) => p.status === 'accepted').length > 0
                                      ? `Average accepted bid is $${(selectedPitches.filter((p: any) => p.status === 'accepted').reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0) / selectedPitches.filter((p: any) => p.status === 'accepted').length).toFixed(2)}.`
                                      : 'No accepted pitches yet for this publication.'}
                                  </span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No data available for trend analysis</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
