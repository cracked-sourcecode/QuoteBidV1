import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon, Clock, DollarSign, User, FileText, ExternalLink, PenSquare, Award, HandIcon, CheckCircle2, XCircle, ArrowRight, CircleCheck, Send, MessageSquare } from "lucide-react";
import PitchProgressTracker from "@/components/pitch-progress-tracker";
import PitchMessageThread from "@/components/pitch-message-thread";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { getStage, getStageTimestamps, getPublicationName, stageCopy } from "@/utils/pitchStage";
import { PitchDTO } from "@/utils/pitchInterfaces";

interface PitchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitch: PitchDTO;
}

export default function PitchReviewModal({ isOpen, onClose, pitch }: PitchReviewModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'status' | 'content' | 'messages'>('status');

  // Get the canonical status for the pitch
  const stage = getStage(pitch);
  console.log("PitchReviewModal - Pitch details:", { 
    id: pitch.id, 
    status: pitch.status, 
    isDraft: pitch.isDraft, 
    paymentIntentId: pitch.paymentIntentId,
    stage: stage
  });
  
  // Fix issue with 'sent' status mapping to stageCopy
  // Map any status not in stageCopy to one that is
  let mappedStage = stage;
  if (!(stage in stageCopy)) {
    // Map legacy statuses to their canonical equivalents
    if (stage === 'sent') mappedStage = 'sent_to_reporter';
    else if (stage === 'interested') mappedStage = 'reporter_interested';
    else if (stage === 'not_interested') mappedStage = 'reporter_not_interested';
    else if (stage === 'successful') mappedStage = 'successful_coverage';
    else mappedStage = 'pending'; // Default fallback
  }
  
  const stageInfo = stageCopy[mappedStage as keyof typeof stageCopy];
  
  const createdDate = new Date(pitch.createdAt);
  // Include both canonical and legacy statuses for complete compatibility
  const isPending = stage === 'draft' || stage === 'pending';
  const isInProgress = stage === 'sent_to_reporter' || stage === 'reporter_interested' || 
                       stage === 'sent' || stage === 'interested';
  const isSuccessful = stage === 'successful_coverage' || stage === 'successful';
  const isRejected = stage === 'reporter_not_interested' || stage === 'not_interested';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Pitch Status: {pitch.opportunity?.title}
          </DialogTitle>
          <div className="flex space-x-2 mt-2">
            <Button 
              variant={activeTab === 'status' ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab('status')}
            >
              Status
            </Button>
            <Button 
              variant={activeTab === 'content' ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab('content')}
            >
              Pitch Content
            </Button>
            <Button 
              variant={activeTab === 'messages' ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab('messages')}
              className="flex items-center gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              Messages
            </Button>
          </div>
        </DialogHeader>
        
        {activeTab === 'messages' ? (
          <div className="mt-4">
            <div className="rounded-lg border p-4 bg-white">
              <h3 className="text-base font-medium mb-4">Communication with Reporter</h3>
              <PitchMessageThread pitch={pitch} />
            </div>
          </div>
        ) : activeTab === 'status' ? (
          <div className="mt-4 space-y-6">
            {/* Only display Progress Tracker when status tab is selected */}
            <div className="rounded-lg border p-4 pb-2 bg-white">
              <h3 className="text-base font-medium mb-4">Pitch Progress</h3>
              <PitchProgressTracker 
                currentStage={stage} 
                stageTimestamps={getStageTimestamps(pitch)}
                needsFollowUp={pitch.needsFollowUp}
                pitch={{
                  paymentIntentId: pitch.paymentIntentId || null
                }}
              />
            </div>



            {/* Status-specific content */}
            {isPending && (
              <div className="rounded-lg border p-4 bg-white">
                <h3 className="text-base font-medium mb-3">Next Steps</h3>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start">
                    <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      {stageInfo.nextSteps}
                      <Button 
                        className="mt-3 block"
                        size="sm"
                        onClick={() => {
                          onClose();
                          window.location.href = `/opportunities/${pitch.opportunityId}`;
                        }}
                      >
                        Continue Writing Pitch
                      </Button>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isInProgress && (
              <div className="rounded-lg border p-4 bg-white">
                <h3 className="text-base font-medium mb-3">
                  {stage === 'reporter_interested' ? 'Reporter is Interested!' : 'Pitch Being Reviewed'}
                </h3>
                <div className={`p-4 ${stage === 'reporter_interested' ? 'bg-yellow-50' : 'bg-blue-50'} rounded-lg`}>
                  <div className="flex items-start">
                    <CheckCircle2 className={`h-5 w-5 ${stage === 'reporter_interested' ? 'text-yellow-600' : 'text-blue-600'} mt-0.5 mr-2 flex-shrink-0`} />
                    <div>
                      <p className={`text-sm ${stage === 'reporter_interested' ? 'text-yellow-800' : 'text-blue-800'}`}>
                        {stageInfo.nextSteps}
                      </p>
                      
                      <div className="mt-3 p-3 bg-white rounded border">
                        <h4 className="text-sm font-medium">Pitch Details</h4>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-xs text-gray-600">
                              Submitted: {format(createdDate, "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-xs text-gray-600">Bid: ${pitch.bidAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {stage === 'reporter_interested' && pitch.needsFollowUp && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm font-medium text-red-700 flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            Follow-up needed
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            The reporter has requested additional information. Please check your email and respond promptly.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isSuccessful && (
              <div className="rounded-lg border p-4 bg-white">
                <h3 className="text-base font-medium mb-3">
                  <span className="flex items-center">
                    <Award className="h-5 w-5 text-green-600 mr-2" />
                    Congratulations! Your Pitch was Published
                  </span>
                </h3>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800 mb-3">
                    Your expertise has been featured! The article has been published and your payment is being processed.
                  </p>
                  
                  {pitch.article && (
                    <div className="bg-white p-3 rounded border border-green-200">
                      <h4 className="text-sm font-medium mb-2">Published Article</h4>
                      <a 
                        href={pitch.article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        {pitch.article.title || "View Published Article"}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                  
                  <div className="mt-3 flex items-center">
                    <CircleCheck className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-700">
                      Payment processed: ${pitch.bidAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="rounded-lg border p-4 bg-white">
                <h3 className="text-base font-medium mb-3">
                  <span className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    Reporter Passed on Your Pitch
                  </span>
                </h3>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800 mb-3">
                    The reporter has decided not to pursue this pitch. Don't be discouraged - this is common in the industry.
                  </p>
                  
                  <div className="bg-white p-3 rounded border border-red-200">
                    <h4 className="text-sm font-medium mb-1">Next Steps</h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Browse other opportunities that match your expertise. Your knowledge is valuable!
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        onClose();
                        window.location.href = '/opportunities';
                      }}
                    >
                      Browse Other Opportunities
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Opportunity details */}
            <div className="rounded-lg border p-4 bg-white">
              <h3 className="text-base font-medium mb-3">Opportunity Details</h3>
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium">{pitch.opportunity?.title}</h4>
                {pitch.opportunity?.outlet && (
                  <p className="text-sm text-muted-foreground mt-1">{pitch.opportunity.outlet}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {format(createdDate, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">${pitch.bidAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {/* Pitch content */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium">Your Pitch</h3>
                <Badge className={stageInfo.color}>
                  {stageInfo.label}
                </Badge>
              </div>
              <div className="whitespace-pre-wrap p-4 rounded-md bg-gray-50 dark:bg-gray-900 border min-h-[200px]">
                {pitch.content}
              </div>
              
              <div className="flex justify-between items-center text-sm text-gray-500 pt-2">
                <div>
                  Submitted: {format(createdDate, "MMM d, yyyy")}
                </div>
                <div>
                  Bid Amount: ${pitch.bidAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {stage === "successful_coverage" && pitch.article && (
            <Button 
              variant="default" 
              className="gap-2"
              onClick={() => {
                window.open(pitch.article?.url, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4" />
              View Published Article
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}