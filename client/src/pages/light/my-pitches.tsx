import { useState, useMemo, useEffect } from "react";
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
  ChevronLeft,
  Calendar,
  DollarSign
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import PitchEditModal from "@/components/pitch-edit-modal";
import PitchReviewModal from "@/components/pitch-review-modal";
import { getStage, PitchStatus } from "@/utils/pitchStage";
import { PitchDTO } from "@/utils/pitchInterfaces";
import { useToast } from "@/hooks/use-toast";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [, setLocation] = useLocation();
  
  const PITCHES_PER_PAGE = 10;

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

  // Filter pitches based on search and status
  const filteredPitches = useMemo(() => {
    let filtered = allPitches;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(pitch => 
        pitch.opportunity?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pitch.opportunity?.publication?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pitch.opportunity?.outlet?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(pitch => {
        const stage = getStage({
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
        
        switch (statusFilter) {
          case "draft": return stage === "draft";
          case "pending": return stage === "pending";
          case "sent": return stage === "sent_to_reporter" || stage === "sent";
          case "interested": return stage === "reporter_interested" || stage === "interested";
          case "published": return stage === "successful_coverage" || stage === "successful";
          case "rejected": return stage === "reporter_not_interested" || stage === "not_interested";
          default: return true;
        }
      });
    }
    
    return filtered;
  }, [allPitches, searchQuery, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPitches.length / PITCHES_PER_PAGE);
  const paginatedPitches = useMemo(() => {
    const startIndex = (currentPage - 1) * PITCHES_PER_PAGE;
    const endIndex = startIndex + PITCHES_PER_PAGE;
    return filteredPitches.slice(startIndex, endIndex);
  }, [filteredPitches, currentPage, PITCHES_PER_PAGE]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Scroll to top helper function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle page change with scroll to top
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    scrollToTop();
  };

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

  // Skip loading screen on mobile (pull-to-refresh handles it)
  const isMobile = window.innerWidth <= 768;
  if (isLoading && !isMobile) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-gray-600">Loading your pitches...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full bg-white min-h-screen">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
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
      </div>
    );
  }

  return (
    <div className="w-full bg-white min-h-screen">
      {/* Header with gradient background */}
      <div className="px-3 sm:px-4 py-4 sm:py-6 bg-white">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-3 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">My Pitches</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Track your submissions and view published articles</p>
              </div>
              <button 
                onClick={() => setLocation('/opportunities')}
                className="hidden sm:flex bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold transition-all duration-200 items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-xs sm:text-sm flex-shrink-0"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Browse Opportunities</span>
                <span className="sm:hidden">Browse</span>
              </button>
            </div>
          
            {/* Enhanced Stats Row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="bg-amber-50 rounded-xl p-2 sm:p-3 border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-amber-700 mb-0.5">Drafts</p>
                    <p className="text-base sm:text-xl font-bold text-amber-900">{stats.drafts}</p>
                  </div>
                  <div className="w-5 h-5 sm:w-8 sm:h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                    <Save className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-2 sm:p-3 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-0.5">Submitted</p>
                    <p className="text-base sm:text-xl font-bold text-blue-900">{stats.submitted}</p>
                  </div>
                  <div className="w-5 h-5 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Target className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-2 sm:p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-0.5">Published</p>
                    <p className="text-base sm:text-xl font-bold text-green-900">{stats.published}</p>
                  </div>
                  <div className="w-5 h-5 sm:w-8 sm:h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <Award className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search your pitches by title, publication, or outlet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white text-gray-900 placeholder-gray-500 hover:border-gray-400 transition-colors"
                />
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 font-medium">Filter by status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white text-gray-700 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-w-[140px] appearance-none bg-no-repeat bg-right pr-8 cursor-pointer shadow-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  <option value="all">All ({allPitches.length})</option>
                  <option value="draft">Drafts ({stats.drafts})</option>
                  <option value="pending">Pending ({allPitches.filter(p => getStage({ id: p.id, userId: p.userId, content: p.content, status: p.status as PitchStatus, bidAmount: p.bidAmount, createdAt: p.createdAt, updatedAt: p.updatedAt, opportunityId: p.opportunityId, isDraft: p.isDraft, paymentIntentId: p.paymentIntentId, opportunity: p.opportunity }) === "pending").length})</option>
                  <option value="sent">Sent ({allPitches.filter(p => { const stage = getStage({ id: p.id, userId: p.userId, content: p.content, status: p.status as PitchStatus, bidAmount: p.bidAmount, createdAt: p.createdAt, updatedAt: p.updatedAt, opportunityId: p.opportunityId, isDraft: p.isDraft, paymentIntentId: p.paymentIntentId, opportunity: p.opportunity }); return stage === "sent_to_reporter" || stage === "sent"; }).length})</option>
                  <option value="interested">Interested ({allPitches.filter(p => { const stage = getStage({ id: p.id, userId: p.userId, content: p.content, status: p.status as PitchStatus, bidAmount: p.bidAmount, createdAt: p.createdAt, updatedAt: p.updatedAt, opportunityId: p.opportunityId, isDraft: p.isDraft, paymentIntentId: p.paymentIntentId, opportunity: p.opportunity }); return stage === "reporter_interested" || stage === "interested"; }).length})</option>
                  <option value="published">Published ({stats.published})</option>
                  <option value="rejected">Rejected ({allPitches.filter(p => { const stage = getStage({ id: p.id, userId: p.userId, content: p.content, status: p.status as PitchStatus, bidAmount: p.bidAmount, createdAt: p.createdAt, updatedAt: p.updatedAt, opportunityId: p.opportunityId, isDraft: p.isDraft, paymentIntentId: p.paymentIntentId, opportunity: p.opportunity }); return stage === "reporter_not_interested" || stage === "not_interested"; }).length})</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          {allPitches.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-200">
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
              <Button onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }} variant="outline" className="rounded-lg px-4 py-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                Clear Search
              </Button>
            </div>
          ) : (
            <>
            <div className="divide-y divide-gray-200">
              {paginatedPitches.map((pitch, index) => {
                const statusDisplay = getStatusDisplay(pitch.status);
                const StatusIcon = statusDisplay.icon;
                const createdDate = formatDate(pitch.createdAt);
                
                return (
                  <div key={pitch.id} className={`p-3 sm:p-4 hover:bg-gray-50/50 transition-all duration-200 ${index === 0 ? 'rounded-t-2xl' : ''} ${index === filteredPitches.length - 1 ? 'rounded-b-2xl' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      {/* Left: Title and Publication */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 sm:max-w-xl sm:truncate">
                            {pitch.opportunity?.title || `Pitch #${pitch.id}`}
                          </h3>
                          <span className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 self-start sm:self-auto ${statusDisplay.color} shadow-sm`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusDisplay.label}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                          <span className="font-medium text-gray-700 text-sm">
                            {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Unknown Publication"}
                          </span>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {createdDate}
                            </span>
                            {pitch.bidAmount && !pitch.isDraft && (
                              <span className="flex items-center font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-lg text-xs">
                                Pitch Price: ${pitch.bidAmount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 sm:space-x-2 flex-wrap sm:flex-nowrap">
                        {pitch.isDraft ? (
                          <Button size="sm" onClick={() => {
                            // Navigate to opportunity detail page and scroll to pitch section
                            const opportunityId = pitch.opportunity?.id || pitch.opportunityId;
                            const targetUrl = `/opportunities/${opportunityId}#pitch-section`;
                            
                            // Use window.location.href for better hash handling
                            window.location.href = targetUrl;
                          }} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all text-xs flex-1 sm:flex-initial">
                            <Edit className="h-3 w-3 mr-1" />
                            Continue
                          </Button>
                        ) : (
                          <>
                            {['pending'].includes(pitch.status) && (
                              <Button size="sm" variant="outline" onClick={() => handleEditPitch(pitch)} className="px-3 py-1.5 rounded-lg border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-xs flex-1 sm:flex-initial">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleReviewPitch(pitch)} className="px-3 py-1.5 rounded-lg border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 text-xs flex-1 sm:flex-initial">
                              <Eye className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                            {pitch.article?.url && (
                              <Button size="sm" asChild className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all text-xs flex-1 sm:flex-initial">
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
                      <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-sm text-blue-800 leading-relaxed">
                          <span className="font-semibold">Publisher Feedback: </span>
                          {pitch.adminNotes}
                        </p>
                      </div>
                    )}

                    {/* Published Article */}
                    {pitch.article?.url && ['successful', 'successful_coverage'].includes(pitch.status) && (
                      <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Award className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-sm font-semibold text-green-700">Published Article</span>
                          </div>
                          <a 
                            href={pitch.article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 hover:text-green-800 flex items-center font-semibold bg-green-200 hover:bg-green-300 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Read Article <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </div>
                        {pitch.article?.title && (
                          <p className="text-sm text-green-800 mt-2 font-medium leading-relaxed">{pitch.article.title}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div className="flex items-center justify-center sm:justify-start space-x-2 text-xs sm:text-sm text-gray-600">
                    <span>
                      Showing {((currentPage - 1) * PITCHES_PER_PAGE) + 1} to {Math.min(currentPage * PITCHES_PER_PAGE, filteredPitches.length)} of {filteredPitches.length} pitches
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed px-2 sm:px-3 py-1.5"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                        let page;
                        if (totalPages <= 3) {
                          page = i + 1;
                        } else if (currentPage <= 2) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 1) {
                          page = totalPages - 2 + i;
                        } else {
                          page = currentPage - 1 + i;
                        }
                        return page;
                      }).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className={
                            currentPage === page
                              ? "bg-blue-600 text-white shadow-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
                          }
                        >
                          {page}
                        </Button>
                      ))}
                      {totalPages > 3 && currentPage < totalPages - 1 && (
                        <>
                          <span className="text-gray-400 px-1">...</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                            className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed px-2 sm:px-3 py-1.5"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
          </div>
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

      {/* ——— FOOTER ——— */}
      <footer className="relative z-20 bg-white py-16 mt-0">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="mb-8">
            <div className="inline-flex items-center group">
              <span className="text-gray-900 font-black text-4xl tracking-tight">
                <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Quote</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Bid</span>
              </span>
              <div className="ml-3 px-2 py-1 bg-blue-100 border border-blue-200 rounded text-blue-700 text-xs font-bold uppercase tracking-wider">
                Beta
              </div>
            </div>
            <p className="text-gray-600 mt-4 text-lg">
              The World's First Live Marketplace for Earned Media
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            <span className="text-gray-500 hover:text-gray-700 transition-colors duration-300 text-lg font-medium cursor-default">
              Terms of Use
            </span>
            <span className="text-gray-500 hover:text-gray-700 transition-colors duration-300 text-lg font-medium cursor-default">
              Privacy
            </span>
            <span className="text-gray-500 hover:text-gray-700 transition-colors duration-300 text-lg font-medium cursor-default">
              Editorial Integrity
            </span>
          </div>
          
          <div className="border-t border-gray-200 pt-8">
            <p className="text-gray-600 text-lg">
              &copy; {new Date().getFullYear()} QuoteBid Inc. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Built For Experts, Not PR Agencies.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
