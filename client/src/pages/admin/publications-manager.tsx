import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Loader2, Plus, Pencil, Trash, Calendar, DollarSign, 
  TrendingUp, BarChart3, Database, Target, Zap, Activity, X, Search, Filter, Award, Tag, ExternalLink, Edit, Trash2
} from 'lucide-react';
import LogoUniform from '@/components/ui/logo-uniform';

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
  bidTrends: {
    month: string;
    avgBid: number;
    totalBids: number;
  }[];
}

const publicationFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters."
  }),
  logo: z.string().min(1, {
    message: "Logo is required."
  }),
  website: z.string().url({
    message: "Website must be a valid URL."
  }).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  tier: z.string().optional().or(z.literal('')),
});

type PublicationFormValues = z.infer<typeof publicationFormSchema>;

// Publication Row Component
const PublicationRow: React.FC<{
  publication: Publication;
  onViewAnalytics: (pub: Publication) => void;
  onEdit: (pub: Publication) => void;
  onDelete: (pub: Publication) => void;
}> = ({ publication, onViewAnalytics, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl hover:border-gray-300/50 transition-all duration-300 transform hover:-translate-y-1 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6 flex-1">
          {/* Enhanced Publication Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 truncate mb-2">{publication.name}</h3>
            
            <div className="flex items-center space-x-4 mb-3">
              {publication.tier && (
                <Badge 
                  variant="secondary" 
                  className={`
                    px-3 py-1 text-xs font-semibold rounded-full
                    ${publication.tier === 'Tier 1' ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200' : ''}
                    ${publication.tier === 'Tier 2' ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200' : ''}
                    ${publication.tier === 'Tier 3' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' : ''}
                  `}
                >
                  <Award className="w-3 h-3 mr-1" />
                  {publication.tier}
                </Badge>
              )}
              
              {publication.category && (
                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                  <Tag className="w-3 h-3 mr-1" />
                  {publication.category}
                </Badge>
              )}
            </div>
            
            {publication.description && (
              <p className="text-sm text-gray-600 mb-2 truncate max-w-md">{publication.description}</p>
            )}
            
            {publication.website && (
              <a 
                href={publication.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center group"
              >
                <ExternalLink className="w-3 h-3 mr-1 group-hover:translate-x-0.5 transition-transform" />
                {publication.website}
              </a>
            )}
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="flex items-center space-x-3 ml-6">
          <button
            onClick={() => onViewAnalytics(publication)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 group"
          >
            <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Analytics</span>
          </button>
          
          <button
            onClick={() => onEdit(publication)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 group"
          >
            <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Edit</span>
          </button>
          
          <button
            onClick={() => onDelete(publication)}
            className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 group"
          >
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
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
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  // Auto-open create modal if coming from opportunity creation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create') === 'true') {
      setIsCreateDialogOpen(true);
      // Clean up URL without triggering navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

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
      tier: '',
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
      tier: '',
    },
  });

  // Handle logo file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      console.log('File selected:', file.name, file.type, file.size);
      
      // Check file type - only PNG allowed
      if (!file.type.startsWith('image/png')) {
        toast({
          title: "Invalid file type",
          description: "Only PNG format is allowed for publication logos",
          variant: "destructive"
        });
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Check file size - max 2MB
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be less than 2MB in size",
          variant: "destructive"
        });
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
        
        // If all checks pass, set the file and preview
        setLogoFile(file);
        const previewUrl = URL.createObjectURL(file);
        setLogoPreview(previewUrl);
        
        // Update form values for both create and edit forms
        // Use a placeholder value for validation, actual URL will be set after upload
        if (isCreateDialogOpen) {
          createForm.setValue('logo', 'pending-upload', { shouldValidate: true });
        }
        if (isEditDialogOpen) {
          editForm.setValue('logo', 'pending-upload', { shouldValidate: true });
        }
        
        console.log('Logo file ready for upload:', file.name);
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
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      
      img.src = URL.createObjectURL(file);
    }
  };

  // Upload logo file and get URL
  const uploadLogo = async (file: File): Promise<string> => {
    setIsUploading(true);
    console.log('Starting logo upload for file:', file.name);
    
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      console.log('Sending upload request...');
      const response = await apiFetch('/api/upload/publication-logo', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Upload successful, received data:', data);
      
      if (!data.fileUrl) {
        throw new Error('No file URL returned from server');
      }
      
      return data.fileUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUploading(false);
      console.log('Upload process completed');
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
    console.log('Create form submitted with values:', values);
    console.log('Logo file:', logoFile);
    console.log('Logo preview:', logoPreview);
    
    try {
      if (!logoFile && !logoPreview) {
        toast({
          title: "Logo required",
          description: "Please upload a logo image for the publication.",
          variant: "destructive",
        });
        return;
      }
      
      let logoUrl = '';
      
      if (logoFile) {
        console.log('Uploading new logo file...');
        logoUrl = await uploadLogo(logoFile);
        console.log('Logo uploaded successfully:', logoUrl);
      } else if (logoPreview && !logoPreview.startsWith('blob:')) {
        logoUrl = logoPreview;
      } else {
        toast({
          title: "Logo upload required",
          description: "Please wait for the logo to be uploaded before saving.",
          variant: "destructive",
        });
        return;
      }
      
      const createData = {
        name: values.name,
        website: values.website || '',
        category: values.category || '',
        description: values.description || '',
        logo: logoUrl,
        tier: values.tier || '',
      };
      
      console.log('Creating publication with data:', createData);
      
      await createMutation.mutateAsync(createData);
    } catch (error) {
      console.error('Error creating publication:', error);
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Failed to create publication. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle updating a publication
  const onEditSubmit = async (values: PublicationFormValues) => {
    if (!currentPublication) return;
    
    console.log('Edit form submitted with values:', values);
    console.log('Logo file:', logoFile);
    console.log('Logo preview:', logoPreview);
    
    try {
      let logoUrl = currentPublication.logo; // Default to existing logo
      
      // If user uploaded a new logo file, upload it first
      if (logoFile) {
        console.log('Uploading new logo file...');
        logoUrl = await uploadLogo(logoFile);
        console.log('New logo uploaded successfully:', logoUrl);
      } else if (values.logo && values.logo !== currentPublication.logo && !values.logo.startsWith('blob:')) {
        // If logo value changed but no file uploaded and it's not a blob URL
        logoUrl = values.logo;
      }
      
      const updateData = {
        name: values.name,
        website: values.website || '',
        category: values.category || '',
        description: values.description || '',
        logo: logoUrl,
        tier: values.tier || '',
      };
      
      console.log('Updating publication with data:', updateData);
      
      await updateMutation.mutateAsync({
        id: currentPublication.id,
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating publication:', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update publication. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Open edit dialog and populate form
  const openEditDialog = (publication: Publication) => {
    console.log('Opening edit dialog for publication:', publication);
    
    setCurrentPublication(publication);
    
    const formData = {
      name: publication.name,
      logo: publication.logo,
      website: publication.website || '',
      description: publication.description || '',
      category: publication.category || '',
      tier: publication.tier || '',
    };
    
    console.log('Setting form data:', formData);
    
    editForm.reset(formData);
    
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

  // Calculate stats
  const stats = {
    totalPublications: publications?.length || 0,
    categories: Array.from(new Set(publications?.map(p => p.category).filter(Boolean))).length || 0,
    activePublications: publications?.filter(p => p.website).length || 0
  };

  // Filter publications based on search term and selected tier
  const filteredPublications = publications?.filter(pub => {
    const matchesSearch = searchTerm === '' || 
      pub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.website?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Tier filtering now works since tier field exists in database
    const matchesTier = selectedTier === 'all' || pub.tier === selectedTier;
    
    return matchesSearch && matchesTier;
  }) || [];

  if (isLoading || isLoadingAnalytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-gray-600 font-medium">Loading publications...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load publications</h3>
                <p className="text-red-600">Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Header Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Publications Manager
                </span>
              </h1>
              <p className="text-gray-600 text-lg">
                Manage media outlets and track historical performance data
              </p>
            </div>
            <button 
              onClick={() => {
                createForm.reset(); 
                setLogoFile(null);
                setLogoPreview(null);
                setIsCreateDialogOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              Add Publication
            </button>
          </div>

          {/* Search and Filter Section */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search publications by name, category, or website..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                />
              </div>
              
              {/* Tier Filter */}
              <div className="sm:w-48">
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                    <Filter className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Filter by tier" />
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
                Found {filteredPublications.length} publication{filteredPublications.length === 1 ? '' : 's'} matching "{searchTerm}"
              </div>
            )}
          </div>
          
          {/* Enhanced Stats Row */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">Total Publications</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalPublications}</p>
                </div>
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-1">Categories</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.categories}</p>
                </div>
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">Active Sites</p>
                  <p className="text-2xl font-bold text-green-900">{stats.activePublications}</p>
                </div>
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Publications Grid */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          {filteredPublications && filteredPublications.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredPublications.map((publication, index) => (
                <div key={publication.id} className={`${index === 0 ? 'rounded-t-2xl' : ''} ${index === filteredPublications.length - 1 ? 'rounded-b-2xl' : ''}`}>
                  <PublicationRow 
                    publication={publication} 
                    onViewAnalytics={openAnalyticsModal} 
                    onEdit={openEditDialog} 
                    onDelete={openDeleteDialog} 
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <Database className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {searchTerm ? 'No publications found' : 'No publications found'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchTerm ? 
                  `No publications match your search criteria "${searchTerm}".` :
                  'Get started by adding your first media publication to the platform.'
                }
              </p>
              {!searchTerm && (
                <button 
                  onClick={() => setIsCreateDialogOpen(true)} 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-5 w-5" />
                  Add Your First Publication
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create Publication Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-2xl">
            <DialogHeader className="pb-6 border-b border-gray-200/50">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Add New Publication
              </DialogTitle>
              <DialogDescription className="text-gray-600">
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
                        <FormLabel className="font-semibold text-gray-900">Name*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Forbes, TechCrunch" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg" 
                            {...field} 
                          />
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
                        <FormLabel className="font-semibold text-gray-900">Website</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg" 
                            {...field} 
                          />
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
                        <FormLabel className="font-semibold text-gray-900">Category</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Technology, Finance" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-gray-900">Publication Tier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Tier 1">Tier 1 - Premium Publications</SelectItem>
                            <SelectItem value="Tier 2">Tier 2 - Standard Publications</SelectItem>
                            <SelectItem value="Tier 3">Tier 3 - Basic Publications</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-gray-900">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the publication" 
                            className="resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Enhanced Logo Section */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900">
                      Logo*
                    </label>
                    
                    {logoPreview ? (
                      <div className="relative">
                        <div className="border-2 border-green-200 bg-green-50 rounded-xl p-6 text-center">
                          <div className="flex items-center justify-center space-x-4">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg blur opacity-30"></div>
                              <div className="relative bg-white p-2 rounded-lg border border-green-200 shadow-sm">
                                <img src={logoPreview} alt="Logo preview" className="h-12 w-auto" />
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-semibold text-green-800">Logo uploaded successfully!</div>
                              <div className="text-xs text-green-600">Ready to save publication</div>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className="mt-4 text-sm text-green-700 hover:text-green-800 font-medium"
                            onClick={() => {
                              setLogoPreview(null);
                              setLogoFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                          >
                            Change Logo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 w-full text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                            <Database className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="text-gray-700 font-medium">Upload a publication logo</div>
                          <button 
                            type="button" 
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                            onClick={() => {
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                              fileInputRef.current?.click();
                            }}
                          >
                            Select File
                          </button>
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
                      <div className="text-sm text-blue-600 flex items-center justify-center bg-blue-50 p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading logo...
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter className="border-t border-gray-200/50 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || isUploading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-2xl">
            <DialogHeader className="pb-6 border-b border-gray-200/50">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Edit Publication
              </DialogTitle>
              <DialogDescription className="text-gray-600">
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
                        <FormLabel className="font-semibold text-gray-900">Name*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Forbes, TechCrunch" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg" 
                            {...field} 
                          />
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
                        <FormLabel className="font-semibold text-gray-900">Website</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg" 
                            {...field} 
                          />
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
                        <FormLabel className="font-semibold text-gray-900">Category</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Technology, Finance" 
                            className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-gray-900">Publication Tier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Tier 1">Tier 1 - Premium Publications</SelectItem>
                            <SelectItem value="Tier 2">Tier 2 - Standard Publications</SelectItem>
                            <SelectItem value="Tier 3">Tier 3 - Basic Publications</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-gray-900">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the publication" 
                            className="resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Enhanced Logo Section for Edit */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900">
                      Logo*
                    </label>
                    
                    {logoPreview ? (
                      <div className="relative">
                        <div className="border-2 border-green-200 bg-green-50 rounded-xl p-6 text-center">
                          <div className="flex items-center justify-center space-x-4">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg blur opacity-30"></div>
                              <div className="relative bg-white p-2 rounded-lg border border-green-200 shadow-sm">
                                <img src={logoPreview} alt="Logo preview" className="h-12 w-auto" />
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-semibold text-green-800">Current logo</div>
                              <div className="text-xs text-green-600">Click to change</div>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className="mt-4 text-sm text-green-700 hover:text-green-800 font-medium"
                            onClick={() => {
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                              fileInputRef.current?.click();
                            }}
                          >
                            Change Logo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 w-full text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                            <Database className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="text-gray-700 font-medium">Upload a publication logo</div>
                          <button 
                            type="button" 
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                            onClick={() => {
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                              fileInputRef.current?.click();
                            }}
                          >
                            Select File
                          </button>
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
                      <div className="text-sm text-blue-600 flex items-center justify-center bg-blue-50 p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading logo...
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter className="border-t border-gray-200/50 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      console.log('Cancel button clicked');
                      setIsEditDialogOpen(false);
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending || isUploading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    onClick={() => {
                      console.log('Update button clicked');
                      console.log('Form is valid:', editForm.formState.isValid);
                      console.log('Form errors:', editForm.formState.errors);
                      console.log('Update mutation pending:', updateMutation.isPending);
                      console.log('Is uploading:', isUploading);
                    }}
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

        {/* Enhanced Delete Confirmation Dialog */}
        <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-white to-red-50/50 border-0 shadow-2xl">
            <DialogHeader className="pb-6 border-b border-red-200/50">
              <DialogTitle className="text-xl font-bold text-red-900">
                Confirm Deletion
              </DialogTitle>
              <DialogDescription className="text-red-700">
                Are you sure you want to delete <strong>{currentPublication?.name}</strong>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="border-t border-red-200/50 pt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Publication
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Enhanced Publication Analytics Modal */}
        {isAnalyticsModalOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
            style={{ zIndex: 10000 }}
            onClick={() => setIsAnalyticsModalOpen(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto border-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {currentPublication?.name} Analytics
                    </h2>
                    <p className="text-blue-100 mt-1">Performance insights and metrics</p>
                  </div>
                  <button 
                    onClick={() => setIsAnalyticsModalOpen(false)}
                    className="text-white hover:text-gray-200 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-all duration-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {selectedAnalytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Analytics cards would go here - keeping existing analytics content */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-700 font-medium">Total Opportunities</span>
                        <Target className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-blue-900">{selectedAnalytics.totalOpportunities}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-700 font-medium">Total Pitches</span>
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-900">{selectedAnalytics.totalPitches}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-700 font-medium">Acceptance Rate</span>
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold text-purple-900">{selectedAnalytics.acceptanceRate.toFixed(1)}%</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-10 w-10 text-gray-500" />
                    </div>
                    <div className="text-xl font-semibold mb-2 text-gray-900">No Analytics Data Available</div>
                    <p className="text-gray-600">
                      This publication doesn't have any historical opportunities or pitches yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
