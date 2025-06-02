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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">My Pitches</h1>
              <p className="text-gray-600 text-sm">Track your submissions and view published articles</p>
            </div>
            <button 
              onClick={() => setLocation('/opportunities')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              Browse Opportunities
            </button>
          </div>
          
          {/* Enhanced Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1">Submitted</p>
                  <p className="text-xl font-bold text-blue-900">{stats.submitted}</p>
                </div>
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-3 border border-green-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">Published</p>
                  <p className="text-xl font-bold text-green-900">{stats.published}</p>
                </div>
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Award className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-3 border border-amber-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">Drafts</p>
                  <p className="text-xl font-bold text-amber-900">{stats.drafts}</p>
                </div>
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Save className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search your pitches by title, publication, or outlet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50/50 hover:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          {allPitches.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <FileText className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to start pitching?</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm">
                Browse opportunities and submit your first pitch to get published by top media outlets.
              </p>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                <Link href="/opportunities">
                  <Target className="h-4 w-4 mr-2" />
                  Browse Opportunities
                </Link>
              </Button>
            </div>
          ) : filteredPitches.length === 0 ? (
            <div className="text-center py-10 px-6">
              <div className="w-14 h-14 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                <Search className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No pitches found</h3>
              <p className="text-gray-600 text-sm mb-4">
                Try different search terms or clear the search to see all your pitches.
              </p>
              <Button onClick={() => setSearchQuery("")} variant="outline" className="rounded-lg px-4 py-2">
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPitches.map((pitch, index) => {
                const statusDisplay = getStatusDisplay(pitch.status);
                const StatusIcon = statusDisplay.icon;
                const createdDate = formatDate(pitch.createdAt);
                
                return (
                  <div key={pitch.id} className={`p-4 hover:bg-gray-50/50 transition-all duration-200 ${index === 0 ? 'rounded-t-2xl' : ''} ${index === filteredPitches.length - 1 ? 'rounded-b-2xl' : ''}`}>
                    <div className="flex items-center justify-between">
                      {/* Left: Title and Publication */}
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900 max-w-xl truncate">
                            {pitch.opportunity?.title || `Pitch #${pitch.id}`}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusDisplay.color} shadow-sm`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusDisplay.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="font-medium text-gray-700 text-sm">
                            {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Unknown Publication"}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {createdDate}
                          </span>
                          {pitch.bidAmount && !pitch.isDraft && (
                            <span className="flex items-center font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-lg text-xs">
                              <DollarSign className="h-3 w-3 mr-0.5" />
                              {pitch.bidAmount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center space-x-2">
                        {pitch.isDraft ? (
                          <Button size="sm" onClick={() => handleEditPitch(pitch)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all text-xs">
                            <Edit className="h-3 w-3 mr-1" />
                            Continue
                          </Button>
                        ) : (
                          <>
                            {['pending'].includes(pitch.status) && (
                              <Button size="sm" variant="outline" onClick={() => handleEditPitch(pitch)} className="px-3 py-1.5 rounded-lg border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-xs">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleReviewPitch(pitch)} className="px-3 py-1.5 rounded-lg border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                            {pitch.article?.url && (
                              <Button size="sm" asChild className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all text-xs">
                                <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Article
                                </a>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Admin Notes */}
                    {pitch.adminNotes && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/50">
                        <p className="text-sm text-blue-800 leading-relaxed">
                          <span className="font-semibold">Publisher Feedback: </span>
                          {pitch.adminNotes}
                        </p>
                      </div>
                    )}

                    {/* Published Article */}
                    {pitch.article && ['successful', 'successful_coverage'].includes(pitch.status) && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-green-100/50 rounded-xl border border-green-200/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Award className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-sm font-semibold text-green-800">Published Article</span>
                          </div>
                          <a 
                            href={pitch.article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 hover:text-green-800 flex items-center font-semibold bg-green-100 hover:bg-green-200 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Read Article <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </div>
                        {pitch.article.title && (
                          <p className="text-sm text-green-700 mt-2 font-medium leading-relaxed">{pitch.article.title}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
