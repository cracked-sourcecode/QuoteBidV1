import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AlertCircle, ArrowRight, Clock, Info, Edit, FileText, Check, ExternalLink } from 'lucide-react';
import { BidInfo } from '@shared/types/opportunity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import ConfirmBidDialog from '@/components/confirm-bid-dialog';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

interface BidTicketProps {
  bidInfo: BidInfo;
  onSubmitBid: (amount: number, pitch: string, intentId?: string) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
  publicationName: string;
  opportunityId: number;
}

export default function BidTicket({ 
  bidInfo, 
  onSubmitBid, 
  isSubmitting, 
  error,
  publicationName,
  opportunityId
}: BidTicketProps) {
  const { toast } = useToast();
  
  // Current bid amount, initialize with the minimum bid
  const [bidAmount, setBidAmount] = useState<number>(bidInfo.minBid);
  
  // Pitch content
  const [pitch, setPitch] = useState<string>('');
  
  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  
  // Draft state
  const [draftId, setDraftId] = useState<number | null>(null);
  const [isPitchStarted, setIsPitchStarted] = useState<boolean>(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState<boolean>(false);
  
  // Check if user has already submitted a pitch for this opportunity
  const [hasSubmittedPitch, setHasSubmittedPitch] = useState<boolean>(false);
  const [submittedPitch, setSubmittedPitch] = useState<any>(null);
  const [isCheckingPitchStatus, setIsCheckingPitchStatus] = useState<boolean>(true);
  
  // Temporary pitch ID for payment intent association
  const [tempPitchId, setTempPitchId] = useState<number | null>(null);
  
  // Character count for pitch
  const charCount = pitch.length;
  const maxChars = 400;
  
  // Deadline formatting
  const deadline = new Date(bidInfo.deadline);
  const formattedDeadline = format(deadline, 'MMM d, yyyy h:mm a');
  const timeRemaining = deadline.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24)));
  
  // Slider configuration
  const minBid = bidInfo.minBid;
  const maxBid = minBid * 2;
  const bidStep = Math.round(bidInfo.currentPrice / 10);
  
  // Check if the user has already submitted a pitch for this opportunity
  useEffect(() => {
    const checkSubmittedPitch = async () => {
      try {
        setIsCheckingPitchStatus(true);
        const res = await apiRequest('GET', `/api/opportunities/${opportunityId}/user-pitch-status`);
        if (res.ok) {
          const data = await res.json();
          console.log('⚠️ PITCH STATUS CHECK RESULT:', data);
          
          // Always set whether the user has submitted a pitch
          setHasSubmittedPitch(data.hasSubmitted);
          
          // Store the submitted pitch data if available
          if (data.pitch) {
            console.log('Setting submitted pitch:', data.pitch);
            setSubmittedPitch(data.pitch);
          }
          
          // If the user has submitted any non-draft pitch (including pending ones),
          // we need to clear the draft state and don't show the editor
          if (data.hasSubmitted) {
            console.log('⚠️ USER HAS ALREADY SUBMITTED PITCH:', data.pitch);
            // Clear any draft state
            setDraftId(null);
            setPitch('');
            
            // IMPORTANT: If the user already submitted a pitch, don't show the draft editor
            console.log('Disabling pitch editor for submitted pitch');
            setIsPitchStarted(false);
            
            // Force immediate rerender by setting a flag
            setTimeout(() => {
              console.log('Forcing rerender for submitted pitch state');
              setIsCheckingPitchStatus(false);
            }, 10);
            return; // Early return to prevent the final setIsCheckingPitchStatus call
          }
          
          // CRITICAL PART: Handle draft pitches - these should be shown as drafts
          // If the user has a draft pitch, we can pre-populate it
          if (data.hasDraft && data.draftPitch) {
            console.log('Found existing draft pitch:', data.draftPitch);
            setDraftId(data.draftPitch.id);
            setPitch(data.draftPitch.content || '');
            setBidAmount(data.draftPitch.bidAmount || bidInfo.minBid);
            setIsPitchStarted(true);
          }
        }
      } catch (error) {
        console.error('Error checking submitted pitch status:', error);
      } finally {
        setIsCheckingPitchStatus(false);
      }
    };
    
    checkSubmittedPitch();
  }, [opportunityId, bidInfo.minBid]);
  
  // Check for draft on load - happens when returning to an opportunity with a draft
  useEffect(() => {
    const checkForDraft = async () => {
      try {
        // Skip if user has already submitted a pitch for this opportunity
        if (hasSubmittedPitch) {
          console.log('Skipping draft check - user has already submitted a pitch');
          return;
        }
        
        // First try the regular user ID-based endpoint
        const userId = sessionStorage.getItem('userId');
        if (userId) {
          const res = await apiRequest('GET', `/api/users/${userId}/drafts?opportunityId=${opportunityId}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const draft = data[0];
              console.log('Found existing draft:', draft);
              setDraftId(draft.id);
              setPitch(draft.content || '');
              setBidAmount(draft.bidAmount || minBid);
              setIsPitchStarted(true);
              return;
            }
          }
        }
        
        // Fallback to the pitches endpoint to find drafts
        const pitchesRes = await apiRequest('GET', `/api/users/${userId}/pitches`);
        if (pitchesRes.ok) {
          const pitches = await pitchesRes.json();
          const draftPitch = pitches.find(p => p.status === 'draft' && p.opportunityId === opportunityId);
          
          if (draftPitch) {
            console.log('Found draft in pitches list:', draftPitch);
            setDraftId(draftPitch.id);
            setPitch(draftPitch.content || '');
            setBidAmount(draftPitch.bidAmount || minBid);
            setIsPitchStarted(true);
          }
        }
      } catch (error) {
        console.error('Error checking for draft:', error);
      }
    };
    
    // Get userId from sessionStorage and store it for later use
    const getUserId = async () => {
      try {
        const userRes = await apiRequest('GET', '/api/user');
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData && userData.id) {
            sessionStorage.setItem('userId', userData.id.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    getUserId().then(() => checkForDraft());
  }, [opportunityId, minBid, hasSubmittedPitch]);
  
  // Function to start a new pitch (creates a draft)
  const handleStartPitch = async () => {
    // Check if user has already submitted a pitch for this opportunity
    if (hasSubmittedPitch) {
      console.log('User has already submitted a pitch, redirecting to My Pitches');
      // Show toast notification explaining why they can't start a new pitch
      toast({
        title: "Pitch Already Submitted",
        description: "You've already submitted a pitch for this opportunity. You can view or edit it from My Pitches.",
        variant: "default"
      });
      return;
    }
    
    setIsCreatingDraft(true);
    try {
      // First check if there's already a draft for this opportunity
      const userId = sessionStorage.getItem('userId');
      if (userId) {
        // Check for drafts for this specific opportunity
        const draftsRes = await apiRequest('GET', `/api/users/${userId}/drafts?opportunityId=${opportunityId}`);
        if (draftsRes.ok) {
          const existingDrafts = await draftsRes.json();
          if (existingDrafts && existingDrafts.length > 0) {
            // Draft already exists, just open it
            const draft = existingDrafts[0];
            console.log('Found existing draft for this opportunity:', draft);
            setDraftId(draft.id);
            setPitch(draft.content || '');
            setBidAmount(draft.bidAmount || minBid);
            setIsPitchStarted(true);
            setIsCreatingDraft(false);
            return;
          }
        }
        
        // Check in regular pitches for drafts of this opportunity
        const pitchesRes = await apiRequest('GET', `/api/users/${userId}/pitches`);
        if (pitchesRes.ok) {
          const pitches = await pitchesRes.json();
          const draftPitch = pitches.find((p: any) => p.status === 'draft' && p.opportunityId === opportunityId);
          
          if (draftPitch) {
            console.log('Found draft in pitches list for this opportunity:', draftPitch);
            setDraftId(draftPitch.id);
            setPitch(draftPitch.content || '');
            setBidAmount(draftPitch.bidAmount || minBid);
            setIsPitchStarted(true);
            setIsCreatingDraft(false);
            return;
          }
        }
      }
      
      // No existing draft found, create a new one
      const res = await apiRequest('POST', '/api/pitches/draft', {
        opportunityId,
        content: 'Draft in progress...', // Initialize with text so it's not null
        bidAmount: minBid,
        pitchType: 'text',
        status: 'draft'
      });
      
      if (res.ok) {
        const draft = await res.json();
        console.log('Created new draft:', draft);
        setDraftId(draft.id);
        setPitch(''); // Reset the pitch content in the UI
        setIsPitchStarted(true);
        
        // Immediately save the empty content to override placeholder
        setTimeout(async () => {
          try {
            await apiRequest('PUT', `/api/pitches/${draft.id}/draft`, {
              content: '',
              bidAmount: minBid
            });
          } catch (err) {
            console.error('Error resetting draft content:', err);
          }
        }, 500);
      } else {
        throw new Error('Failed to create draft');
      }
    } catch (error) {
      console.error('Error creating draft:', error);
      toast({
        title: "Error",
        description: "Failed to start pitch. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingDraft(false);
    }
  };
  
  // Handle bid submission form validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-check that the user hasn't already submitted a pitch
    if (hasSubmittedPitch) {
      toast({
        title: "Pitch Already Submitted",
        description: "You've already submitted a pitch for this opportunity. You can view or edit it from My Pitches.",
        variant: "default"
      });
      return;
    }
    
    if (bidAmount < minBid) {
      toast({
        title: "Bid amount too low",
        description: `Minimum bid is $${minBid}`,
        variant: "destructive"
      });
      return;
    }
    
    if (charCount === 0) {
      toast({
        title: "Pitch required",
        description: "Please include a pitch with your bid",
        variant: "destructive"
      });
      return;
    }
    
    // Generate a temporary ID based on opportunity ID and timestamp
    // This will be replaced with the actual pitch ID once created
    // but allows us to track payment intents during the creation process
    const timestamp = new Date().getTime();
    const tempId = timestamp % 1000000;
    setTempPitchId(tempId);
    console.log(`Created temporary pitch ID: ${tempId} for opportunity ${opportunityId}`);
    
    // Open confirmation dialog instead of submitting immediately
    setConfirmDialogOpen(true);
  };
  
  // Handle the actual bid submission after confirmation
  const handleConfirmBid = async (amount: number, paymentIntentId?: string) => {
    try {
      // Submit the bid with payment intent ID that was already created in ConfirmBidDialog
      await onSubmitBid(amount, pitch, paymentIntentId);
      
      // Update local state to reflect the submission
      setHasSubmittedPitch(true);
      setSubmittedPitch({
        bidAmount: amount,
        content: pitch,
        status: 'sent_to_reporter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Clear the draft state
      setIsPitchStarted(false);
      setDraftId(null);
      setPitch('');
      
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to place bid. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Auto-save draft debouncer
  useEffect(() => {
    // Save if we have a draft ID and pitch is started - even with empty content
    if (draftId && isPitchStarted) {
      const timer = setTimeout(async () => {
        try {
          console.log(`Auto-saving draft ${draftId} with content length: ${pitch.length}`);
          const res = await apiRequest('PUT', `/api/pitches/${draftId}/draft`, {
            content: pitch,
            bidAmount: bidAmount
          });
          
          if (!res.ok) {
            console.error('Error auto-saving draft:', await res.text());
          } else {
            console.log('Draft auto-saved successfully');
          }
        } catch (error) {
          console.error('Failed to auto-save draft:', error);
        }
      }, 1000); // 1 second debounce for quicker response
      
      return () => clearTimeout(timer);
    }
  }, [pitch, bidAmount, draftId, isPitchStarted]);
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Confirmation dialog */}
      <ConfirmBidDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmBid}
        outlet={publicationName}
        amount={bidAmount}
        pitchId={tempPitchId || undefined}
      />
      
      <div className="bg-blue-600 text-white px-4 py-3">
        <h3 className="text-lg font-semibold">Place Your Bid</h3>
        <p className="text-sm text-blue-100">
          {bidInfo.slotsRemaining} of {bidInfo.slotsTotal} slots remaining
        </p>
      </div>

      {/* Show message when user has already submitted a pitch */}
      {hasSubmittedPitch ? (
        submittedPitch?.status === 'pending' ? (
          <div className="p-6 space-y-4">
            <Card className="bg-blue-50 border-blue-200 p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Edit className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-blue-800">Pitch Is Pending</h3>
                <p className="text-blue-700">
                  Your pitch has been submitted and is pending review. While it's still in the pending stage, you can edit it from the My Pitches page.
                </p>
                <div className="bg-blue-100 p-4 rounded-md w-full">
                  <p className="font-medium text-blue-900 mb-1">Your bid amount:</p>
                  <p className="text-xl font-bold text-blue-900">${submittedPitch?.bidAmount || 'N/A'}</p>
                </div>
                <div className="flex flex-col w-full space-y-3 mt-4">
                  <Button variant="outline" className="flex items-center justify-center w-full px-2 py-1 h-10" asChild>
                    <Link to="/opportunities">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Browse Other Opportunities
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex items-center justify-center w-full px-2 py-1 h-10" asChild>
                    <Link to="/my-pitches">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Pitch
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <Card className="bg-emerald-50 border-emerald-200 p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-emerald-800">Pitch Already Submitted!</h3>
                <p className="text-emerald-700">
                  You've already submitted a pitch for this opportunity. Each user can only submit one pitch per opportunity.
                </p>
                <div className="bg-emerald-100 p-4 rounded-md w-full">
                  <p className="font-medium text-emerald-900 mb-1">Your bid amount:</p>
                  <p className="text-xl font-bold text-emerald-900">${submittedPitch?.bidAmount || 'N/A'}</p>
                </div>
                <div className="flex flex-col w-full space-y-3 mt-4">
                  <Button variant="outline" className="flex items-center justify-center w-full px-2 py-1 h-10" asChild>
                    <Link to="/opportunities">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Browse Other Opportunities
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex items-center justify-center w-full px-2 py-1 h-10" asChild>
                    <Link to="/my-pitches">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View My Pitches
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )
      ) : isCheckingPitchStatus ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : isPitchStarted ? (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-blue-50 p-3 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">Working on draft - <span className="font-medium">Auto-saving</span></span>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              Draft
            </Badge>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current Price:</span>
              <span className="font-semibold">${bidInfo.currentPrice}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Minimum Bid:</span>
              <span className="font-semibold">${minBid}</span>
            </div>
          </div>
          
          {timeRemaining > 0 ? (
            <div className="flex items-center text-sm text-gray-600 space-x-2">
              <Clock className="h-4 w-4" />
              <span>
                Deadline: {formattedDeadline} 
                <span className="ml-1 text-blue-600 font-medium">
                  ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left)
                </span>
              </span>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <div className="font-semibold mb-1">
                DEADLINE {format(deadline, 'EEE MMM d').toUpperCase()} {format(deadline, 'h:mma').toUpperCase()}
                ({Math.abs(Math.floor(timeRemaining / (1000 * 60 * 60 * 24)))} DAYS AGO)
              </div>
              <p>This request expired {Math.abs(Math.floor(timeRemaining / (1000 * 60 * 60 * 24)))} days ago. QuoteBid allows you to submit, as some reporters still consider late pitches for their stories.</p>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="flex justify-between">
              <span className="text-sm font-medium">Your Bid Amount</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">
                      Your bid must be at least the minimum bid amount.
                      Higher bids have a better chance of being selected.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <Input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  className="pl-7"
                  min={minBid}
                />
              </div>
            </div>
            
            <Slider
              value={[bidAmount]}
              min={minBid}
              max={maxBid}
              step={bidStep}
              onValueChange={(values) => setBidAmount(values[0])}
              className="my-4"
            />
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>Min: ${minBid}</span>
              <span>Max: ${maxBid}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Your Pitch <span className="text-gray-500">(required)</span>
            </label>
            
            <Textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Explain why you're the perfect expert for this opportunity. Include relevant experience and what unique insights you can offer."
              className="min-h-[120px]"
              maxLength={maxChars}
            />
            
            <div className="flex justify-between text-xs">
              <span className={charCount > maxChars ? 'text-red-500' : 'text-gray-500'}>
                {charCount}/{maxChars} characters
              </span>
              {charCount > 0 && (
                <span className="text-gray-500">
                  Approx. {Math.ceil(charCount / 100)} sentences
                </span>
              )}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full flex items-center justify-center"
            disabled={isSubmitting || bidAmount < minBid || charCount === 0}
          >
            {isSubmitting ? (
              <span>Submitting...</span>
            ) : (
              <>
                <span>Submit Bid (${bidAmount})</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            By submitting a bid, you agree to the terms and conditions.
            You'll only be charged if your pitch is accepted.
          </p>
        </form>
      ) : (
        <div className="p-4">
          <div className="mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current Price:</span>
              <span className="font-semibold">${bidInfo.currentPrice}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Minimum Bid:</span>
              <span className="font-semibold">${minBid}</span>
            </div>
          </div>
          
          <div className="mb-4">
            {timeRemaining > 0 ? (
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>Deadline: {formattedDeadline} ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left)</span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-sm text-amber-800">
                <p className="font-medium">This request has expired, but you can still submit.</p>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Bid Amount</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
              <Input
                type="number"
                value={bidInfo.minBid}
                disabled
                className="pl-7 bg-gray-50"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Your Pitch <span className="text-gray-500">(required)</span>
            </label>
            <Textarea
              disabled
              placeholder="Click 'Start Pitch' to begin writing your pitch..."
              className="min-h-[120px] bg-gray-50"
            />
          </div>
          
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center"
            onClick={handleStartPitch}
            disabled={isCreatingDraft}
          >
            {isCreatingDraft ? (
              <span>Creating draft...</span>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                <span>Start Pitch</span>
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            By submitting a bid, you agree to the terms and conditions.
            You'll only be charged if your pitch is accepted.
          </p>
        </div>
      )}
    </div>
  );
}