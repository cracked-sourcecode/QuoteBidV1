import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiFetch } from '@/lib/apiFetch';
import { Publication, InsertPublication, Opportunity } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Loader2, Plus, Pencil, Trash, Calendar, DollarSign, 
  TrendingUp, BarChart3, Database, Target, Zap, Activity
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

interface PublicationAnalytics {
  id: number;
  name: string;
  logo: string;
  category?: string;
  totalOpportunities: number;
  totalPitches: number;
  acceptedPitches: number;
  averageBidAmount: number;
  highestBid: number;
  lowestBid: number;
  totalYield: number;
  acceptanceRate: number;
  pitchesPerOpportunity: number;
  lastActivity: string;
  tierDistribution: Record<string, number>;
  bidTrends: {
    month: string;
    avgBid: number;
    totalBids: number;
  }[];
}

// Publication Row Component
const PublicationRow: React.FC<{
  publication: Publication;
  onViewAnalytics: (pub: Publication) => void;
  onEdit: (pub: Publication) => void;
  onDelete: (pub: Publication) => void;
}> = ({ publication, onViewAnalytics, onEdit, onDelete }) => {
  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img 
                src={publication.logo} 
                alt={publication.name} 
                className="w-12 h-12 rounded object-contain bg-white border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/48x48?text=Logo';
                }}
              />
            </div>
            
            {/* Publication Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {publication.name}
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-600">
                  {publication.category || 'General Media'}
                </span>
                {publication.website && (
                  <a 
                    href={publication.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <span className="truncate max-w-[200px]">{publication.website}</span>
                  </a>
                )}
              </div>
              {publication.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {publication.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Analytics button clicked for:', publication.name);
                onViewAnalytics(publication);
              }}
              className="flex items-center"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Analytics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(publication)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(publication)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PublicationsManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [currentPublication, setCurrentPublication] = useState<Publication | null>(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState<PublicationAnalytics | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Debug modal state changes
  useEffect(() => {
    console.log('Modal state changed to:', isAnalyticsModalOpen);
    if (isAnalyticsModalOpen && currentPublication) {
      console.log('Modal is open for publication:', currentPublication.name);
    }
  }, [isAnalyticsModalOpen, currentPublication]);

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
  
  // Query to fetch opportunities with pitches for analytics
  const { data: opportunitiesWithPitches, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['/api/admin/opportunities-with-pitches'],
    queryFn: async () => {
      const response = await apiFetch('/api/admin/opportunities-with-pitches');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return response.json();
    },
  });

  // Process analytics data for each publication
  const processPublicationAnalytics = (publicationId: number): PublicationAnalytics | null => {
    if (!opportunitiesWithPitches || !publications) return null;

    const publication = publications.find(p => p.id === publicationId);
    if (!publication) return null;

    const publicationOpportunities = opportunitiesWithPitches.filter(
      (opp: any) => opp.publicationId === publicationId
    );

    const allPitches = publicationOpportunities.flatMap((opp: any) => opp.pitches || []);
    const acceptedPitches = allPitches.filter((pitch: any) => pitch.status === 'successful' || pitch.status === 'accepted');
    
    const bidAmounts = allPitches.map((pitch: any) => pitch.bidAmount || 0).filter((bid: number) => bid > 0);
    const totalYield = acceptedPitches.reduce((sum: number, pitch: any) => sum + (pitch.bidAmount || 0), 0);

    // Tier distribution
    const tierDistribution: Record<string, number> = {};
    publicationOpportunities.forEach((opp: any) => {
      const tier = opp.tier || 'Unspecified';
      tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
    });

    // Simple bid trends (group by month)
    const bidTrends: { month: string; avgBid: number; totalBids: number }[] = [];
    const monthlyData: Record<string, number[]> = {};
    
    allPitches.forEach((pitch: any) => {
      if (pitch.createdAt && pitch.bidAmount > 0) {
        const month = format(new Date(pitch.createdAt), 'MMM yyyy');
        if (!monthlyData[month]) monthlyData[month] = [];
        monthlyData[month].push(pitch.bidAmount);
      }
    });

    Object.entries(monthlyData).forEach(([month, bids]) => {
      bidTrends.push({
        month,
        avgBid: bids.reduce((sum: number, bid: number) => sum + bid, 0) / bids.length,
        totalBids: bids.length
      });
    });

    return {
      id: publication.id,
      name: publication.name,
      logo: publication.logo,
      category: publication.category || undefined,
      totalOpportunities: publicationOpportunities.length,
      totalPitches: allPitches.length,
      acceptedPitches: acceptedPitches.length,
      averageBidAmount: bidAmounts.length > 0 ? bidAmounts.reduce((sum: number, bid: number) => sum + bid, 0) / bidAmounts.length : 0,
      highestBid: Math.max(...bidAmounts, 0),
      lowestBid: bidAmounts.length > 0 ? Math.min(...bidAmounts) : 0,
      totalYield,
      acceptanceRate: allPitches.length > 0 ? (acceptedPitches.length / allPitches.length) * 100 : 0,
      pitchesPerOpportunity: publicationOpportunities.length > 0 ? allPitches.length / publicationOpportunities.length : 0,
      lastActivity: publicationOpportunities.length > 0 ? 
        format(new Date(Math.max(...publicationOpportunities.map((opp: any) => new Date(opp.createdAt || 0).getTime()))), 'MMM d, yyyy') : 
        'No activity',
      tierDistribution,
      bidTrends: bidTrends.slice(-6) // Last 6 months
    };
  };

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
        
        // If all checks pass, set the file and preview
        setLogoFile(file);
        const previewUrl = URL.createObjectURL(file);
        setLogoPreview(previewUrl);
        
        // Update form values for both create and edit forms
        if (isCreateDialogOpen) {
          createForm.setValue('logo', previewUrl);
        }
        if (isEditDialogOpen) {
          editForm.setValue('logo', previewUrl);
        }
        
        toast({
          title: "Logo ready",
          description: "PNG logo is ready to be uploaded.",
        });
      };
      
      img.onerror = () => {
        toast({
          title: "Invalid image",
          description: "Could not process the uploaded PNG image",
          variant: "destructive"
        });
      };
      
      img.src = URL.createObjectURL(file);
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/opportunities-with-pitches'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/opportunities-with-pitches'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/opportunities-with-pitches'] });
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
      if (!logoFile && !logoPreview) {
        toast({
          title: "Logo required",
          description: "Please upload a logo image for the publication.",
          variant: "destructive",
        });
        return;
      }
      
      let logoUrl = values.logo;
      
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
      let logoUrl = currentPublication.logo; // Default to existing logo
      
      // If user uploaded a new logo file, upload it
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      } else if (values.logo && values.logo !== currentPublication.logo) {
        // If logo value changed but no file uploaded (shouldn't happen, but just in case)
        logoUrl = values.logo;
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
    // Set the logo preview to show current logo and clear any pending file
    setLogoPreview(publication.logo);
    setLogoFile(null);
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

  // Open analytics modal
  const openAnalyticsModal = (publication: Publication) => {
    console.log('Opening analytics modal for:', publication.name);
    console.log('Current modal state before:', isAnalyticsModalOpen);
    
    const analytics = processPublicationAnalytics(publication.id);
    console.log('Analytics data:', analytics);
    
    setSelectedAnalytics(analytics); // Set even if null
    setCurrentPublication(publication); // Always set current publication
    setIsAnalyticsModalOpen(true); // Always open the modal
    
    console.log('Modal state set to true');
    console.log('Current publication set to:', publication.name);
    
    // Force a small delay to ensure state is updated
    setTimeout(() => {
      console.log('After timeout - modal should be open:', isAnalyticsModalOpen);
    }, 100);
  };

  if (isLoading || isLoadingAnalytics) {
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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Database className="h-8 w-8 mr-3 text-blue-600" />
            Publications Manager
          </h1>
          <p className="text-gray-600 mt-2">
            Manage media outlets and track historical performance data
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

      {/* Publications organized by tiers */}
      {publications && publications.length > 0 ? (
        <div className="space-y-8">
          {/* Tier 1 Publications */}
          <div>
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Tier 1 Publications</h2>
              <Badge variant="secondary" className="ml-3 bg-green-100 text-green-800">
                Premium Outlets
              </Badge>
            </div>
            <div className="grid gap-4">
              {publications
                .filter((pub) => {
                  const analytics = processPublicationAnalytics(pub.id);
                  return analytics && analytics.tierDistribution && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 1'));
                })
                .concat(publications.filter((pub) => {
                  const analytics = processPublicationAnalytics(pub.id);
                  return !analytics && pub.name.toLowerCase().includes('forbes') || 
                         pub.name.toLowerCase().includes('wall street') ||
                         pub.name.toLowerCase().includes('bloomberg') ||
                         pub.name.toLowerCase().includes('reuters');
                }))
                .map((publication) => (
                  <PublicationRow key={publication.id} publication={publication} onViewAnalytics={openAnalyticsModal} onEdit={openEditDialog} onDelete={openDeleteDialog} />
                ))
              }
              {publications.filter((pub) => {
                const analytics = processPublicationAnalytics(pub.id);
                return analytics && analytics.tierDistribution && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 1'));
              }).length === 0 && publications.filter((pub) => {
                const analytics = processPublicationAnalytics(pub.id);
                return !analytics && (pub.name.toLowerCase().includes('forbes') || 
                       pub.name.toLowerCase().includes('wall street') ||
                       pub.name.toLowerCase().includes('bloomberg') ||
                       pub.name.toLowerCase().includes('reuters'));
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  <p className="text-sm">No Tier 1 publications yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Tier 2 Publications */}
          <div>
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Tier 2 Publications</h2>
              <Badge variant="secondary" className="ml-3 bg-blue-100 text-blue-800">
                Regional & Industry
              </Badge>
            </div>
            <div className="grid gap-4">
              {publications
                .filter((pub) => {
                  const analytics = processPublicationAnalytics(pub.id);
                  return analytics && analytics.tierDistribution && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 2'));
                })
                .concat(publications.filter((pub) => {
                  const analytics = processPublicationAnalytics(pub.id);
                  const isTier1 = !analytics && (pub.name.toLowerCase().includes('forbes') || 
                                 pub.name.toLowerCase().includes('wall street') ||
                                 pub.name.toLowerCase().includes('bloomberg') ||
                                 pub.name.toLowerCase().includes('reuters'));
                  return !analytics && !isTier1 && (pub.category === 'Technology' || pub.category === 'Finance');
                }))
                .map((publication) => (
                  <PublicationRow key={publication.id} publication={publication} onViewAnalytics={openAnalyticsModal} onEdit={openEditDialog} onDelete={openDeleteDialog} />
                ))
              }
              {publications.filter((pub) => {
                const analytics = processPublicationAnalytics(pub.id);
                return analytics && analytics.tierDistribution && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 2'));
              }).length === 0 && publications.filter((pub) => {
                const analytics = processPublicationAnalytics(pub.id);
                const isTier1 = !analytics && (pub.name.toLowerCase().includes('forbes') || 
                               pub.name.toLowerCase().includes('wall street') ||
                               pub.name.toLowerCase().includes('bloomberg') ||
                               pub.name.toLowerCase().includes('reuters'));
                return !analytics && !isTier1 && (pub.category === 'Technology' || pub.category === 'Finance');
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  <p className="text-sm">No Tier 2 publications yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Tier 3 Publications */}
          <div>
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Tier 3 Publications</h2>
              <Badge variant="secondary" className="ml-3 bg-purple-100 text-purple-800">
                Niche & Emerging
              </Badge>
            </div>
            <div className="grid gap-4">
              {publications
                .filter((pub) => {
                  const analytics = processPublicationAnalytics(pub.id);
                  const hasT1 = analytics && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 1'));
                  const hasT2 = analytics && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 2'));
                  const isTier1Manual = pub.name.toLowerCase().includes('forbes') || 
                                       pub.name.toLowerCase().includes('wall street') ||
                                       pub.name.toLowerCase().includes('bloomberg') ||
                                       pub.name.toLowerCase().includes('reuters');
                  const isTier2Manual = !isTier1Manual && (pub.category === 'Technology' || pub.category === 'Finance');
                  
                  return (analytics && analytics.tierDistribution && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 3'))) ||
                         (!analytics && !isTier1Manual && !isTier2Manual) ||
                         (analytics && !hasT1 && !hasT2);
                })
                .map((publication) => (
                  <PublicationRow key={publication.id} publication={publication} onViewAnalytics={openAnalyticsModal} onEdit={openEditDialog} onDelete={openDeleteDialog} />
                ))
              }
              {publications.filter((pub) => {
                const analytics = processPublicationAnalytics(pub.id);
                const hasT1 = analytics && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 1'));
                const hasT2 = analytics && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 2'));
                const isTier1Manual = pub.name.toLowerCase().includes('forbes') || 
                                     pub.name.toLowerCase().includes('wall street') ||
                                     pub.name.toLowerCase().includes('bloomberg') ||
                                     pub.name.toLowerCase().includes('reuters');
                const isTier2Manual = !isTier1Manual && (pub.category === 'Technology' || pub.category === 'Finance');
                
                return (analytics && analytics.tierDistribution && Object.keys(analytics.tierDistribution).some(tier => tier.includes('Tier 3'))) ||
                       (!analytics && !isTier1Manual && !isTier2Manual) ||
                       (analytics && !hasT1 && !hasT2);
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  <p className="text-sm">No Tier 3 publications yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-2">No publications found</p>
          <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Add Your First Publication
          </Button>
        </div>
      )}

      {/* Create Publication Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Publication</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new media outlet to the platform.
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
              <div className="space-y-4">
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
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Logo Section */}
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <FormLabel className="text-base font-medium">Publication Logo</FormLabel>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Requirements:</strong> PNG format only, maximum 512x512px, under 2MB file size
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-4">
                    {/* Logo Preview/Upload Area */}
                    {logoPreview ? (
                      <div className="relative">
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="h-32 w-32 object-contain border rounded bg-white p-2"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 w-full"
                          type="button"
                          onClick={() => {
                            setLogoPreview(null);
                            setLogoFile(null);
                            createForm.setValue('logo', '');
                          }}
                        >
                          Remove Logo
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 w-full text-center">
                        <div className="space-y-2">
                          <div className="text-gray-500">Upload a publication logo</div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              // Reset the file input to ensure clean selection
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                              fileInputRef.current?.click();
                            }}
                          >
                            Select File
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <Input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/png"
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                    <input type="hidden" {...createForm.register('logo')} />
                    
                    {isUploading && (
                      <div className="text-sm text-blue-600 flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading logo...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setLogoFile(null);
                    setLogoPreview(null);
                  }}
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Publication</DialogTitle>
            <DialogDescription>
              Update the publication details and logo.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <div className="space-y-4">
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
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Logo Section */}
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <FormLabel className="text-base font-medium">Publication Logo</FormLabel>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Requirements:</strong> PNG format only, maximum 512x512px, under 2MB file size
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-4">
                    {/* Current Logo Display */}
                    {logoPreview ? (
                      <div className="relative">
                        <img 
                          src={logoPreview} 
                          alt="Current logo" 
                          className="h-32 w-32 object-contain border rounded bg-white p-2"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 w-full"
                          type="button"
                          onClick={() => {
                            // Reset the file input to ensure clean selection
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                            fileInputRef.current?.click();
                          }}
                        >
                          Change Logo
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 w-full text-center">
                        <div className="space-y-2">
                          <div className="text-gray-500">No logo uploaded</div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              // Reset the file input to ensure clean selection
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                              fileInputRef.current?.click();
                            }}
                          >
                            Upload Logo
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <Input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/png"
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                    <input type="hidden" {...editForm.register('logo')} />
                    
                    {isUploading && (
                      <div className="text-sm text-blue-600 flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading logo...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setLogoFile(null);
                    setLogoPreview(null);
                  }}
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
      
      {/* Publication Analytics Modal */}
      {isAnalyticsModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          style={{ zIndex: 10000 }}
          onClick={() => setIsAnalyticsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {currentPublication?.name} Analytics
              </h2>
              <button 
                onClick={() => setIsAnalyticsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            {selectedAnalytics ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-900">{selectedAnalytics.totalOpportunities}</div>
                    <div className="text-sm text-blue-700">Opportunities</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-900">{selectedAnalytics.totalPitches}</div>
                    <div className="text-sm text-green-700">Pitches</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-900">${selectedAnalytics.averageBidAmount.toFixed(0)}</div>
                    <div className="text-sm text-purple-700">Avg Bid</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-900">${selectedAnalytics.totalYield.toFixed(0)}</div>
                    <div className="text-sm text-orange-700">Revenue</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2">Performance Summary</h3>
                  <p>Acceptance Rate: {selectedAnalytics.acceptanceRate.toFixed(1)}%</p>
                  <p>Pitches per Opportunity: {selectedAnalytics.pitchesPerOpportunity.toFixed(1)}</p>
                  <p>Last Activity: {selectedAnalytics.lastActivity}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-xl font-semibold mb-2">No Analytics Data Available</div>
                <p className="text-gray-600">
                  This publication doesn't have any historical opportunities or pitches yet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
