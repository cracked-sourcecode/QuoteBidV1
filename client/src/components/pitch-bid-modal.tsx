import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { OpportunityWithPublication, Bid } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useRecorder } from "@/hooks/use-recorder";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useSubscription } from "@/hooks/use-subscription";
import { useLocation } from "wouter";
import { CreditCard } from "lucide-react";
import PaywallModal from "@/components/paywall-modal";

interface PitchBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityWithPublication;
}

export default function PitchBidModal({
  isOpen,
  onClose,
  opportunity
}: PitchBidModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("text");
  const [, setLocation] = useLocation();
  const { canPitch, hasActiveSubscription, subscriptionStatus, isLoading: subscriptionLoading } = useSubscription();
  
  // Bidding state
  const [bidAmount, setBidAmount] = useState<number>(opportunity.minimumBid || 100);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [bidUrgencyMessage, setBidUrgencyMessage] = useState<string>("");
  const [recentBidActivity, setRecentBidActivity] = useState<string>("");
  
  // Draft state
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState<boolean>(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  
  // Text pitch state
  const [pitchContent, setPitchContent] = useState<string>("");
  
  // Voice recorder state and handlers
  const {
    audioURL,
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    recordingBlob,
    isProcessing
  } = useRecorder({ maxTimeInSeconds: 120 });
  
  const [transcript, setTranscript] = useState<string>("");
  
  // Autosave functionality with debouncing
  useEffect(() => {
    let autosaveTimer: NodeJS.Timeout;
    
    if (isOpen && user && opportunity.id && (pitchContent.trim() || transcript)) {
      autosaveTimer = setTimeout(() => {
        saveDraft();
      }, 2000); // Autosave after 2 seconds of inactivity
    }
    
    return () => {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
      }
    };
  }, [isOpen, user, opportunity.id, pitchContent, transcript, bidAmount, activeTab]);

  // Check for existing draft on load
  useEffect(() => {
    if (isOpen && user && opportunity.id) {
      const checkForDraft = async () => {
        try {
          const res = await apiRequest("GET", `/api/users/${user.id}/drafts?opportunityId=${opportunity.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const draft = data[0];
              setDraftId(draft.id);
              if (draft.content) {
                setPitchContent(draft.content);
                setActiveTab("text");
              } else if (draft.transcript) {
                setTranscript(draft.transcript);
                if (draft.audioUrl) {
                  // Restore audio URL if available
                  // Note: The actual audio blob can't be restored this way
                  // User would need to re-record if they want to modify
                }
                setActiveTab("voice");
              }
              if (draft.bidAmount) {
                setBidAmount(draft.bidAmount);
              }
              toast({
                title: "Draft restored",
                description: "Your previous draft has been restored."
              });
            }
          }
        } catch (error) {
          console.error("Error checking for draft:", error);
        }
      };
      
      checkForDraft();
    }
  }, [isOpen, user, opportunity.id, toast]);
  
  // Save draft function
  const saveDraft = async () => {
    if (!user || !opportunity.id) return;
    
    // Don't save if nothing has been entered
    if (!pitchContent.trim() && !transcript && !audioURL) return;
    
    setAutoSaving(true);
    
    try {
      const draftData = {
        opportunityId: opportunity.id,
        userId: user.id,
        content: activeTab === "text" ? pitchContent : "",
        transcript: activeTab === "voice" ? transcript : "",
        audioUrl: activeTab === "voice" ? audioURL || "" : "",
        bidAmount: bidAmount,
        isDraft: true,
        pitchType: activeTab
      };
      
      const method = draftId ? "PUT" : "POST";
      const endpoint = draftId ? `/api/pitches/${draftId}/draft` : "/api/pitches/draft";
      
      const res = await apiRequest(method, endpoint, draftData);
      if (res.ok) {
        const data = await res.json();
        if (!draftId) {
          setDraftId(data.id);
        }
        setLastSavedAt(new Date());
      }
    } catch (error) {
      console.error("Error saving draft:", error);
    } finally {
      setAutoSaving(false);
    }
  };
  
  // Handle textarea changes with autosave trigger
  const handlePitchContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPitchContent(e.target.value);
    // Autosave handled by the useEffect hook
  };
  
  // Calculate time remaining for the bid
  useEffect(() => {
    if (opportunity.deadline) {
      const deadline = new Date(opportunity.deadline);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining("Closed");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      setTimeRemaining(`${hours} hours`);
    } else {
      setTimeRemaining("48 hours");
    }
  }, [opportunity]);
  
  // Fetch bids for this opportunity
  const { data: bids, isLoading: isBidsLoading } = useQuery<Bid[]>({
    queryKey: [`/api/opportunities/${opportunity.id}/bids`],
  });
  
  // Get the current highest bid
  const currentHighestBid = isBidsLoading || !bids || !Array.isArray(bids) || bids.length === 0
    ? opportunity.minimumBid || 100
    : Math.max(...bids.map((bid: Bid) => bid.amount));
  
  // Bid count for various displays
  const bidCount = bids && Array.isArray(bids) ? bids.length : 0;
  
  // Fixed expert view count (set once when component mounts)
  const [expertViewCount] = useState(() => bidCount + Math.floor(Math.random() * 10) + 3);
  
  // Generate bid urgency messages
  // Fixed urgency message type (set once when component mounts)
  const [urgencyType] = useState(() => {
    const types = [
      "price-surge",
      "slot-scarcity",
      "deadline",
      "peer-pressure",
      "historical"
    ];
    return types[Math.floor(Math.random() * types.length)];
  });
  
  // Fixed random percentage (set once when component mounts)
  const [priceJumpPercentage] = useState(() => Math.floor(Math.random() * 20 + 10));
  const [slotsFilledCount] = useState(() => Math.floor(Math.random() * 2) + 1);
  const [slotsLeftCount] = useState(() => Math.floor(Math.random() * 2) + 1);
  
  useEffect(() => {
    if (!bids || isBidsLoading || !Array.isArray(bids)) return;
    
    switch(urgencyType) {
      case "price-surge":
        if (bidCount > 2) {
          setBidUrgencyMessage(`🔥 Price just jumped ${priceJumpPercentage}% after ${bidCount} bids—lock in now before it climbs!`);
        } else {
          setBidUrgencyMessage(`📈 Ask price trending toward ${formatCurrency(currentHighestBid * 1.5)} soon!`);
        }
        break;
      case "slot-scarcity":
        setBidUrgencyMessage(`🚨 ${slotsFilledCount}/3 slots filled—only ${slotsLeftCount} left at this price!`);
        break;
      case "deadline":
        setBidUrgencyMessage(`⏳ ${timeRemaining} left—price drops in 2h if no bids!`);
        break;
      case "peer-pressure":
        setBidUrgencyMessage(`👥 ${expertViewCount} experts viewed this pitch—${bidCount} already bidding.`);
        break;
      case "historical":
        setBidUrgencyMessage(`📆 Last week's similar query hit ${formatCurrency(currentHighestBid * 2)}—currently at ${formatCurrency(currentHighestBid)}.`);
        break;
      default:
        setBidUrgencyMessage(`⏳ Deadline in ${timeRemaining}—lock in your bid now!`);
    }
    
    // Set recent bid activity message
    if (bidCount > 0) {
      setRecentBidActivity(`${bidCount} ${bidCount === 1 ? 'person has' : 'people have'} already bid on this opportunity`);
    } else {
      setRecentBidActivity('Be the first to bid on this opportunity!');
    }
    
  }, [bids, isBidsLoading, currentHighestBid, timeRemaining, bidCount, 
      urgencyType, priceJumpPercentage, slotsFilledCount, slotsLeftCount, expertViewCount]);
  
  // Process the recording to get transcript
  const processRecording = useMutation({
    mutationFn: async () => {
      if (!recordingBlob) {
        throw new Error("No recording available");
      }

      const reader = new FileReader();
      const audioBase64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1]; // Remove the data URL prefix
          resolve(base64Data);
        };
        reader.readAsDataURL(recordingBlob);
      });

      const audioBase64 = await audioBase64Promise;
      const response = await apiRequest("POST", "/api/pitches/voice", { audio: audioBase64 });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setTranscript(data.text);
      toast({
        title: "Recording processed",
        description: "Your recording has been transcribed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process the recording. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // When recording stops, process it to get transcript
  useEffect(() => {
    if (recordingBlob && !isRecording && !transcript) {
      processRecording.mutate();
    }
  }, [recordingBlob, isRecording]);

  // Format recording time
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Add paywall modal state
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  // Submit both pitch and bid
  const submitPitchAndBid = useMutation({
    mutationFn: async () => {
      // Check subscription before allowing submission - show paywall modal if needed
      if (!canPitch) {
        throw new Error("SUBSCRIPTION_REQUIRED");
      }

      // Check if we have the necessary information
      if (bidAmount < currentHighestBid) {
        throw new Error("Bid amount must be higher than the current highest bid");
      }
      
      // For text pitch
      if (activeTab === "text" && !pitchContent.trim()) {
        throw new Error("Please enter your pitch");
      }
      
      // For voice pitch
      if (activeTab === "voice" && (!recordingBlob || !transcript)) {
        throw new Error("Please record your pitch and wait for transcription");
      }
      
      // Verify user is logged in
      if (!user) {
        throw new Error("You must be logged in to submit a bid");
      }

      // Log the actual user ID being used
      console.log("Submitting bid for user ID:", user.id);
      
      // Double-check user ID is present
      if (!user || !user.id) {
        console.error("User ID is not available:", user);
        throw new Error("User ID is missing. Please refresh the page and try again.");
      }
      
      // Log the actual user ID for debugging
      console.log("Submitting with user:", { 
        id: user.id,
        username: user.username,
        email: user.email 
      });
      
      // Submit bid first
      console.log("Processing payment and submitting bid...");
      const paymentResponse = await apiRequest("POST", "/api/create-payment-intent", {
        amount: bidAmount,
        capture_method: "manual",
        metadata: {
          pitchType: "media_coverage",
          userId: user.id
        }
      });

      if (!paymentResponse.ok) {
        throw new Error("Failed to process payment. Please try again.");
      }
      
      const payment = await paymentResponse.json();
      const paymentIntentId = payment.paymentIntentId;
      
      // Submit bid with the exact format needed
      const bidData = {
        opportunityId: opportunity.id,
        userId: user.id,
        amount: bidAmount,
        message: "",
        status: "pending",
        paymentIntentId: paymentIntentId
      };
      
      console.log("Submitting bid:", bidData);
      const bidRes = await apiRequest("POST", "/api/bids", bidData);
      
      if (!bidRes.ok) {
        const bidError = await bidRes.json();
        throw new Error(bidError.message || "Failed to submit bid");
      }
      
      // Then submit pitch with the exact fields needed
      // Include BOTH camelCase and snake_case versions to ensure server compatibility
      const pitchData = {
        opportunityId: opportunity.id, 
        opportunity_id: opportunity.id, 
        userId: user.id, 
        user_id: user.id, 
        content: activeTab === "text" ? pitchContent : "",
        transcript: activeTab === "voice" ? transcript : "",
        audioUrl: activeTab === "voice" ? audioURL || "" : "",
        audio_url: activeTab === "voice" ? audioURL || "" : "",
        status: "pending", // Always use pending status initially
        bidAmount: bidAmount,
        bid_amount: bidAmount,
        paymentIntentId: paymentIntentId,
        payment_intent_id: paymentIntentId 
      };
      
      console.log("Submitting pitch:", pitchData);
      const pitchRes = await apiRequest("POST", "/api/pitches", pitchData);
      
      if (!pitchRes.ok) {
        const pitchError = await pitchRes.json();
        throw new Error(pitchError.message || "Failed to submit pitch");
      }
      
      return { bid: await bidRes.json(), pitch: await pitchRes.json() };
    },
    onSuccess: () => {
      toast({
        title: "Submission successful",
        description: "Your pitch and bid have been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/opportunities/${opportunity.id}/bids`] });
      queryClient.invalidateQueries({ queryKey: [`/api/opportunities/${opportunity.id}/pitches`] });
      onClose();
    },
    onError: (error: any) => {
      if (error.message === "SUBSCRIPTION_REQUIRED") {
        // Show paywall modal instead of toast
        setShowPaywallModal(true);
        return;
      }
      
      if (error.message.includes("Bid amount must be higher")) {
        const match = error.message.match(/minimumBid: (\d+)/);
        if (match && match[1]) {
          const newMinimum = parseInt(match[1]);
          setBidAmount(newMinimum);
          toast({
            title: "Bid too low",
            description: `Your bid must be at least $${newMinimum}.`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit. Please try again.",
          variant: "destructive"
        });
      }
    }
  });

  return (
    <>
      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        title="Subscription Required"
        description="You need an active subscription to submit pitches for opportunities."
      />

      {/* Main Pitch Modal */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto pb-12 md:pb-6">
          <DialogHeader>
            <DialogTitle>Submit Your Pitch & Bid</DialogTitle>
            <DialogDescription>
              Pitch your expertise and place a bid for {opportunity.publication.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <img 
                src={opportunity.publication.logo} 
                alt={opportunity.publication.name} 
                className="h-8 mr-3" 
              />
              <h4 className="font-medium text-gray-900">{opportunity.title}</h4>
            </div>
            
            {/* Profile completion warning - only show if profile is not complete */}
            {user && !user.profileCompleted && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 text-sm">
                <div className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-blue-600 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium text-blue-800">Your profile is incomplete</p>
                    <p className="text-blue-700 mt-1">
                      Complete your profile to increase your chances of being selected by publications.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link href="/profile-setup">Complete Profile</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Bid Urgency Alert with view count */}
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 text-sm">
              <p className="text-amber-800 font-medium">
                <span className="inline-flex items-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-1 text-amber-800" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
                    />
                  </svg>
                  {expertViewCount} experts viewed this pitch—{bidCount} already bidding.
                </span>
              </p>
            </div>
            
            {/* Opportunity Description */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-1">Description:</h5>
              <p className="text-gray-700 text-sm italic">
                "{opportunity.description}"
              </p>
            </div>
            
            <div className="flex justify-between mb-4">
              <div className="text-sm">
                <p className="text-gray-600">
                  Current Bid: <span className="font-medium">{formatCurrency(currentHighestBid)}</span>
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {recentBidActivity}
                </p>
              </div>
              <div className="text-sm text-right">
                <p className="text-gray-600">
                  Closes in: <span className="font-medium">{timeRemaining}</span>
                </p>
                {bids && Array.isArray(bids) && bids.length > 0 && (
                  <div className="flex items-center justify-end mt-1">
                    {/* Avatars representing bidders */}
                    <div className="flex -space-x-2 mr-2">
                      {[...Array(Math.min(3, bids.length))].map((_, i) => (
                        <Avatar key={i} className="border-2 border-white w-6 h-6">
                          <AvatarFallback className="text-[10px]">U{i+1}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {bids.length > 3 && (
                      <span className="text-xs text-gray-500">+{bids.length - 3} others</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Bidding Section */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Bid Amount</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <Input
                  type="number"
                  min={currentHighestBid}
                  className="focus:ring-qpurple focus:border-qpurple block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2"
                  placeholder="0"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            
            {/* Pitch Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Your Pitch</label>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setActiveTab(activeTab === "text" ? "voice" : "text")}>
                  Switch to {activeTab === "text" ? "Voice" : "Text"} Pitch
                </Button>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="text">Text Pitch</TabsTrigger>
                  <TabsTrigger value="voice">Voice Pitch</TabsTrigger>
                </TabsList>
                
                <TabsContent value="text" className="mt-0">
                  <div>
                    {lastSavedAt && (
                      <div className="text-xs text-gray-500 mb-1 text-right">
                        {autoSaving ? "Saving..." : `Last saved at ${lastSavedAt.toLocaleTimeString()}`}
                      </div>
                    )}
                    <Textarea
                      placeholder="Describe why you're the right expert for this opportunity..."
                      rows={5}
                      className="shadow-sm focus:ring-qpurple focus:border-qpurple block w-full sm:text-sm border-gray-300 rounded-md resize-none"
                      value={pitchContent}
                      onChange={handlePitchContentChange}
                      onBlur={saveDraft}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="voice" className="mt-0">
                  <div className="mb-4 text-center">
                    <div className="w-20 h-20 mx-auto bg-qpurple bg-opacity-10 rounded-full flex items-center justify-center mb-3">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-8 w-8 text-qpurple" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                        />
                      </svg>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {isRecording ? 
                        <span className="text-red-500 font-medium">Recording: {formatTime(recordingTime)}</span> :
                        <span>Recording Time: <span className="font-medium">{formatTime(recordingTime)}</span></span>
                      }
                    </div>
                    <div className="flex justify-center space-x-3">
                      {isRecording ? (
                        <Button 
                          onClick={stopRecording}
                          className="px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="2" 
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                            />
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="2" 
                              d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" 
                            />
                          </svg>
                        </Button>
                      ) : (
                        <Button 
                          onClick={startRecording}
                          disabled={!!audioURL || isProcessing}
                          className="px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-qpurple hover:bg-qpurple-dark"
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="2" 
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                            />
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="2" 
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                            />
                          </svg>
                        </Button>
                      )}
                    </div>
                    
                    {audioURL && (
                      <div className="mt-3">
                        <audio controls src={audioURL} className="w-full"></audio>
                      </div>
                    )}
                    
                    {isProcessing && (
                      <div className="mt-3 text-sm text-gray-600">
                        Processing your recording...
                      </div>
                    )}
                    
                    {transcript && (
                      <div className="mt-4 text-left">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transcript (editable)</label>
                        <Textarea
                          rows={4}
                          className="shadow-sm focus:ring-qpurple focus:border-qpurple block w-full sm:text-sm border-gray-300 rounded-md resize-none"
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          onBlur={saveDraft}
                          disabled={isProcessing || processRecording.isPending}
                        />
                        {lastSavedAt && (
                          <div className="text-xs text-gray-500 mt-1 text-right">
                            {autoSaving ? "Saving..." : `Last saved at ${lastSavedAt.toLocaleTimeString()}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          {/* Bid History (if applicable) */}
          {!isBidsLoading && bids && Array.isArray(bids) && bids.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Recent Bid Activity</h5>
              <div className="space-y-2">
                {bids.slice(0, 5).map((bid: Bid, index: number) => (
                  <div key={bid.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">Anonymous</span>
                    <span className="font-medium">{formatCurrency(bid.amount)}</span>
                  </div>
                ))}
                {opportunity.minimumBid !== null && opportunity.minimumBid > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Starting bid</span>
                    <span className="font-medium">{formatCurrency(opportunity.minimumBid)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} className="mt-2 sm:mt-0">
                Cancel
              </Button>
              <Button 
                variant="secondary" 
                onClick={saveDraft}
                disabled={autoSaving || (!pitchContent.trim() && !transcript)}
                className="mt-2 sm:mt-0"
              >
                {autoSaving ? "Saving..." : "Save Draft"}
              </Button>
            </div>
            <Button 
              onClick={() => submitPitchAndBid.mutate()}
              disabled={
                bidAmount < currentHighestBid || 
                submitPitchAndBid.isPending || 
                (activeTab === "text" && !pitchContent.trim()) ||
                (activeTab === "voice" && (!audioURL || !transcript || isProcessing || processRecording.isPending))
              }
              className="bg-qpurple hover:bg-qpurple/90"
            >
              {submitPitchAndBid.isPending ? "Submitting..." : "Submit Pitch & Bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}