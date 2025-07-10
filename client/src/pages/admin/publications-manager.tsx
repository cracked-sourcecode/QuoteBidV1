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
  }).refine((val) => val === 'pending-upload' || val.startsWith('http'), {
    message: "Logo must be a valid URL."
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
const PublicationCard: React.FC<{
  publication: Publication;
  onViewAnalytics: (pub: Publication) => void;
  onEdit: (pub: Publication) => void;
  onDelete: (pub: Publication) => void;
}> = ({ publication, onViewAnalytics, onEdit, onDelete }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors rounded-lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {publication.logo ? (
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-sm">
                <img 
                  src={publication.logo} 
                  alt={publication.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-slate-300" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-white text-base">
                {publication.name}
              </h3>
              {publication.category && (
                <p className="text-sm text-slate-400">{publication.category}</p>
              )}
            </div>
          </div>
          
              {publication.tier && (
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              publication.tier === 'Tier 1' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30' : 
              publication.tier === 'Tier 2' ? 'bg-blue-900/30 text-blue-400 border border-blue-700/30' : 
              'bg-green-900/30 text-green-400 border border-green-700/30'
            }`}>
                  {publication.tier}
            </span>
              )}
            </div>
            
        {/* Description */}
            {publication.description && (
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
            {publication.description}
          </p>
            )}
            
        {/* Website */}
            {publication.website && (
          <div className="mb-6">
              <a 
                href={publication.website}
                target="_blank"
                rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center group"
              >
              <ExternalLink className="w-4 h-4 mr-2" />
              <span className="truncate">{publication.website}</span>
              </a>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-slate-700">
          <div className="flex space-x-2">
          <button
            onClick={() => onViewAnalytics(publication)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
              Analytics
          </button>
          
          <button
            onClick={() => onEdit(publication)}
              className="px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-md text-sm font-medium transition-colors"
          >
              Edit
          </button>
          
          <button
            onClick={() => onDelete(publication)}
              className="px-4 py-2 border border-red-800 hover:border-red-700 text-red-400 hover:text-red-300 rounded-md text-sm font-medium transition-colors"
          >
              Delete
          </button>
          </div>
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
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
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
    // Disable caching and refetch frequently to show new publications immediately
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true
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
    mode: 'onChange',
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
        const fileInput = isCreateDialogOpen ? createFileInputRef.current : editFileInputRef.current;
        if (fileInput) {
          fileInput.value = '';
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
        const fileInput = isCreateDialogOpen ? createFileInputRef.current : editFileInputRef.current;
        if (fileInput) {
          fileInput.value = '';
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
          const fileInput = isCreateDialogOpen ? createFileInputRef.current : editFileInputRef.current;
          if (fileInput) {
            fileInput.value = '';
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
        const fileInput = isCreateDialogOpen ? createFileInputRef.current : editFileInputRef.current;
        if (fileInput) {
          fileInput.value = '';
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
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <span className="text-slate-300 font-medium">Loading publications...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-red-400/30 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to load publications</h3>
                <p className="text-red-400">Please try again later.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="min-h-[calc(100vh-32px)] bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 rounded-3xl border border-white/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Header Section */}
        <div className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">
                  Publications Manager
                </span>
              </h1>
              <p className="text-slate-300 text-lg">
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
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  placeholder="Search publications by name, category, or website..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors"
                />
              </div>
              
              {/* Tier Filter */}
              <div className="sm:w-56">
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className="bg-slate-700/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white rounded-lg transition-colors">
                    <div className="flex items-center w-full">
                      <Filter className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                    <SelectValue placeholder="Filter by tier" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border border-white/20 text-white rounded-xl">
                    <SelectItem value="all" className="focus:bg-slate-700 focus:text-white">All Tiers</SelectItem>
                    <SelectItem value="Tier 1" className="focus:bg-slate-700 focus:text-white">
                      <div className="flex items-center w-full">
                        <span className="w-3 h-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mr-3 flex-shrink-0"></span>
                        <span className="truncate">Tier 1 - Premium</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Tier 2" className="focus:bg-slate-700 focus:text-white">
                      <div className="flex items-center w-full">
                        <span className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mr-3 flex-shrink-0"></span>
                        <span className="truncate">Tier 2 - Standard</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Tier 3" className="focus:bg-slate-700 focus:text-white">
                      <div className="flex items-center w-full">
                        <span className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mr-3 flex-shrink-0"></span>
                        <span className="truncate">Tier 3 - Basic</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Results Counter */}
            {searchTerm && (
              <div className="mt-4 text-sm text-slate-300">
                Found {filteredPublications.length} publication{filteredPublications.length === 1 ? '' : 's'} matching "{searchTerm}"
              </div>
            )}
          </div>
          
          {/* Enhanced Stats Row */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-4 border border-blue-400/20 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-300 mb-1">Total Publications</p>
                  <p className="text-2xl font-bold text-white">{stats.totalPublications}</p>
                </div>
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-4 border border-purple-400/20 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-300 mb-1">Categories</p>
                  <p className="text-2xl font-bold text-white">{stats.categories}</p>
                </div>
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-4 border border-green-400/20 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-300 mb-1">Active Sites</p>
                  <p className="text-2xl font-bold text-white">{stats.activePublications}</p>
                </div>
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Publications Grid */}
        <div>
          {filteredPublications && filteredPublications.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPublications.map((publication) => (
                <PublicationCard 
                  key={publication.id}
                    publication={publication} 
                    onViewAnalytics={openAnalyticsModal} 
                    onEdit={openEditDialog} 
                    onDelete={openDeleteDialog} 
                  />
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
            <div className="text-center py-16 px-6">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-700/50 to-slate-600/50 rounded-2xl flex items-center justify-center border border-white/10">
                  <Database className="h-12 w-12 text-slate-400" />
              </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                {searchTerm ? 'No publications found' : 'No publications found'}
              </h3>
                <p className="text-slate-300 mb-8 max-w-md mx-auto">
                {searchTerm ? 
                  `No publications match your search criteria "${searchTerm}".` :
                  'Get started by adding your first media publication to the platform.'
                }
              </p>
              {!searchTerm && (
                <button 
                  onClick={() => setIsCreateDialogOpen(true)} 
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-5 w-5" />
                  Add Your First Publication
                </button>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Create Publication Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-lg border border-white/20 text-white shadow-2xl rounded-3xl">
            <DialogHeader className="pb-6 border-b border-white/10">
              <DialogTitle className="text-2xl font-bold text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                Add New Publication
              </DialogTitle>
              <DialogDescription className="text-slate-300">
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
                        <FormLabel className="font-semibold text-white">Name*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Forbes, TechCrunch" 
                            className="bg-slate-800/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors" 
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
                        <FormLabel className="font-semibold text-white">Website</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com" 
                            className="bg-slate-800/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors" 
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
                        <FormLabel className="font-semibold text-white">Category</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Technology, Finance" 
                            className="bg-slate-800/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors" 
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
                        <FormLabel className="font-semibold text-white">Publication Tier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white rounded-lg">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border border-white/20 text-white">
                            <SelectItem value="Tier 1" className="focus:bg-slate-700 focus:text-white">Tier 1 - Premium Publications</SelectItem>
                            <SelectItem value="Tier 2" className="focus:bg-slate-700 focus:text-white">Tier 2 - Standard Publications</SelectItem>
                            <SelectItem value="Tier 3" className="focus:bg-slate-700 focus:text-white">Tier 3 - Basic Publications</SelectItem>
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
                        <FormLabel className="font-semibold text-white">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the publication" 
                            className="resize-none bg-slate-800/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors" 
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
                    <label className="block text-sm font-semibold text-white">
                      Logo*
                    </label>
                    
                    {logoPreview ? (
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-2">
                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                              </div>
                          <div>
                            <div className="text-sm font-medium text-white">Logo uploaded successfully</div>
                            <div className="text-xs text-slate-400">Ready to save publication</div>
                            </div>
                          </div>
                          <button 
                            type="button" 
                          className="mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium"
                            onClick={() => {
                              setLogoPreview(null);
                              setLogoFile(null);
                              if (createFileInputRef.current) {
                                createFileInputRef.current.value = '';
                              }
                            }}
                          >
                            Change Logo
                          </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center bg-slate-800 hover:bg-slate-700 transition-colors">
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mx-auto">
                            <Database className="h-6 w-6 text-slate-400" />
                          </div>
                          <div className="text-slate-300 font-medium">Upload a publication logo</div>
                          <button 
                            type="button" 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                            onClick={() => {
                              if (createFileInputRef.current) {
                                createFileInputRef.current.value = '';
                              }
                              createFileInputRef.current?.click();
                            }}
                          >
                            Select File
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <Input 
                      ref={createFileInputRef}
                      type="file" 
                      accept="image/png"
                      className="hidden" 
                      onChange={(e) => {
                        // Clear any existing file selection and process the new one
                        if (createFileInputRef.current && e.target.files?.[0]) {
                          handleFileChange(e);
                        }
                      }}
                    />
                    <input type="hidden" {...createForm.register('logo')} />
                    
                    {isUploading && (
                      <div className="text-sm text-blue-300 flex items-center justify-center bg-blue-500/10 border border-blue-400/30 p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading logo...
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter className="border-t border-white/10 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="bg-slate-800/50 border-2 border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 font-semibold transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || isUploading}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-lg border border-white/20 text-white shadow-2xl rounded-3xl">
            <DialogHeader className="pb-6 border-b border-white/10">
              <DialogTitle className="text-2xl font-bold text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <Edit className="h-5 w-5 text-white" />
                </div>
                Edit Publication
              </DialogTitle>
              <DialogDescription className="text-slate-300">
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
                        <FormLabel className="font-semibold text-white">Name*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Forbes, TechCrunch" 
                            className="bg-slate-800/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors" 
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
                        <FormLabel className="font-semibold text-white">Website</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com" 
                            className="bg-slate-800/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors" 
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
                        <FormLabel className="font-semibold text-white">Category</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Technology, Finance" 
                            className="bg-slate-800/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors" 
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
                        <FormLabel className="font-semibold text-white">Publication Tier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white rounded-lg">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border border-white/20 text-white">
                            <SelectItem value="Tier 1" className="focus:bg-slate-700 focus:text-white">Tier 1 - Premium Publications</SelectItem>
                            <SelectItem value="Tier 2" className="focus:bg-slate-700 focus:text-white">Tier 2 - Standard Publications</SelectItem>
                            <SelectItem value="Tier 3" className="focus:bg-slate-700 focus:text-white">Tier 3 - Basic Publications</SelectItem>
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
                        <FormLabel className="font-semibold text-white">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the publication" 
                            className="resize-none bg-slate-800/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors" 
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
                    <label className="block text-sm font-semibold text-white">
                      Logo*
                    </label>
                    
                    {logoPreview ? (
                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-2">
                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                              </div>
                          <div>
                            <div className="text-sm font-medium text-white">Current logo</div>
                            <div className="text-xs text-slate-400">Click to change</div>
                            </div>
                          </div>
                          <button 
                            type="button" 
                          className="mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium"
                            onClick={() => {
                              if (editFileInputRef.current) {
                                editFileInputRef.current.value = '';
                              }
                              editFileInputRef.current?.click();
                            }}
                          >
                            Change Logo
                          </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center bg-slate-800 hover:bg-slate-700 transition-colors">
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mx-auto">
                            <Database className="h-6 w-6 text-slate-400" />
                          </div>
                          <div className="text-slate-300 font-medium">Upload a publication logo</div>
                          <button 
                            type="button" 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                            onClick={() => {
                              if (editFileInputRef.current) {
                                editFileInputRef.current.value = '';
                              }
                              editFileInputRef.current?.click();
                            }}
                          >
                            Select File
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <Input 
                      ref={editFileInputRef}
                      type="file" 
                      accept="image/png"
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                    <input type="hidden" {...editForm.register('logo')} />
                    
                    {isUploading && (
                      <div className="text-sm text-blue-300 flex items-center justify-center bg-blue-500/10 border border-blue-400/30 p-3 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading logo...
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter className="border-t border-white/10 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      console.log('Cancel button clicked');
                      setIsEditDialogOpen(false);
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="bg-slate-800/50 border-2 border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 font-semibold transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending || isUploading}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
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
          <DialogContent className="sm:max-w-[425px] bg-slate-900/95 backdrop-blur-lg border border-white/20 text-white shadow-2xl rounded-3xl">
            <DialogHeader className="pb-6 border-b border-white/10">
              <DialogTitle className="text-xl font-bold text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                Confirm Deletion
              </DialogTitle>
              <DialogDescription className="text-red-300">
                Are you sure you want to delete <strong className="text-red-200">{currentPublication?.name}</strong>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="border-t border-white/10 pt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="bg-slate-800/50 border-2 border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 font-semibold transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
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
              className="bg-slate-900/95 backdrop-blur-lg rounded-3xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {currentPublication?.name} Analytics
                    </h2>
                    <p className="text-amber-100 mt-1">Performance insights and metrics</p>
                  </div>
                  <button 
                    onClick={() => setIsAnalyticsModalOpen(false)}
                    className="text-white hover:text-amber-100 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-all duration-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {selectedAnalytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Analytics cards would go here - keeping existing analytics content */}
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-4 border border-blue-400/20 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 font-medium">Total Opportunities</span>
                        <Target className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-white">{selectedAnalytics.totalOpportunities}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-4 border border-green-400/20 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-300 font-medium">Total Pitches</span>
                        <Zap className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="text-2xl font-bold text-white">{selectedAnalytics.totalPitches}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-4 border border-purple-400/20 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-300 font-medium">Acceptance Rate</span>
                        <TrendingUp className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold text-white">{selectedAnalytics.acceptanceRate.toFixed(1)}%</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-700/50 to-slate-600/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                      <BarChart3 className="h-10 w-10 text-slate-400" />
                    </div>
                    <div className="text-xl font-semibold mb-2 text-white">No Analytics Data Available</div>
                    <p className="text-slate-300">
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
    </div>
  );
}
