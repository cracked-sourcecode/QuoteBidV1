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
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap
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

// Enhanced status configuration with modern styling
const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'pending':
      return { 
        label: 'Under Review', 
        color: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200', 
        icon: Clock,
        gradient: 'from-blue-50 to-indigo-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900'
      };
    case 'sent':
    case 'sent_to_reporter':
      return { 
        label: 'Sent to Reporter', 
        color: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200', 
        icon: Send,
        gradient: 'from-purple-50 to-pink-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-900'
      };
    case 'interested':
    case 'reporter_interested':
      return { 
        label: 'Reporter Interested', 
        color: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200', 
        icon: Eye,
        gradient: 'from-amber-50 to-orange-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-900'
      };
    case 'successful':
    case 'successful_coverage':
      return { 
        label: 'Published', 
        color: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200', 
        icon: Award,
        gradient: 'from-green-50 to-emerald-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-900'
      };
    case 'not_interested':
      return { 
        label: 'Not Selected', 
        color: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200', 
        icon: XCircle,
        gradient: 'from-red-50 to-rose-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900'
      };
    case 'draft':
      return { 
        label: 'Draft', 
        color: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200', 
        icon: FileText,
        gradient: 'from-gray-50 to-slate-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-900'
      };
    default:
      return { 
        label: 'Under Review', 
        color: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200', 
        icon: Clock,
        gradient: 'from-blue-50 to-indigo-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900'
      };
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 border-0 shadow-2xl">
        {/* Enhanced Header with Gradient Background */}
        <DialogHeader className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 pb-6 pt-6 px-8 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold text-gray-900 mb-3 leading-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Unknown Publication"}: {pitch.opportunity?.title || `Pitch #${pitch.id}`}
                  </DialogTitle>
                  
                  {/* Enhanced Status Badge */}
                  <div className="flex items-center space-x-4 mb-3">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${statusDisplay.color} shadow-sm`}>
                      <StatusIcon className="h-4 w-4 mr-2" />
                      {statusDisplay.label}
                    </div>
                    
                    {/* Enhanced Do Follow Link Info */}
                    {(isSuccessful || isInProgress) && (
                      <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-full border border-blue-200 shadow-sm">
                        <ExternalLink className="h-3 w-3 text-blue-600 mr-2" />
                        <span className="text-sm font-semibold text-blue-700">Do-follow link included</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Bid Amount Highlight */}
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-200/50 rounded-2xl px-6 py-4 shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="text-center">
                      <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center justify-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Bid Amount
                      </div>
                      <div className="text-2xl font-extrabold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                        ${pitch.bidAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Meta Info Cards */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center bg-white/70 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mr-3">
                    {pitch.opportunity?.publication?.logo ? (
                      <img 
                        src={pitch.opportunity.publication.logo} 
                        alt={pitch.opportunity.publication.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Unknown Publication"}</div>
                    <div className="text-xs text-gray-500 font-medium">Publication</div>
                  </div>
                </div>
                
                <div className="flex items-center bg-white/70 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mr-3">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{format(createdDate, "MMM d, yyyy")}</div>
                    <div className="text-xs text-gray-500 font-medium">Submitted</div>
                  </div>
                </div>
                
                {isSuccessful && pitch.article && (
                  <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-3">
                      <Award className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-green-900 text-sm">Published</div>
                      <div className="text-xs text-green-600 font-medium">Live article</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Enhanced Quick Actions for Successful Pitches */}
          {isSuccessful && pitch.article && (
            <div className="mt-6 pt-4 border-t border-gray-200/50">
              <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl px-6 py-4 border border-green-200/50">
                <div className="flex items-center text-green-700">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-green-900">Success!</div>
                    <div className="text-sm text-green-700">Payment processed • Article published</div>
                  </div>
                </div>
                <Button size="lg" asChild className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                  <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Live Article
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Enhanced Tab Navigation */}
        <div className="mx-8 mt-6">
          <div className="flex space-x-1 bg-white/70 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50 shadow-sm">
            <button 
              onClick={() => setActiveTab('status')}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'status' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Status
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('content')}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'content' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                Pitch Content
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'messages' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg transform scale-105' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messages
              </div>
            </button>
          </div>
        </div>
        
        {/* Enhanced Content Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {activeTab === 'messages' ? (
            <div className="mt-6">
              <PitchMessageThread pitch={pitch} />
            </div>
          ) : activeTab === 'status' ? (
            <div className="mt-6 space-y-6">
              {/* Enhanced Progress Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
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

              {/* Enhanced Status-specific content */}
              {isPending && (
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-blue-200/50 shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Clock className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <h3 className="font-bold text-blue-900 text-2xl mr-3">Your pitch is being reviewed!</h3>
                        <Sparkles className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="text-blue-700 mb-6 text-lg leading-relaxed">We've sent your pitch to the reporter. You'll get notified as soon as they respond!</p>
                      
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200/50 shadow-md">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Calendar className="h-6 w-6 text-gray-600" />
                            </div>
                            <span className="text-gray-600 font-semibold block mb-1">Submitted</span>
                            <p className="font-bold text-gray-900 text-lg">{format(createdDate, "MMM d, yyyy")}</p>
                          </div>
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <DollarSign className="h-6 w-6 text-green-600" />
                            </div>
                            <span className="text-gray-600 font-semibold block mb-1">Bid Amount</span>
                            <p className="font-bold text-green-600 text-lg">${pitch.bidAmount.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isInProgress && (
                <div className={`rounded-2xl p-8 border shadow-lg transform hover:scale-[1.02] transition-transform duration-300 ${
                  stage === 'reporter_interested' 
                    ? 'bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 border-purple-200/50' 
                    : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200/50'
                }`}>
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                        stage === 'reporter_interested' 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                          : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                      }`}>
                        <StatusIcon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <h3 className={`font-bold text-2xl mr-3 ${
                          stage === 'reporter_interested' ? 'text-purple-900' : 'text-blue-900'
                        }`}>
                          {stage === 'reporter_interested' ? 'Amazing! The reporter is interested!' : 'Your pitch is being reviewed'}
                        </h3>
                        {stage === 'reporter_interested' ? (
                          <Zap className="h-6 w-6 text-purple-500" />
                        ) : (
                          <Sparkles className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      <p className={`mb-6 text-lg leading-relaxed ${
                        stage === 'reporter_interested' ? 'text-purple-700' : 'text-blue-700'
                      }`}>
                        {stageInfo.nextSteps}
                      </p>
                      
                      {stage === 'reporter_interested' && pitch.needsFollowUp && (
                        <div className="bg-white/80 backdrop-blur-sm border border-orange-200/50 rounded-xl p-6 shadow-md">
                          <div className="flex items-center text-orange-800 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full flex items-center justify-center mr-3">
                              <Clock className="h-4 w-4 text-orange-600" />
                            </div>
                            <span className="font-bold text-lg">Follow-up needed</span>
                          </div>
                          <p className="text-orange-700 ml-11">
                            Check your email for additional info requests.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isSuccessful && (
                <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 border border-green-200/50 shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Award className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <h3 className="font-bold text-green-900 text-2xl mr-3">Congratulations! Your pitch was published!</h3>
                        <Sparkles className="h-6 w-6 text-green-500" />
                      </div>
                      <p className="text-green-700 mb-6 text-lg leading-relaxed">Your expertise is now live and your payment has been processed!</p>
                      
                      {pitch.article && (
                        <div className="bg-white/80 backdrop-blur-sm border border-green-200/50 rounded-xl p-6 mb-6 shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-lg mb-2">Published Article</h4>
                              {pitch.article.title && (
                                <p className="text-gray-600 mb-4">{pitch.article.title}</p>
                              )}
                            </div>
                            <Button size="lg" asChild className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                              <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Read Article
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mr-4">
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <div className="font-bold text-green-900 text-lg">Payment Processed</div>
                          <div className="text-green-700 font-semibold">${pitch.bidAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="bg-gradient-to-br from-red-50 via-rose-50 to-orange-50 rounded-2xl p-8 border border-red-200/50 shadow-lg transform hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <XCircle className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-900 mb-3 text-2xl">This pitch wasn't selected</h3>
                      <p className="text-red-700 mb-6 text-lg leading-relaxed">The reporter decided not to pursue this story. This happens—keep pitching and you'll get published soon! 💪</p>
                      
                      <Button 
                        size="lg"
                        onClick={() => {
                          onClose();
                          window.location.href = '/opportunities';
                        }}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
            <div className="mt-6">
              {/* Enhanced Pitch Content */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-6 text-xl flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  Your Pitch
                </h3>
                
                <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-8 border border-gray-200/50 shadow-inner">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed text-lg min-h-[200px] font-medium">
                    "{pitch.content}" 
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <span className="text-gray-600">— {user ? `${user.fullName}, ${user.title || 'Not specified'}, ${user.doFollowLink && user[user.doFollowLink as keyof typeof user] ? user[user.doFollowLink as keyof typeof user] : 'Not specified'}` : 'Unknown User'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center text-gray-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="font-medium">Submitted {format(createdDate, "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-full border border-green-200">
                    <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                    <span className="font-bold text-green-700">${pitch.bidAmount.toFixed(2)}</span>
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