import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Loader2, 
  ExternalLink, 
  FileText, 
  Clock, 
  X, 
  Check, 
  AlertCircle, 
  Edit, 
  Save, 
  Search,
  Target,
  Award,
  Eye,
  Plus,
  ChevronRight,
  Calendar,
  DollarSign
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import PitchEditModal from "@/components/pitch-edit-modal";
import PitchReviewModal from "@/components/pitch-review-modal";
import { getStage, PitchStatus } from "@/utils/pitchStage";
import { PitchDTO } from "@/utils/pitchInterfaces";
import { useLocation } from "wouter";

// Types for pitches
interface Publication {
  id: number;
  name: string;
  logo?: string;
}

interface Opportunity {
  id: number;
  title: string;
  publicationId: number;
  outlet?: string;
  publication?: Publication;
}

interface Pitch {
  id: number;
  userId: number;
  opportunityId: number;
  content: string;
  bidAmount: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string;
  paymentIntentId?: string | null;
  article?: {
    title?: string;
    url: string;
  };
  opportunity?: Opportunity;
  publication?: Publication;
  isDraft?: boolean;
  pitchType?: string;
}

// Status configuration
const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'Under Review', color: 'text-blue-600 bg-blue-50', icon: Clock };
    case 'sent':
    case 'sent_to_reporter':
      return { label: 'Sent to Reporter', color: 'text-blue-600 bg-blue-50', icon: Target };
    case 'interested':
    case 'reporter_interested':
      return { label: 'Reporter Interested', color: 'text-purple-600 bg-purple-50', icon: Eye };
    case 'successful':
    case 'successful_coverage':
      return { label: 'Published', color: 'text-green-600 bg-green-50', icon: Award };
    case 'not_interested':
      return { label: 'Not Selected', color: 'text-red-600 bg-red-50', icon: X };
    case 'draft':
      return { label: 'Draft', color: 'text-amber-600 bg-amber-50', icon: Save };
    default:
      return { label: 'Under Review', color: 'text-blue-600 bg-blue-50', icon: Clock };
  }
};

// Format date helper
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "MMM d");
  } catch (e) {
    return "";
  }
};

export default function MyPitches() {
  const { user } = useAuth();
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  // Fetch user's submitted pitches
  const { data: pitches, isLoading: isPitchesLoading, error: pitchesError } = useQuery({
    queryKey: [`/api/users/${user?.id}/pitches`],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/users/${user.id}/pitches`);
      const data = await res.json();
      return data || [];
    },
    enabled: !!user?.id,
  });
  
  // Fetch user's draft pitches
  const { data: drafts, isLoading: isDraftsLoading, error: draftsError } = useQuery({
    queryKey: [`/api/users/${user?.id}/drafts`],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/users/${user.id}/drafts`);
      const data = await res.json();
      return data.map((draft: any) => ({ ...draft, isDraft: true })) || [];
    },
    enabled: !!user?.id,
  });

  // Process and combine pitches
  const allPitches = useMemo(() => {
    const processedPitches = (pitches || []).map((pitch: any) => {
      const actualStage = getStage({
        id: pitch.id,
        userId: pitch.userId,
        content: pitch.content,
        status: pitch.status as PitchStatus,
        bidAmount: pitch.bidAmount,
        createdAt: pitch.createdAt,
        updatedAt: pitch.updatedAt,
        opportunityId: pitch.opportunityId,
        isDraft: pitch.isDraft,
        paymentIntentId: pitch.paymentIntentId,
        opportunity: pitch.opportunity
      });
      
      return {
        ...pitch,
        isDraft: actualStage === 'draft'
      };
    });
    
    const processedDrafts = (drafts || []).filter((draft: any) => {
      return !processedPitches.some((pitch: any) => pitch.id === draft.id);
    });
    
    return [
      ...processedPitches,
      ...processedDrafts.map((draft: any) => ({ ...draft, isDraft: true }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pitches, drafts]);

  // Filter pitches based on search
  const filteredPitches = useMemo(() => {
    if (!searchQuery) return allPitches;
    
    return allPitches.filter(pitch => 
      pitch.opportunity?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pitch.opportunity?.publication?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pitch.opportunity?.outlet?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allPitches, searchQuery]);

  // Calculate simple stats
  const stats = useMemo(() => {
    const submitted = allPitches.filter(p => !p.isDraft).length;
    const published = allPitches.filter(p => ['successful', 'successful_coverage'].includes(p.status)).length;
    const drafts = allPitches.filter(p => p.isDraft).length;
    return { submitted, published, drafts };
  }, [allPitches]);

  const isLoading = isPitchesLoading || isDraftsLoading;
  const hasError = pitchesError || draftsError;

  // Modal handlers
  const handleEditPitch = (pitch: Pitch) => {
    setSelectedPitch(pitch);
    setIsEditModalOpen(true);
  };
  
  const handleReviewPitch = (pitch: Pitch) => {
    setSelectedPitch(pitch);
    setIsReviewModalOpen(true);
  };
  
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedPitch(null);
  };
  
  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedPitch(null);
  };

  // Convert Pitch to PitchDTO for modals
  const convertToPitchDTO = (pitch: Pitch): PitchDTO => {
    return {
      id: pitch.id,
      content: pitch.content,
      status: pitch.status as PitchStatus,
      bidAmount: pitch.bidAmount,
      createdAt: pitch.createdAt,
      updatedAt: pitch.updatedAt,
      opportunityId: pitch.opportunityId,
      isDraft: pitch.isDraft,
      paymentIntentId: pitch.paymentIntentId,
      opportunity: pitch.opportunity ? {
        id: pitch.opportunity.id,
        title: pitch.opportunity.title,
        publicationId: pitch.opportunity.publicationId,
        outlet: pitch.opportunity.outlet,
        publication: pitch.opportunity.publication
      } : undefined,
      article: pitch.article,
      userId: pitch.userId
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading your pitches...</span>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <h3 className="font-medium text-red-800">Unable to load your pitches</h3>
              <p className="text-red-700 text-sm mt-1">Please try refreshing the page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">My Pitches</h1>
        
        {/* Simple Stats Row */}
        <div className="flex items-center space-x-5 text-sm text-gray-600 mb-5">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <span className="font-medium">{stats.submitted} submitted</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="font-medium">{stats.published} published</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
            <span className="font-medium">{stats.drafts} drafts</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search your pitches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <button 
            onClick={() => setLocation('/opportunities')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 text-sm"
          >
            <ChevronRight className="h-4 w-4" />
            Browse Opportunities
          </button>
        </div>
      </div>

      {/* Content */}
      {allPitches.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to start pitching?</h3>
          <p className="text-gray-600 mb-6">
            Browse opportunities and submit your first pitch to get published.
          </p>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/opportunities">
              <Target className="h-4 w-4 mr-2" />
              Browse Opportunities
            </Link>
          </Button>
        </div>
      ) : filteredPitches.length === 0 ? (
        <div className="text-center py-8">
          <Search className="h-8 w-8 mx-auto text-gray-300 mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">No pitches found</h3>
          <p className="text-gray-600 text-sm mb-4">
            Try different search terms or clear the search.
          </p>
          <Button onClick={() => setSearchQuery("")} variant="outline" size="sm">
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPitches.map((pitch) => {
            const statusDisplay = getStatusDisplay(pitch.status);
            const StatusIcon = statusDisplay.icon;
            const createdDate = formatDate(pitch.createdAt);
            
            return (
              <div key={pitch.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  {/* Left: Title and Publication */}
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate text-base max-w-sm md:max-w-md lg:max-w-lg">
                        {pitch.opportunity?.title || `Pitch #${pitch.id}`}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusDisplay.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1.5" />
                        {statusDisplay.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="font-medium">{pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Unknown Publication"}</span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1.5" />
                        {createdDate}
                      </span>
                      {pitch.bidAmount && !pitch.isDraft && (
                        <span className="flex items-center font-medium text-gray-700">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {pitch.bidAmount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2">
                    {pitch.isDraft ? (
                      <Button size="sm" onClick={() => handleEditPitch(pitch)} className="bg-blue-600 hover:bg-blue-700 px-3">
                        <Edit className="h-3 w-3 mr-1.5" />
                        Continue
                      </Button>
                    ) : (
                      <>
                        {['pending'].includes(pitch.status) && (
                          <Button size="sm" variant="outline" onClick={() => handleEditPitch(pitch)} className="px-3">
                            <Edit className="h-3 w-3 mr-1.5" />
                            Edit
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleReviewPitch(pitch)} className="px-3">
                          <Eye className="h-3 w-3 mr-1.5" />
                          Details
                        </Button>
                        {pitch.article?.url && (
                          <Button size="sm" asChild className="bg-green-600 hover:bg-green-700 px-3">
                            <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1.5" />
                              Article
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleReviewPitch(pitch)} className="p-2">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Admin Notes */}
                {pitch.adminNotes && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800 leading-relaxed">
                      <span className="font-semibold">Publisher: </span>
                      {pitch.adminNotes}
                    </p>
                  </div>
                )}

                {/* Published Article */}
                {pitch.article && ['successful', 'successful_coverage'].includes(pitch.status) && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Award className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm font-semibold text-green-800">Published Article</span>
                      </div>
                      <a 
                        href={pitch.article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-green-700 hover:text-green-800 flex items-center font-medium"
                      >
                        Read Article <ExternalLink className="h-3 w-3 ml-1.5" />
                      </a>
                    </div>
                    {pitch.article.title && (
                      <p className="text-sm text-green-700 mt-2 truncate font-medium">{pitch.article.title}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedPitch && (
        <>
          <PitchEditModal 
            isOpen={isEditModalOpen} 
            onClose={closeEditModal} 
            pitch={convertToPitchDTO(selectedPitch)}
          />
          
          <PitchReviewModal 
            isOpen={isReviewModalOpen} 
            onClose={closeReviewModal} 
            pitch={convertToPitchDTO(selectedPitch)}
          />
        </>
      )}
    </div>
  );
}
