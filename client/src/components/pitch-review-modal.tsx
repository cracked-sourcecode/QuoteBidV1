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
import PitchProgressTracker from "@/components/pitch-progress-tracker";
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
        color: 'bg-blue-100 text-blue-800 border border-blue-200', 
        icon: Clock
      };
    case 'sent':
    case 'sent_to_reporter':
      return { 
        label: 'Sent to Reporter', 
        color: 'bg-purple-100 text-purple-800 border border-purple-200', 
        icon: Send
      };
    case 'interested':
    case 'reporter_interested':
      return { 
        label: 'Reporter Interested', 
        color: 'bg-amber-100 text-amber-800 border border-amber-200', 
        icon: Eye
      };
    case 'successful':
    case 'successful_coverage':
      return { 
        label: 'Published', 
        color: 'bg-green-100 text-green-800 border border-green-200', 
        icon: Award
      };
    case 'not_interested':
      return { 
        label: 'Not Selected', 
        color: 'bg-red-100 text-red-800 border border-red-200', 
        icon: XCircle
      };
    case 'draft':
      return { 
        label: 'Draft', 
        color: 'bg-gray-100 text-gray-800 border border-gray-200', 
        icon: FileText
      };
    default:
      return { 
        label: 'Under Review', 
        color: 'bg-blue-100 text-blue-800 border border-blue-200', 
        icon: Clock
      };
  }
};

export default function PitchReviewModal({ isOpen, onClose, pitch }: PitchReviewModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'status' | 'content'>('status');

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-6">
              <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Unknown Publication"}: {pitch.opportunity?.title || `Pitch #${pitch.id}`}
              </DialogTitle>
              
              <div className="flex items-center space-x-4 mb-3">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.color}`}>
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {statusDisplay.label}
                </div>
                
                {(isSuccessful || isInProgress) && (
                  <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    <ExternalLink className="h-3 w-3 text-blue-600 mr-1" />
                    <span className="text-sm text-blue-700">Do-follow link included</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Submitted {format(createdDate, "MMM d, yyyy")}</span>
                </div>
                
                {isSuccessful && pitch.article && (
                  <div className="flex items-center text-green-700">
                    <Award className="h-4 w-4 mr-1" />
                    <span>Published</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
                <div className="text-xs font-medium text-green-700 uppercase mb-1">
                  Bid Amount
                </div>
                <div className="text-lg font-bold text-green-800">
                  ${pitch.bidAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          
          {isSuccessful && pitch.article && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-4 py-3 border border-green-200">
                <div className="flex items-center text-green-700">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  <div>
                    <div className="font-semibold">Success! Payment processed</div>
                    <div className="text-sm">Article published</div>
                  </div>
                </div>
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                  <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Article
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('status')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'status' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
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
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pitch Content
            </div>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'status' ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Progress Timeline
                </h3>
                <PitchProgressTracker 
                  currentStage={stage} 
                  stageTimestamps={getStageTimestamps(pitch)}
                  needsFollowUp={pitch.needsFollowUp}
                  pitch={{
                    paymentIntentId: pitch.paymentIntentId || null
                  }}
                />
              </div>

              {isPending && (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 text-lg mb-2">Your pitch is being reviewed!</h3>
                      <p className="text-blue-700 mb-4">We've sent your pitch to the reporter. You'll get notified as soon as they respond!</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <div className="text-sm text-gray-600">Submitted</div>
                          <div className="font-semibold text-gray-900">{format(createdDate, "MMM d, yyyy")}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <div className="text-sm text-gray-600">Bid Amount</div>
                          <div className="font-semibold text-green-600">${pitch.bidAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isInProgress && (
                <div className={`rounded-lg p-6 border ${
                  stage === 'reporter_interested' 
                    ? 'bg-purple-50 border-purple-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        stage === 'reporter_interested' 
                          ? 'bg-purple-500' 
                          : 'bg-blue-500'
                      }`}>
                        <StatusIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg mb-2 ${
                        stage === 'reporter_interested' ? 'text-purple-900' : 'text-blue-900'
                      }`}>
                        {stage === 'reporter_interested' ? 'Amazing! The reporter is interested!' : 'Your pitch is being reviewed'}
                      </h3>
                      <p className={`mb-4 ${
                        stage === 'reporter_interested' ? 'text-purple-700' : 'text-blue-700'
                      }`}>
                        {stageInfo.nextSteps}
                      </p>
                      
                      {stage === 'reporter_interested' && pitch.needsFollowUp && (
                        <div className="bg-white border border-orange-200 rounded-lg p-4">
                          <div className="flex items-center text-orange-800 mb-2">
                            <Clock className="h-4 w-4 mr-2" />
                            <span className="font-semibold">Follow-up needed</span>
                          </div>
                          <p className="text-orange-700 text-sm">
                            Check your email for additional info requests.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isSuccessful && (
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 text-lg mb-2">Congratulations! Your pitch was published!</h3>
                      <p className="text-green-700 mb-4">Your expertise is now live and your payment has been processed!</p>
                      
                      {pitch.article && (
                        <div className="bg-white border border-green-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">Published Article</h4>
                              {pitch.article.title && (
                                <p className="text-gray-600 text-sm">{pitch.article.title}</p>
                              )}
                            </div>
                            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                              <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Read Article
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center bg-white rounded-lg p-4 border border-green-200">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-3" />
                        <div>
                          <div className="font-semibold text-green-900">Payment Processed</div>
                          <div className="text-green-700">${pitch.bidAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                        <XCircle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-2 text-lg">This pitch wasn't selected</h3>
                      <p className="text-red-700 mb-4">The reporter decided not to pursue this story. This happens—keep pitching and you'll get published soon! 💪</p>
                      
                      <Button 
                        onClick={() => {
                          onClose();
                          window.location.href = '/opportunities';
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Find New Opportunities
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-purple-600" />
                  Your Pitch
                </h3>
                
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    "{pitch.content}" 
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="text-gray-600">— {user ? `${user.fullName}, ${user.title || 'Expert'}` : 'Unknown User'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Submitted {format(createdDate, "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    <span className="font-semibold text-green-700">${pitch.bidAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}