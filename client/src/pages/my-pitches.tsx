import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, ExternalLink, FileText, Clock, X, Check, AlertCircle, Edit, Save, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import PitchEditModal from "@/components/pitch-edit-modal";
import PitchReviewModal from "@/components/pitch-review-modal";
import PitchProgressTracker from "@/components/pitch-progress-tracker";
import { getStage, PitchStatus, PitchDTO } from "@/utils/pitchStage";

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

// Format date helper
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "d MMM yyyy");
  } catch (e) {
    return "Invalid date";
  }
};

export default function MyPitches() {
  const { user } = useAuth();
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  // Fetch user's submitted pitches
  const { data: pitches, isLoading: isPitchesLoading, error: pitchesError } = useQuery({
    queryKey: [`/api/users/${user?.id}/pitches`],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/users/${user.id}/pitches`);
      const data = await res.json();
      console.log("User pitches:", data);
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
      console.log("User drafts:", data);
      return data.map((draft: any) => ({ ...draft, isDraft: true })) || [];
    },
    enabled: !!user?.id,
  });

  // Process the pitches and drafts to prevent duplicate entries
  // First ensure that all pitches have the correct status display
  // CRITICAL FIX: Make sure pending pitches are properly shown as pending
  
  // Debug - log all pitches to see their status and paymentIntentId
  console.log("Raw pitches data:", pitches?.map((p: any) => ({
    id: p.id, 
    status: p.status, 
    isDraft: p.isDraft, 
    paymentIntentId: p.paymentIntentId
  })));
  
  const processedPitches = (pitches || []).map((pitch: any) => {
    if (pitch.status === 'draft' && !pitch.isDraft) {
      // This is a submitted pitch with 'draft' status in the database
      // but it should display as 'pending' in the UI
      console.log('Converting draft pitch to pending for UI:', pitch.id);
      return {
        ...pitch,
        status: 'pending'
      };
    }
    return pitch;
  });
  
  const processedDrafts = (drafts || []).filter((draft: any) => {
    // Only include drafts that don't have a matching pitch ID
    return !processedPitches.some((pitch: any) => pitch.id === draft.id);
  });
  
  // Combine both pitches and drafts for display, ensuring distinct status display
  const allItems = [
    ...processedPitches.map((pitch: any) => {
      // Use the central getStage utility to determine pitch status
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
      
      console.log(`Processed pitch ${pitch.id}: stage=${actualStage}, isDraft=${actualStage === 'draft'}`);
      
      return {
        ...pitch,
        // Determine if it's a draft based on the result from getStage
        isDraft: actualStage === 'draft'
      };
    }),
    ...processedDrafts.map((draft: any) => ({
      ...draft,
      isDraft: true // Always mark drafts as drafts
    }))
  ];
  const isLoading = isPitchesLoading || isDraftsLoading;
  const hasError = pitchesError || draftsError;
  
  const handleEditPitch = (pitch: Pitch) => {
    // Log the pitch we're trying to edit for debugging
    console.log('Editing pitch:', pitch);
    setSelectedPitch(pitch);
    setIsEditModalOpen(true);
  };
  
  // Convert Pitch to PitchDTO for the modal
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
      opportunity: pitch.opportunity,
      article: pitch.article,
      // Include any fields needed by the modals
      userId: pitch.userId
    }
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

  // Function to continue editing a draft
  const continueDraft = (draft: Pitch) => {
    console.log('Continue working on draft:', draft);
    // Redirect to the opportunity page with the draft ID
    window.location.href = `/opportunities/${draft.opportunityId}?draftId=${draft.id}`;
  };
  
  // Function to delete a draft
  const deleteDraft = async (draftId: number) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
      const res = await apiRequest('DELETE', `/api/pitches/${draftId}/draft`);
      if (res.ok) {
        // Invalidate the drafts query to refresh the list
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/drafts`] });
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  // Create separate arrays for drafts and sent pitches
  const [selectedTab, setSelectedTab] = useState<'sent' | 'drafts'>('sent');
  
  // Force update all pitches that exist in admin panel to show as sent pitches
  // We use a more aggresive approach here to fix the database status mismatch
  const draftItems = allItems.filter(item => {
    // Only consider as true drafts if they have draft status AND no pitch ID
    // If it's in the admin panel, it should be considered sent even if status is draft
    return item.status === 'draft' && !item.id;
  });
  
  // Helper function to match status against filter
  const matchesFilter = (itemStatus: string, filter: string | null): boolean => {
    if (!filter) return true;
    
    // For convenience, map some aliases to their canonical forms
    const statusMap: Record<string, string[]> = {
      'pending': ['pending', 'draft'],
      'sent_to_reporter': ['sent_to_reporter', 'sent'],
      'reporter_interested': ['reporter_interested', 'interested'],
      'not_interested': ['not_interested', 'reporter_not_interested'],
      'successful': ['successful', 'successful_coverage'],
    };
    
    if (statusMap[filter]) {
      return statusMap[filter].includes(itemStatus);
    }
    
    return itemStatus === filter;
  };
  
  // Get all sent pitches
  const allSentItems = allItems.filter(item => {
    // Consider as sent if it has pitch ID (means it's in the system)
    return item.id > 0;
  });
  
  // Filter sent pitches based on the selected stage filter
  const sentItems = allSentItems.filter(item => matchesFilter(item.status, stageFilter));

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">My Pitches</h1>
        <Link href="/pitch-history" className="text-sm text-blue-600 hover:underline">
          View detailed pitch history
        </Link>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <div className="flex justify-between">
          <div className="flex">
            <button
              className={`px-4 py-2 font-medium text-sm ${
                selectedTab === 'sent'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => {
                setSelectedTab('sent');
                setStageFilter(null); // Clear filter when switching tabs
              }}
            >
              Sent Pitches ({sentItems.length})
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                selectedTab === 'drafts'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => {
                setSelectedTab('drafts');
                setStageFilter(null); // Clear filter when switching tabs
              }}
            >
              Drafts ({draftItems.length})
            </button>
          </div>
          
          {/* Pitch stage filter - always show when in sent pitches tab regardless of item count */}
          {selectedTab === 'sent' && (
            <div className="flex items-center gap-2">
              <label htmlFor="stage-filter" className="text-sm font-medium text-gray-700">
                Filter by stage:
              </label>
              <select
                id="stage-filter"
                className="border border-gray-300 rounded-md text-sm py-1 pl-2 pr-8"
                value={stageFilter || ''}
                onChange={(e) => setStageFilter(e.target.value || null)}
              >
                <option value="">All Pitches</option>
                <option value="pending">Pending</option>
                <option value="sent_to_reporter">Sent to Reporter</option>
                <option value="reporter_interested">Reporter Interested</option>
                <option value="successful">Successful</option>
                <option value="not_interested">Not Accepted</option>
              </select>
              {stageFilter && (
                <button 
                  className="text-sm text-gray-500 hover:text-gray-700 px-1 py-0.5 rounded"
                  onClick={() => setStageFilter(null)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading your pitches...</span>
        </div>
      ) : hasError ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>Error loading your pitches. Please try again later.</p>
          </div>
        </div>
      ) : allItems.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-lg text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No pitches yet</h3>
          <p className="text-sm text-gray-600 mt-2 mb-4">
            You haven't submitted any pitches yet. Browse opportunities and start pitching to get featured in top publications.
          </p>
          <Button asChild>
            <Link href="/opportunities">Browse Opportunities</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Empty state when there are pitches but none match the current filter */}
          {selectedTab === 'sent' && allSentItems.length > 0 && sentItems.length === 0 && (
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No matches found</h3>
              <p className="text-sm text-gray-600 mt-2 mb-4">
                We couldn't find any pitches that match your current filter. Try a different option or view all your pitches.
              </p>
              <Button 
                variant="default" 
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium"
                onClick={() => setStageFilter(null)}
              >
                <Search className="h-4 w-4 mr-1" />
                View All Pitches
              </Button>
            </div>
          )}
          
          {/* Show appropriate items based on selected tab */}
          {(selectedTab === 'sent' ? sentItems : draftItems).map((item) => {
            // Only render drafts under the Drafts tab
            // In the drafts tab, show only draft items
            if (selectedTab === 'drafts') {
              // Render draft item
              const createdDate = new Date(item.createdAt);
              const updatedDate = item.updatedAt ? new Date(item.updatedAt) : null;
              const formattedDate = format(createdDate, "d MMM yyyy");
              
              return (
                <div key={`draft-${item.id}`} className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="p-4 bg-white">
                    <div className="mb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold mb-1">
                            Request: {item.opportunity?.title || `Pitch #${item.id}`}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Published by reporter: {item.opportunity?.outlet || "Unknown Publication"} on {formattedDate}
                          </p>
                        </div>
                        
                        <div className="bg-amber-50 text-amber-800 text-sm px-3 py-1 rounded-full">
                          <div className="flex items-center">
                            <Save className="h-3 w-3 mr-1" />
                            Draft
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-md mb-3">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm text-blue-800">In-progress pitch: complete your pitch!</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleEditPitch(item)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit Draft
                      </Button>
                    </div>
                  </div>
                </div>
              );
            } else {
              // Render regular pitch item
              const createdDate = new Date(item.createdAt);
              const formattedDate = format(createdDate, "d MMM yyyy");
              const status = item.status || 'pending';
              const isPending = status === 'pending';
              const isInProgress = status === 'sent' || status === 'sent_to_reporter' || status === 'interested';
              const isSuccessful = status === 'successful';
              
              return (
                <div key={`pitch-${item.id}`} className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="p-4 bg-white">
                    <div className="mb-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-1 truncate pr-2" title={item.opportunity?.title || `Pitch #${item.id}`}>
                            Request: {item.opportunity?.title || `Pitch #${item.id}`}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {item.opportunity?.outlet || "Unknown Publication"} • {formattedDate}
                          </p>
                        </div>
                        
                        {isPending ? (
                          <div className="bg-blue-50 text-blue-800 text-sm px-3 py-1 rounded-full">
                            Pitch Pending
                          </div>
                        ) : isInProgress ? (
                          <div className="bg-blue-50 text-blue-800 text-sm px-3 py-1 rounded-full">
                            {status === 'sent_to_reporter' ? 'Pitch Sent' : 'Reporter Accepted'}
                          </div>
                        ) : isSuccessful ? (
                          <div className="bg-green-50 text-green-800 text-sm px-3 py-1 rounded-full">
                            Successful Coverage
                          </div>
                        ) : (
                          <div className={`text-sm px-3 py-1 rounded-full ${
                            status === 'not_interested' 
                              ? 'bg-red-50 text-red-800' 
                              : 'bg-blue-50 text-blue-800'
                          }`}>
                            {status === 'not_interested' 
                              ? 'Reporter Denied' 
                              : status === 'draft' || status === 'pending' 
                                ? 'Pitch Pending' 
                                : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Tracker Component - Only shown on demand */}
                    {/* Removed from main UI as per new requirements */}
                    
                    {isPending && (
                      <div className="bg-blue-50 p-3 mb-3 rounded-md">
                        <span className="text-sm text-blue-800 flex items-center">
                          <Clock className="h-6 w-6 mr-3 text-blue-600" />
                          Your pitch is pending — You may still edit your pitch before it is sent to the reporter.
                        </span>
                      </div>
                    )}
                    
                    {isInProgress && (
                      <div className="p-3 bg-blue-50 rounded-md mb-3">
                        <div className="flex items-center">
                          <Check className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-sm text-blue-800">
                            Thank you for submitting a pitch! The reporter will follow up with you if your pitch is what they need.
                            <br />
                            <span className="font-semibold">Your bid amount: ${item.bidAmount}</span>
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {status === 'not_interested' && (
                      <div className="p-3 bg-red-50 rounded-md mb-3">
                        <div className="flex items-start">
                          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-red-500" />
                          <div>
                            <span className="text-sm text-red-800 block mb-1">
                              The reporter has chosen not to pursue your pitch at this time.
                            </span>
                            <span className="text-sm text-red-700">
                              Not all pitches get accepted! <Link href="/opportunities" className="text-red-700 underline font-medium">Browse new opportunities</Link> and try pitching for other stories.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      {isPending ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditPitch(item)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Pitch
                          </Button>
                          {/* Only show Pitch Status for submitted pitches (not drafts) */}
                          {!item.isDraft && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleReviewPitch(item)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Pitch Status
                            </Button>
                          )}
                        </>
                      ) : isInProgress ? (
                        <div className="flex flex-wrap items-center justify-between w-full gap-2">
                          <div className="text-sm text-gray-600 italic">
                            <span className="text-gray-500">Your pitch is being reviewed by the reporter.</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleReviewPitch(item)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Pitch Status
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/opportunities/${item.opportunityId}`}>
                              <FileText className="h-4 w-4 mr-1" />
                              View Opportunity
                            </Link>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleReviewPitch(item)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Pitch Status
                          </Button>
                        </div>
                      )}
                    </div>

                    {isSuccessful && item.article && (
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <div className="flex items-start">
                          <div className="flex-grow">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">
                              Your pitch was successful! The article has been published.
                            </h4>
                            <a 
                              href={item.article.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                            >
                              {item.article.title || "View Published Article"}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                          <Badge className="bg-green-100 text-green-800 ml-2">
                            Successful
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    {item.adminNotes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          Notes from Publication:
                        </h4>
                        <p className="text-sm text-gray-700">{item.adminNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Modal for editing pitch */}
      {selectedPitch && (
        <PitchEditModal 
          isOpen={isEditModalOpen} 
          onClose={closeEditModal} 
          pitch={convertToPitchDTO(selectedPitch)}
        />
      )}
      
      {/* Modal for reviewing pitch */}
      {selectedPitch && (
        <PitchReviewModal 
          isOpen={isReviewModalOpen} 
          onClose={closeReviewModal} 
          pitch={convertToPitchDTO(selectedPitch)}
        />
      )}
    </div>
  );
}
