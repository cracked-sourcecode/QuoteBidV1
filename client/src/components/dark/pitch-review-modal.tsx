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
  Zap,
  User,
  Building2,
  Globe
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
        color: 'bg-blue-600', 
        icon: Clock,
        bgGradient: 'from-blue-600/10 to-indigo-600/10',
        borderColor: 'border-blue-400/30'
      };
    case 'sent':
    case 'sent_to_reporter':
      return { 
        label: 'Sent to Reporter', 
        color: 'bg-blue-600', 
        icon: Send,
        bgGradient: 'from-blue-600/10 to-blue-500/10',
        borderColor: 'border-blue-400/30'
      };
    case 'interested':
    case 'reporter_interested':
      return { 
        label: 'Reporter Interested', 
        color: 'bg-purple-600', 
        icon: Eye,
        bgGradient: 'from-purple-600/10 to-violet-600/10',
        borderColor: 'border-purple-400/30'
      };
    case 'successful':
    case 'successful_coverage':
      return { 
        label: 'Published', 
        color: 'bg-green-600', 
        icon: Award,
        bgGradient: 'from-green-600/10 to-emerald-600/10',
        borderColor: 'border-green-400/30'
      };
    case 'not_interested':
    case 'reporter_not_interested':
      return { 
        label: 'Not Selected', 
        color: 'bg-red-600', 
        icon: XCircle,
        bgGradient: 'from-red-600/10 to-rose-600/10',
        borderColor: 'border-red-400/30'
      };
    case 'draft':
      return { 
        label: 'Draft', 
        color: 'bg-gray-600', 
        icon: FileText,
        bgGradient: 'from-gray-600/10 to-slate-600/10',
        borderColor: 'border-gray-400/30'
      };
    default:
      return { 
        label: 'Under Review', 
        color: 'bg-blue-600', 
        icon: Clock,
        bgGradient: 'from-blue-600/10 to-indigo-600/10',
        borderColor: 'border-blue-400/30'
      };
  }
};

export default function PitchReviewModal({ isOpen, onClose, pitch }: PitchReviewModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<'status' | 'content' | 'deliverable'>('status');

  const stage = getStage(pitch);
  const statusDisplay = getStatusDisplay(stage);
  const StatusIcon = statusDisplay.icon;
  const createdDate = new Date(pitch.createdAt);
  
  const isSuccessful = stage === 'successful_coverage' || stage === 'successful';

  // Get publication logo URL with localhost detection
  const getLogoUrl = () => {
    const logo = pitch.opportunity?.publication?.logo;
    
    if (!logo || !logo.trim() || logo === 'null' || logo === 'undefined') {
      return '';
    }
    
    // Convert localhost URLs to relative paths for mobile compatibility
    if (logo.startsWith('http://localhost:5050/')) {
      const relativePath = logo.replace('http://localhost:5050', '');
      return `${window.location.origin}${relativePath}`;
    }
    
    // Handle other URLs normally
    if (logo.startsWith('http') || logo.startsWith('data:')) {
      return logo;
    }
    
    // Handle relative paths
    return `${window.location.origin}${logo}`;
  };

  const logoUrl = getLogoUrl();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`w-[95vw] max-w-4xl max-h-[85vh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-800 backdrop-blur-sm border-slate-700/50 text-white shadow-xl flex flex-col`}>
        
        {/* Compact Mobile Header */}
        <DialogHeader className={`border-b border-slate-600/50 p-3 sm:p-6 flex-shrink-0`}>
          {/* Mobile Compact Layout */}
          <div className="block sm:hidden">
            <div className="flex items-center gap-3 mb-2">
              {/* Small Logo */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 overflow-hidden shadow-sm flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${pitch.opportunity?.publication?.name || pitch.opportunity?.outlet} logo`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = `
                        <div class="w-full h-full ${statusDisplay.color} flex items-center justify-center">
                          <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                          </svg>
                        </div>
                      `;
                    }}
                  />
                ) : (
                  <div className={`w-full h-full ${statusDisplay.color} flex items-center justify-center`}>
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              
              {/* Title and Status in Same Row */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <DialogTitle className={`text-base font-bold truncate text-white`}>
                    {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Publication"}
                  </DialogTitle>
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${statusDisplay.color} shadow-sm flex-shrink-0 ml-2`}>
                    <StatusIcon className="h-2.5 w-2.5 text-white" />
                    <span className="text-white font-medium text-xs">{statusDisplay.label}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Compact Info Row */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className={`truncate flex-1 text-slate-400`}>
                {pitch.opportunity?.title || `Pitch #${pitch.id}`}
              </p>
              <div className={`px-2 py-1 rounded-md bg-gradient-to-r from-slate-700 to-slate-600 border border-slate-600 flex-shrink-0`}>
                <div className={`text-xs font-medium text-green-400`}>
                  ${pitch.bidAmount.toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Compact Meta Info */}
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className={`flex items-center gap-1.5 text-slate-400`}>
                <Calendar className="h-3 w-3" />
                <span>Submitted {format(createdDate, "MMM d")}</span>
              </div>
              {isSuccessful && (
                <div className="flex items-center gap-1.5 text-green-500 font-medium">
                  <Award className="h-3 w-3" />
                  <span>Published</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Desktop Layout (unchanged) */}
          <div className="hidden sm:flex sm:items-start gap-4">
            {/* Publication Logo */}
            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-white border border-gray-200 overflow-hidden shadow-lg flex-shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${pitch.opportunity?.publication?.name || pitch.opportunity?.outlet} logo`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div class="w-full h-full ${statusDisplay.color} flex items-center justify-center">
                        <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                      </div>
                    `;
                  }}
                />
              ) : (
                <div className={`w-full h-full ${statusDisplay.color} flex items-center justify-center`}>
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              )}
            </div>
            
            {/* Publication Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <DialogTitle className={`text-xl font-bold text-white`}>
                  {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || "Publication"}
                </DialogTitle>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusDisplay.color} shadow-sm`}>
                  <StatusIcon className="h-3 w-3 text-white" />
                  <span className="text-white font-medium text-xs">{statusDisplay.label}</span>
                </div>
              </div>
              <p className={`text-sm leading-tight text-slate-400`}>
                {pitch.opportunity?.title || `Pitch #${pitch.id}`}
              </p>
            </div>
            
            {/* Bid Amount Card */}
            <div className={`px-4 py-3 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-slate-600/50 shadow-lg flex-shrink-0`}>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1 text-green-400`}>
                Bid Amount
              </div>
              <div className={`text-xl font-bold text-green-300`}>
                ${pitch.bidAmount.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Desktop Meta Info Row */}
          <div className="hidden sm:flex sm:items-center sm:justify-between gap-3 mt-4">
            <div className="flex items-center gap-6 text-sm">
              <div className={`flex items-center gap-2 text-slate-400`}>
                <Calendar className="h-4 w-4" />
                <span>Submitted {format(createdDate, "MMM d, yyyy")}</span>
              </div>
              {isSuccessful && (
                <div className="flex items-center gap-2 text-green-500 font-medium">
                  <Award className="h-4 w-4" />
                  <span>Published</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Success Banner - Only on Desktop */}
          {isSuccessful && pitch.article?.url && (
            <div className={`hidden sm:block mt-4 p-4 rounded-xl bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 shadow-lg`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center shadow-md">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className={`font-semibold text-green-300`}>
                      Success! Payment processed
                    </div>
                    <div className={`text-sm text-green-400`}>
                      Article published and payment completed
                    </div>
                  </div>
                </div>
                <Button asChild className="h-11 bg-green-500 hover:bg-green-600 text-white shadow-lg">
                  <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Article
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Compact Tab Navigation */}
        <div className={`border-b border-slate-600/50 flex-shrink-0`}>
          <div className="flex">
            {[
              { id: 'status', label: 'Status', icon: TrendingUp },
              { id: 'content', label: 'Pitch', icon: FileText },
              ...(pitch.article?.url ? [{ id: 'deliverable', label: 'Article', icon: Globe }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-6 py-2.5 sm:py-4 text-sm font-medium transition-all duration-200 min-h-[40px] sm:min-h-[44px] ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Compact Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3 sm:p-6">
            {activeTab === 'status' && (
              <div className="space-y-3 sm:space-y-6">
                {/* Mobile Success Banner */}
                {isSuccessful && pitch.article?.url && (
                  <div className={`block sm:hidden p-3 rounded-lg bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 shadow-sm`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                      <div className={`font-medium text-sm text-green-300`}>
                        Success! Published
                      </div>
                    </div>
                    <Button asChild className="w-full h-9 bg-green-500 hover:bg-green-600 text-white shadow-sm text-sm">
                      <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        View Article
                      </a>
                    </Button>
                  </div>
                )}
                

                
                {/* Enhanced Status Card */}
                <div className={`p-4 sm:p-8 rounded-xl sm:rounded-3xl bg-gradient-to-br ${statusDisplay.bgGradient} border ${statusDisplay.borderColor} shadow-lg sm:shadow-xl`}>
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${statusDisplay.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <StatusIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 sm:mb-3">
                        <h3 className={`text-lg sm:text-2xl font-bold text-white`}>
                          {statusDisplay.label}
                        </h3>
                        <div className={`px-2 py-1 rounded-md text-xs font-medium bg-slate-700/50 text-slate-300`}>
                          {format(createdDate, "MMM d, yyyy")}
                        </div>
                      </div>
                      <p className={`text-sm sm:text-base leading-relaxed text-slate-300`}>
                        {stage === 'pending' && "Your pitch is currently under review. We'll notify you as soon as there's an update!"}
                        {(stage === 'sent' || stage === 'sent_to_reporter') && "Your pitch has been sent to the reporter. They're reviewing it now."}
                        {(stage === 'interested' || stage === 'reporter_interested') && "Great news! The reporter is interested in your pitch."}
                        {(stage === 'successful' || stage === 'successful_coverage') && "Congratulations! Your pitch was successful and has been published."}
                        {(stage === 'not_interested' || stage === 'reporter_not_interested') && "This pitch wasn't selected this time, but don't give up! New opportunities are added every day. Keep pitching to increase your chances of success!"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-3 sm:space-y-6">
                <div className={`p-3 sm:p-6 rounded-lg sm:rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-slate-600/50 backdrop-blur-sm shadow-sm sm:shadow-lg`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                      <FileText className="h-3 w-3 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <h3 className={`text-base sm:text-lg font-bold text-white`}>
                      Your Pitch
                    </h3>
                  </div>
                  
                  {/* Pitch Content - Compact with Scroll */}
                  <div className={`p-3 sm:p-6 rounded-lg sm:rounded-xl bg-slate-700/60 backdrop-blur-sm`}>
                    <div className={`max-h-[200px] sm:max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700`}>
                      <div className={`text-sm sm:text-lg leading-relaxed italic mb-3 sm:mb-4 pr-2 text-slate-200`}>
                        "{pitch.content}"
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 pt-3 sm:pt-4 border-t border-slate-600/50 text-slate-400`}>
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium text-xs sm:text-sm">
                        {user ? `${user.fullName}${user.title ? `, ${user.title}` : ''}` : 'Expert'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'deliverable' && (
              <div className="space-y-3 sm:space-y-6">
                {pitch.article?.url ? (
                  <div className={`p-3 sm:p-6 rounded-lg sm:rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-slate-600/50 backdrop-blur-sm shadow-sm sm:shadow-lg`}>
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                      <div className="p-1.5 sm:p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                        <Globe className="h-3 w-3 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <h3 className={`text-base sm:text-lg font-bold text-white`}>
                        Published Article
                      </h3>
                    </div>
                    
                    {/* Article Card - Mobile Optimized Sizing */}
                    <div className={`p-2 sm:p-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 shadow-sm sm:shadow-lg`}>
                      <div className="flex items-start gap-2 sm:gap-4">
                        <div className="w-6 h-6 sm:w-12 sm:h-12 rounded-md sm:rounded-xl bg-green-500 flex items-center justify-center shadow-sm sm:shadow-lg flex-shrink-0">
                          <Award className="h-3 w-3 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm sm:text-lg font-semibold mb-1 sm:mb-2 text-green-300`}>
                            🎉 Your Article is Live!
                          </h4>
                          <p className={`mb-2 sm:mb-4 text-xs sm:text-sm text-green-400`}>
                            Congratulations! Your expertise has been published and is now available online.
                          </p>
                          
                          {pitch.article.title && (
                            <div className={`p-1.5 sm:p-3 rounded-md sm:rounded-lg mb-2 sm:mb-4 bg-slate-800/50`}>
                              <h5 className={`font-medium mb-0.5 text-xs sm:text-sm text-white`}>
                                Article Title
                              </h5>
                              <p className={`text-xs sm:text-sm leading-tight text-slate-300`}>
                                {pitch.article.title}
                              </p>
                            </div>
                          )}
                          
                          <Button 
                            asChild 
                            className="w-full h-8 sm:h-11 bg-green-500 hover:bg-green-600 text-white shadow-sm sm:shadow-lg text-xs sm:text-sm py-1 sm:py-2"
                          >
                            <a href={pitch.article.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                              Read Your Published Article
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 sm:p-8 rounded-lg sm:rounded-2xl text-center bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-slate-600/50 backdrop-blur-sm shadow-sm sm:shadow-lg`}>
                    <div className={`w-8 h-8 sm:w-16 sm:h-16 rounded-lg sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-4 bg-slate-700`}>
                      <Globe className={`h-4 w-4 sm:h-8 sm:w-8 text-slate-400`} />
                    </div>
                    <h4 className={`font-semibold mb-1 sm:mb-2 text-sm sm:text-base text-slate-300`}>
                      Article Not Yet Available
                    </h4>
                    <p className={`text-xs sm:text-sm text-slate-400`}>
                      The published article link will appear here once it's available.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 