import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
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
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<'status' | 'content' | 'deliverable'>('status');

  // Detect if we're in dark theme based on the current route
  const isDarkTheme = location.includes('/dark/') || location.includes('dark');

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

  // Theme-aware classes
  const dialogClasses = isDarkTheme 
    ? "w-[95vw] sm:w-full max-w-md sm:max-w-2xl lg:max-w-4xl h-[90vh] sm:max-h-[90vh] overflow-hidden flex flex-col bg-slate-800/95 backdrop-blur-sm border-slate-700/50 text-white" 
    : "w-[95vw] sm:w-full max-w-md sm:max-w-2xl lg:max-w-4xl h-[90vh] sm:max-h-[90vh] overflow-hidden flex flex-col";
    
  const headerClasses = isDarkTheme 
    ? "border-b border-slate-700/50 pb-4 flex-shrink-0" 
    : "border-b border-gray-200 pb-4 flex-shrink-0";
    
  const titleClasses = isDarkTheme 
    ? "text-base sm:text-xl font-bold text-white mb-2 leading-tight" 
    : "text-base sm:text-xl font-bold text-gray-900 mb-2 leading-tight";
    
  const statusBadgeClasses = (baseColor: string) => isDarkTheme 
    ? `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${baseColor.replace('50', '900/30').replace('200', '700/50').replace('600', '400').replace('700', '300').replace('800', '200').replace('900', '100')}` 
    : `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${baseColor}`;
    
  const linkBadgeClasses = isDarkTheme 
    ? "flex items-center bg-blue-900/30 px-3 py-1 rounded-full border border-blue-700/50 text-blue-300" 
    : "flex items-center bg-blue-50 px-3 py-1 rounded-full border border-blue-200 text-blue-700";
    
  const metaTextClasses = isDarkTheme 
    ? "flex items-center space-x-4 text-sm text-gray-300" 
    : "flex items-center space-x-4 text-sm text-gray-600";
    
  const successTextClasses = isDarkTheme 
    ? "flex items-center text-green-300" 
    : "flex items-center text-green-700";
    
  const bidAmountClasses = isDarkTheme 
    ? "bg-green-900/30 border border-green-700/50 rounded-lg px-4 py-3 text-center" 
    : "bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center";
    
  const bidLabelClasses = isDarkTheme 
    ? "text-xs font-medium text-green-300 uppercase mb-1" 
    : "text-xs font-medium text-green-700 uppercase mb-1";
    
  const bidValueClasses = isDarkTheme 
    ? "text-lg font-bold text-green-200" 
    : "text-lg font-bold text-green-800";
    
  const successBannerClasses = isDarkTheme 
    ? "mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between bg-green-900/30 rounded-lg px-4 py-3 border border-green-700/50" 
    : "mt-4 pt-4 border-t border-gray-200 flex items-center justify-between bg-green-50 rounded-lg px-4 py-3 border border-green-200";
    
  const successIconTextClasses = isDarkTheme 
    ? "flex items-center text-green-300" 
    : "flex items-center text-green-700";
    
  const successTitleClasses = isDarkTheme 
    ? "font-semibold text-green-200" 
    : "font-semibold text-green-800";
    
  const successSubtitleClasses = isDarkTheme 
    ? "text-sm text-green-300" 
    : "text-sm text-green-700";
    
  const tabBorderClasses = isDarkTheme 
    ? "flex border-b border-slate-700/50" 
    : "flex border-b border-gray-200";
    
  const activeTabClasses = isDarkTheme 
    ? "border-b-2 border-blue-500 text-blue-400" 
    : "border-b-2 border-blue-500 text-blue-600";
    
  const inactiveTabClasses = isDarkTheme 
    ? "text-gray-400 hover:text-gray-200" 
    : "text-gray-500 hover:text-gray-700";
    
  const contentClasses = isDarkTheme 
    ? "flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-800/30" 
    : "flex-1 overflow-y-auto p-4 sm:p-6";
    
  const cardClasses = isDarkTheme 
    ? "bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 sm:p-6" 
    : "bg-white rounded-lg border border-gray-200 p-4 sm:p-6";
    
  const cardTitleClasses = isDarkTheme 
    ? "font-semibold text-white mb-4 flex items-center text-sm sm:text-base" 
    : "font-semibold text-gray-900 mb-4 flex items-center text-sm sm:text-base";
    
  const statusCardClasses = (bgColor: string) => isDarkTheme 
    ? `rounded-lg p-6 border ${bgColor.replace('50', '900/30').replace('200', '700/50')}` 
    : `${bgColor} rounded-lg p-6 border ${bgColor.replace('50', '200')}`;
    
  const statusIconClasses = (bgColor: string) => isDarkTheme 
    ? `w-12 h-12 rounded-lg flex items-center justify-center ${bgColor.replace('500', '600')}` 
    : `w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`;
    
  const statusTitleClasses = (textColor: string) => isDarkTheme 
    ? `font-semibold text-lg mb-2 ${textColor.replace('900', '200').replace('800', '300').replace('700', '400')}` 
    : `font-semibold ${textColor} text-lg mb-2`;
    
  const statusDescClasses = (textColor: string) => isDarkTheme 
    ? `mb-4 ${textColor.replace('700', '300').replace('800', '400')}` 
    : `${textColor} mb-4`;
    
  const statusGridClasses = isDarkTheme 
    ? "grid grid-cols-2 gap-4" 
    : "grid grid-cols-2 gap-4";
    
  const statusGridItemClasses = isDarkTheme 
    ? "bg-slate-700/50 rounded-lg p-4 border border-slate-600/50" 
    : "bg-white rounded-lg p-4 border border-gray-200";
    
  const statusGridLabelClasses = isDarkTheme 
    ? "text-sm text-gray-300" 
    : "text-sm text-gray-600";
    
  const statusGridValueClasses = isDarkTheme 
    ? "font-semibold text-white" 
    : "font-semibold text-gray-900";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={dialogClasses}>
        <DialogHeader className={headerClasses}>
          <div className="space-y-4">
            <div className="flex-1">
              <DialogTitle className={titleClasses}>
                {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Publication"}
              </DialogTitle>
              <p className={isDarkTheme ? "text-gray-300 text-sm mt-1" : "text-gray-600 text-sm mt-1"}>
                {pitch.opportunity?.title || `Pitch #${pitch.id}`}
              </p>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
                <div className={statusBadgeClasses(statusDisplay.color)}>
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {statusDisplay.label}
                </div>
                
                {(isSuccessful || isInProgress) && (
                  <div className={linkBadgeClasses}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    <span className="text-xs sm:text-sm">Do-follow link included</span>
                  </div>
                )}
              </div>

              <div className={`flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Submitted {format(createdDate, "MMM d, yyyy")}</span>
                </div>
                
                {isSuccessful && pitch.article && (
                  <div className={successTextClasses}>
                    <Award className="h-4 w-4 mr-1" />
                    <span>Published</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className={bidAmountClasses}>
                <div className={bidLabelClasses}>
                  Bid Amount
                </div>
                <div className={bidValueClasses}>
                  ${pitch.bidAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          
          {isSuccessful && pitch.article?.url && (
            <div className={successBannerClasses}>
              <div className={successIconTextClasses}>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  <div>
                  <div className={successTitleClasses}>Success! Payment processed</div>
                  <div className={successSubtitleClasses}>Article published</div>
                </div>
              </div>
              <Button 
                asChild 
                className={isDarkTheme ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
              >
                  <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Article
                  </a>
                </Button>
            </div>
          )}
        </DialogHeader>

        <div className={tabBorderClasses}>
          <button 
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'status' 
                ? activeTabClasses 
                : inactiveTabClasses
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Status</span>
              <span className="sm:hidden">Status</span>
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            className={`flex-1 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'content' 
                ? activeTabClasses 
                : inactiveTabClasses
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pitch Content</span>
              <span className="sm:hidden">Content</span>
            </div>
          </button>
          {pitch.article?.url && (
            <button 
              onClick={() => setActiveTab('deliverable')}
              className={`flex-1 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'deliverable' 
                  ? activeTabClasses 
                  : inactiveTabClasses
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Deliverable</span>
                <span className="sm:hidden">Article</span>
              </div>
            </button>
          )}
        </div>
        
        <div className={contentClasses}>
          {activeTab === 'status' ? (
            <div className="space-y-6">
              <div className={cardClasses}>
                <h3 className={cardTitleClasses}>
                  <TrendingUp className={`h-5 w-5 mr-2 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`} />
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
                <div className={statusCardClasses("bg-blue-50")}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={statusIconClasses("bg-blue-500")}>
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className={statusTitleClasses("text-blue-900")}>Your pitch is being reviewed!</h3>
                      <p className={statusDescClasses("text-blue-700")}>We've sent your pitch to the reporter. You'll get notified as soon as they respond!</p>
                      
                      <div className={statusGridClasses}>
                        <div className={statusGridItemClasses}>
                          <div className={statusGridLabelClasses}>Submitted</div>
                          <div className={statusGridValueClasses}>{format(createdDate, "MMM d, yyyy")}</div>
                        </div>
                        <div className={statusGridItemClasses}>
                          <div className={statusGridLabelClasses}>Bid Amount</div>
                          <div className={`font-semibold ${isDarkTheme ? 'text-green-300' : 'text-green-600'}`}>${pitch.bidAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isInProgress && (
                <div className={statusCardClasses(
                  stage === 'reporter_interested' 
                    ? 'bg-purple-50' 
                    : 'bg-blue-50'
                )}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={statusIconClasses(
                        stage === 'reporter_interested' 
                          ? 'bg-purple-500' 
                          : 'bg-blue-500'
                      )}>
                        <StatusIcon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className={statusTitleClasses(
                        stage === 'reporter_interested' ? 'text-purple-900' : 'text-blue-900'
                      )}>
                        {stage === 'reporter_interested' ? 'Amazing! The reporter is interested!' : 'Your pitch is being reviewed'}
                      </h3>
                      <p className={statusDescClasses(
                        stage === 'reporter_interested' ? 'text-purple-700' : 'text-blue-700'
                      )}>
                        {stageInfo.nextSteps}
                      </p>
                      
                      {stage === 'reporter_interested' && pitch.needsFollowUp && (
                        <div className={isDarkTheme 
                          ? "bg-slate-700/50 border border-orange-700/50 rounded-lg p-4" 
                          : "bg-white border border-orange-200 rounded-lg p-4"
                        }>
                          <div className={`flex items-center mb-2 ${isDarkTheme ? 'text-orange-300' : 'text-orange-800'}`}>
                            <Clock className="h-4 w-4 mr-2" />
                            <span className="font-semibold">Follow-up needed</span>
                          </div>
                          <p className={`text-sm ${isDarkTheme ? 'text-orange-400' : 'text-orange-700'}`}>
                            Check your email for additional info requests.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isSuccessful && (
                <div className={statusCardClasses("bg-green-50")}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={statusIconClasses("bg-green-500")}>
                        <Award className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className={statusTitleClasses("text-green-900")}>Congratulations! Your pitch was published!</h3>
                      <p className={statusDescClasses("text-green-700")}>Your expertise is now live and your payment has been processed!</p>
                      
                      <div className={isDarkTheme 
                        ? "flex items-center bg-slate-700/50 rounded-lg p-4 border border-green-700/50" 
                        : "flex items-center bg-white rounded-lg p-4 border border-green-200"
                      }>
                        <CheckCircle2 className={`h-5 w-5 mr-3 ${isDarkTheme ? 'text-green-400' : 'text-green-500'}`} />
                        <div>
                          <div className={`font-semibold ${isDarkTheme ? 'text-green-300' : 'text-green-900'}`}>Payment Processed</div>
                          <div className={isDarkTheme ? 'text-green-400' : 'text-green-700'}>${pitch.bidAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'content' ? (
            <div>
              <div className={cardClasses}>
                <h3 className={cardTitleClasses}>
                  <FileText className={`h-5 w-5 mr-2 ${isDarkTheme ? 'text-purple-400' : 'text-purple-600'}`} />
                  Your Pitch
                </h3>
                
                <div className={isDarkTheme 
                  ? "bg-slate-700/50 rounded-lg p-6 border border-slate-600/50" 
                  : "bg-gray-50 rounded-lg p-6 border border-gray-200"
                }>
                  <div className={`whitespace-pre-wrap leading-relaxed ${isDarkTheme ? 'text-gray-200' : 'text-gray-900'}`}>
                    "{pitch.content}" 
                    
                    <div className={`mt-4 pt-4 border-t ${isDarkTheme ? 'border-slate-600/50' : 'border-gray-200'}`}>
                      <span className={isDarkTheme ? 'text-gray-300' : 'text-gray-600'}>— {user ? `${user.fullName}, ${user.title || 'Expert'}` : 'Unknown User'}</span>
                    </div>
                  </div>
                </div>
                
                <div className={`flex justify-between items-center mt-4 pt-4 border-t ${isDarkTheme ? 'border-slate-600/50' : 'border-gray-200'}`}>
                  <div className={`flex items-center ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Submitted {format(createdDate, "MMM d, yyyy")}</span>
                  </div>
                  <div className={isDarkTheme 
                    ? "flex items-center bg-green-900/30 px-3 py-1 rounded-full border border-green-700/50" 
                    : "flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-200"
                  }>
                    <span className={`font-semibold ${isDarkTheme ? 'text-green-300' : 'text-green-700'}`}>${pitch.bidAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className={cardClasses}>
                <h3 className={cardTitleClasses}>
                  <ExternalLink className={`h-5 w-5 mr-2 ${isDarkTheme ? 'text-green-400' : 'text-green-600'}`} />
                  Published Article
                </h3>
                
                {pitch.article?.url ? (
                  <div className={statusCardClasses("bg-green-50")}>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={statusIconClasses("bg-green-500")}>
                          <Award className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className={statusTitleClasses("text-green-900")}>Your Article is Live! 🎉</h4>
                        <p className={statusDescClasses("text-green-700")}>Congratulations! Your expertise has been published and is now available online.</p>
                        
                        <div className={isDarkTheme 
                          ? "bg-slate-700/50 border border-green-700/50 rounded-lg p-4" 
                          : "bg-white border border-green-200 rounded-lg p-4"
                        }>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className={`font-semibold mb-1 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Article Details</h5>
                              {pitch.article.title && (
                                <p className={`text-sm mb-2 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>{pitch.article.title}</p>
                              )}
                              <p className={`text-xs break-all ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>{pitch.article.url}</p>
                            </div>
                            <Button 
                              asChild 
                              className={`ml-4 flex-shrink-0 ${isDarkTheme ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                            >
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
                  <div className={isDarkTheme 
                    ? "bg-slate-700/50 rounded-lg p-6 border border-slate-600/50 text-center" 
                    : "bg-gray-50 rounded-lg p-6 border border-gray-200 text-center"
                  }>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${isDarkTheme ? 'bg-slate-600' : 'bg-gray-300'}`}>
                      <ExternalLink className={`h-6 w-6 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`} />
                    </div>
                    <h4 className={`font-semibold mb-2 ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>No Article Link Available</h4>
                    <p className={`text-sm ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>The published article link will appear here once it's available.</p>
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