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
  MessageSquare, 
  FileText,
  Target,
  Eye,
  X,
  ArrowRight
} from "lucide-react";
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

// Status configuration for clean display
const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'Under Review', color: 'bg-blue-100 text-blue-800', icon: Clock };
    case 'sent':
    case 'sent_to_reporter':
      return { label: 'Sent to Reporter', color: 'bg-blue-100 text-blue-800', icon: Send };
    case 'interested':
    case 'reporter_interested':
      return { label: 'Reporter Interested', color: 'bg-purple-100 text-purple-800', icon: Eye };
    case 'successful':
    case 'successful_coverage':
      return { label: 'Published', color: 'bg-green-100 text-green-800', icon: Award };
    case 'not_interested':
      return { label: 'Not Selected', color: 'bg-red-100 text-red-800', icon: XCircle };
    case 'draft':
      return { label: 'Draft', color: 'bg-amber-100 text-amber-800', icon: FileText };
    default:
      return { label: 'Under Review', color: 'bg-blue-100 text-blue-800', icon: Clock };
  }
};

export default function PitchReviewModal({ isOpen, onClose, pitch }: PitchReviewModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'status' | 'content' | 'messages'>('status');

  // Get the canonical status for the pitch
  const stage = getStage(pitch);
  
  // Fix issue with 'sent' status mapping to stageCopy
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
        {/* Clean Header */}
        <DialogHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-start space-x-3 mb-3">
                <div className="flex-1">
                  <DialogTitle className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                    {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Unknown Publication"}: {pitch.opportunity?.title || `Pitch #${pitch.id}`}
                  </DialogTitle>
                  
                  {/* Status Badge */}
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusDisplay.color}`}>
                      <StatusIcon className="h-4 w-4 mr-2" />
                      {statusDisplay.label}
                    </span>
                    
                    {/* Do Follow Link Info */}
                    {(isSuccessful || isInProgress) && (
                      <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                        <ExternalLink className="h-3 w-3 text-blue-600 mr-1.5" />
                        <span className="text-xs font-medium text-blue-700">Do-follow link included</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Bid Amount Highlight */}
                <div className="flex-shrink-0 text-right">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-3 py-2">
                    <div className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">Bid Amount</div>
                    <div className="text-xl font-bold text-green-900">${pitch.bidAmount.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              {/* Meta Info */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                    {pitch.opportunity?.publication?.logo ? (
                      <img 
                        src={pitch.opportunity.publication.logo} 
                        alt={pitch.opportunity.publication.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <FileText className="h-3 w-3 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-xs">{pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Unknown Publication"}</div>
                    <div className="text-xs text-gray-500">Publication</div>
                  </div>
                </div>
                
                <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg">
                  <Calendar className="h-3 w-3 mr-2 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900 text-xs">{format(createdDate, "MMM d, yyyy")}</div>
                    <div className="text-xs text-gray-500">Submitted</div>
                  </div>
                </div>
                
                {isSuccessful && pitch.article && (
                  <div className="flex items-center bg-green-50 px-2 py-1.5 rounded-lg border border-green-200">
                    <Award className="h-3 w-3 mr-2 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900 text-xs">Published</div>
                      <div className="text-xs text-green-600">Live article</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Actions for Successful Pitches */}
          {isSuccessful && pitch.article && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  <span>Payment processed • Article published</span>
                </div>
                <Button size="sm" asChild className="bg-green-600 hover:bg-green-700 text-white">
                  <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Article
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Modern Tab Navigation */}
        <div className="flex space-x-0 bg-gray-50 p-1 rounded-xl mt-4 mx-6">
          <button 
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'status' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Status
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'content' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pitch Content
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'messages' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Messages
          </button>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {activeTab === 'messages' ? (
            <div className="mt-4">
              <PitchMessageThread pitch={pitch} />
            </div>
          ) : activeTab === 'status' ? (
            <div className="mt-4 space-y-4">
              {/* Progress Section */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Progress</h3>
                <PitchProgressTracker 
                  currentStage={stage} 
                  stageTimestamps={getStageTimestamps(pitch)}
                  needsFollowUp={pitch.needsFollowUp}
                  pitch={{
                    paymentIntentId: pitch.paymentIntentId || null
                  }}
                />
              </div>

              {/* Status-specific content with better visual impact */}
              {isPending && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-blue-900 mb-2 text-lg">🚀 Your pitch is being reviewed!</h3>
                      <p className="text-blue-700 mb-3 text-sm">We've sent your pitch to the reporter. You'll get notified as soon as they respond!</p>
                      
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-600 font-medium">Submitted</span>
                            <p className="font-bold text-gray-900">{format(createdDate, "MMM d, yyyy")}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">Bid Amount</span>
                            <p className="font-bold text-green-600">${pitch.bidAmount.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isInProgress && (
                <div className={`rounded-xl p-4 border ${stage === 'reporter_interested' ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stage === 'reporter_interested' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                        <StatusIcon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold mb-2 text-lg ${stage === 'reporter_interested' ? 'text-purple-900' : 'text-blue-900'}`}>
                        {stage === 'reporter_interested' ? '🎉 Amazing! The reporter is interested!' : '⏳ Your pitch is being reviewed'}
                      </h3>
                      <p className={`mb-3 text-sm ${stage === 'reporter_interested' ? 'text-purple-700' : 'text-blue-700'}`}>
                        {stageInfo.nextSteps}
                      </p>
                      
                      {stage === 'reporter_interested' && pitch.needsFollowUp && (
                        <div className="bg-white border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center text-orange-800">
                            <Clock className="h-4 w-4 mr-2" />
                            <span className="font-medium text-sm">Follow-up needed</span>
                          </div>
                          <p className="text-xs text-orange-700 mt-1">
                            Check your email for additional info requests.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isSuccessful && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Award className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-green-900 mb-2 text-lg">🎉 Congratulations! Your pitch was published!</h3>
                      <p className="text-green-700 mb-3 text-sm">Your expertise is now live and your payment has been processed!</p>
                      
                      {pitch.article && (
                        <div className="bg-white border border-green-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm">Published Article</h4>
                              {pitch.article.title && (
                                <p className="text-xs text-gray-600 mt-1">{pitch.article.title}</p>
                              )}
                            </div>
                            <Button size="sm" asChild className="bg-green-600 hover:bg-green-700 text-white">
                              <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Read
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-green-700 bg-white rounded-lg p-2">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        <span className="font-medium">Payment processed: ${pitch.bidAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <XCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-900 mb-2 text-lg">This pitch wasn't selected</h3>
                      <p className="text-red-700 mb-3 text-sm">The reporter decided not to pursue this story. This happens—keep pitching and you'll get published soon! 💪</p>
                      
                      <Button 
                        size="sm" 
                        onClick={() => {
                          onClose();
                          window.location.href = '/opportunities';
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Find New Opportunities
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              {/* Pitch Content */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Your Pitch</h3>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed text-sm min-h-[150px]">
                    "{pitch.content}" - {user ? `${user.fullName}, ${user.title || 'Not specified'}, ${user.doFollowLink && user[user.doFollowLink as keyof typeof user] ? user[user.doFollowLink as keyof typeof user] : 'Not specified'}` : 'Unknown User'}
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                  <span>Submitted {format(createdDate, "MMM d, yyyy")}</span>
                  <span className="font-medium">Bid: ${pitch.bidAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}