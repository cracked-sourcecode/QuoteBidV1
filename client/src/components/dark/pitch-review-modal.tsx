import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { 
  Calendar, 
  DollarSign, 
  ExternalLink, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  FileText,
  Target,
  Eye,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap
} from "lucide-react";
import DarkPitchProgressTracker from "@/components/dark/pitch-progress-tracker";
import { useState } from "react";
import { getStage, getStageTimestamps, stageCopy } from "@/utils/pitchStage";
import { PitchDTO } from "@/utils/pitchInterfaces";

interface PitchReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitch: PitchDTO;
}

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'pending':
      return { 
        label: 'Under Review', 
        color: 'bg-blue-900/30 text-blue-400 border border-blue-700/50', 
        icon: Clock
      };
    case 'sent':
    case 'sent_to_reporter':
      return { 
        label: 'Sent to Reporter', 
        color: 'bg-purple-900/30 text-purple-400 border border-purple-700/50', 
        icon: Send
      };
    case 'interested':
    case 'reporter_interested':
      return { 
        label: 'Reporter Interested', 
        color: 'bg-amber-900/30 text-amber-400 border border-amber-700/50', 
        icon: Eye
      };
    case 'successful':
    case 'successful_coverage':
      return { 
        label: 'Published', 
        color: 'bg-green-900/30 text-green-400 border border-green-700/50', 
        icon: Award
      };
    case 'not_interested':
      return { 
        label: 'Not Selected', 
        color: 'bg-red-900/30 text-red-400 border border-red-700/50', 
        icon: XCircle
      };
    case 'draft':
      return { 
        label: 'Draft', 
        color: 'bg-gray-900/30 text-gray-400 border border-gray-700/50', 
        icon: FileText
      };
    default:
      return { 
        label: 'Under Review', 
        color: 'bg-blue-900/30 text-blue-400 border border-blue-700/50', 
        icon: Clock
      };
  }
};

export default function DarkPitchReviewModal({ isOpen, onClose, pitch }: PitchReviewModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'status' | 'content' | 'deliverable'>('status');

  // DEBUG: Log pitch data to see what we're getting
  if (isOpen) {
    console.log("🔍 MODAL DEBUG: Pitch data received:", {
      id: pitch.id,
      status: pitch.status,
      hasArticle: !!pitch.article,
      articleUrl: pitch.article?.url,
      articleTitle: pitch.article?.title,
      fullPitchObject: pitch
    });
  }

  const stage = getStage(pitch);
  
  let mappedStage = stage;
  if (!(stage in stageCopy)) {
    if (stage === 'sent') mappedStage = 'sent_to_reporter';
    else if (stage === 'interested') mappedStage = 'reporter_interested';
    else if (stage === 'not_interested') mappedStage = 'reporter_not_interested';
    else if (stage === 'successful') mappedStage = 'successful_coverage';
    else mappedStage = 'pending';
  }
  
  const stageInfo = stageCopy[mappedStage as keyof typeof stageCopy];
  const statusDisplay = getStatusDisplay(stage);
  const StatusIcon = statusDisplay.icon;
  const createdDate = new Date(pitch.createdAt);
  
  const isPending = stage === 'draft' || stage === 'pending';
  const isInProgress = stage === 'sent_to_reporter' || stage === 'reporter_interested' || 
                       stage === 'sent' || stage === 'interested';
  const isSuccessful = stage === 'successful_coverage' || stage === 'successful';
  const isRejected = stage === 'reporter_not_interested' || stage === 'not_interested';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-800/95 backdrop-blur-sm border-slate-700/50 text-white">
        <DialogHeader className="border-b border-slate-700/50 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-6">
              <DialogTitle className="text-xl font-bold text-white mb-2">
                {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Unknown Publication"}: {pitch.opportunity?.title || `Pitch #${pitch.id}`}
              </DialogTitle>
              
              <div className="flex items-center space-x-4 mb-3">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.color}`}>
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {statusDisplay.label}
                </div>
                
                {(isSuccessful || isInProgress) && (
                  <div className="flex items-center bg-blue-900/30 px-3 py-1 rounded-full border border-blue-700/50 text-blue-300">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    <span className="text-sm">Do-follow link included</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-300">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Submitted {format(createdDate, "MMM d, yyyy")}</span>
                </div>
                
                {isSuccessful && pitch.article && (
                  <div className="flex items-center text-green-300">
                    <Award className="h-4 w-4 mr-1" />
                    <span>Published</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-shrink-0 mr-8">
              <div className="bg-green-900/30 border border-green-700/50 rounded-lg px-4 py-3 text-center">
                <div className="text-xs font-medium text-green-300 uppercase mb-1">
                  Bid Amount
                </div>
                <div className="text-lg font-bold text-green-200">
                  ${pitch.bidAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          
          {isSuccessful && pitch.article?.url && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between bg-green-900/30 rounded-lg px-4 py-3 border border-green-700/50">
              <div className="flex items-center text-green-300">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <div>
                  <div className="font-semibold text-green-200">Success! Payment processed</div>
                  <div className="text-sm text-green-300">Article published</div>
                </div>
              </div>
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Article
                </a>
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="flex border-b border-slate-700/50">
          <button 
            onClick={() => setActiveTab('status')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'status' 
                ? 'border-b-2 border-blue-500 text-blue-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Status
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'content' 
                ? 'border-b-2 border-blue-500 text-blue-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pitch Content
            </div>
          </button>
          {pitch.article?.url && (
            <button 
              onClick={() => setActiveTab('deliverable')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'deliverable' 
                  ? 'border-b-2 border-blue-500 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Deliverable
              </div>
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-slate-800/30">
          {activeTab === 'status' ? (
            <div className="space-y-6">
              <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
                  Progress Timeline
                </h3>
                <DarkPitchProgressTracker 
                  currentStage={stage} 
                  stageTimestamps={getStageTimestamps(pitch)}
                  needsFollowUp={pitch.needsFollowUp}
                  pitch={{
                    paymentIntentId: pitch.paymentIntentId || null
                  }}
                />
              </div>

              {isPending && (
                <div className="rounded-lg p-6 border bg-blue-900/30 border-blue-700/50">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-600">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 text-blue-200">Your pitch is being reviewed!</h3>
                      <p className="mb-4 text-blue-300">We've sent your pitch to the reporter. You'll get notified as soon as they respond!</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                          <div className="text-sm text-gray-300">Submitted</div>
                          <div className="font-semibold text-white">{format(createdDate, "MMM d, yyyy")}</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                          <div className="text-sm text-gray-300">Bid Amount</div>
                          <div className="font-semibold text-green-300">${pitch.bidAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isInProgress && (
                <div className={`rounded-lg p-6 border ${
                  stage === 'reporter_interested' 
                    ? 'bg-purple-900/30 border-purple-700/50' 
                    : 'bg-blue-900/30 border-blue-700/50'
                }`}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        stage === 'reporter_interested' 
                          ? 'bg-purple-600' 
                          : 'bg-blue-600'
                      }`}>
                        <StatusIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg mb-2 ${
                        stage === 'reporter_interested' ? 'text-purple-200' : 'text-blue-200'
                      }`}>
                        {stage === 'reporter_interested' ? 'Amazing! The reporter is interested!' : 'Your pitch is being reviewed'}
                      </h3>
                      <p className={`mb-4 ${
                        stage === 'reporter_interested' ? 'text-purple-300' : 'text-blue-300'
                      }`}>
                        {stageInfo.nextSteps}
                      </p>
                      
                      {stage === 'reporter_interested' && pitch.needsFollowUp && (
                        <div className="bg-slate-700/50 border border-orange-700/50 rounded-lg p-4">
                          <div className="flex items-center mb-2 text-orange-300">
                            <Clock className="h-4 w-4 mr-2" />
                            <span className="font-semibold">Follow-up needed</span>
                          </div>
                          <p className="text-sm text-orange-400">
                            Check your email for additional info requests.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isSuccessful && (
                <div className="rounded-lg p-6 border bg-green-900/30 border-green-700/50">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-600">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 text-green-200">Congratulations! Your pitch was published!</h3>
                      <p className="mb-4 text-green-300">Your expertise is now live and your payment has been processed!</p>
                      
                      <div className="flex items-center bg-slate-700/50 rounded-lg p-4 border border-green-700/50">
                        <CheckCircle2 className="h-5 w-5 mr-3 text-green-400" />
                        <div>
                          <div className="font-semibold text-green-300">Payment Processed</div>
                          <div className="text-green-400">${pitch.bidAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'content' ? (
            <div>
              <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-purple-400" />
                  Your Pitch
                </h3>
                
                <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600/50">
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-200">
                    "{pitch.content}" 
                    
                    <div className="mt-4 pt-4 border-t border-slate-600/50">
                      <span className="text-gray-300">— {user ? `${user.fullName}, ${user.title || 'Expert'}` : 'Unknown User'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-600/50">
                  <div className="flex items-center text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Submitted {format(createdDate, "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center bg-green-900/30 px-3 py-1 rounded-full border border-green-700/50">
                    <span className="font-semibold text-green-300">${pitch.bidAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center">
                  <ExternalLink className="h-5 w-5 mr-2 text-green-400" />
                  Published Article
                </h3>
                
                {pitch.article?.url ? (
                  <div className="rounded-lg p-6 border bg-green-900/30 border-green-700/50">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-600">
                          <Award className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2 text-green-200">Your Article is Live! 🎉</h4>
                        <p className="mb-4 text-green-300">Congratulations! Your expertise has been published and is now available online.</p>
                        
                        <div className="bg-slate-700/50 border border-green-700/50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="font-semibold mb-1 text-white">Article Details</h5>
                              {pitch.article.title && (
                                <p className="text-sm mb-2 text-gray-300">{pitch.article.title}</p>
                              )}
                              <p className="text-xs break-all text-gray-400">{pitch.article.url}</p>
                            </div>
                            <Button asChild className="ml-4 flex-shrink-0 bg-green-600 hover:bg-green-700 text-white">
                              <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Read Article
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600/50 text-center">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 bg-slate-600">
                      <ExternalLink className="h-6 w-6 text-gray-400" />
                    </div>
                    <h4 className="font-semibold mb-2 text-gray-300">No Article Link Available</h4>
                    <p className="text-sm text-gray-400">The published article link will appear here once it's available.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 