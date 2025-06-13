import { format } from 'date-fns';
import { Clock, Users, TrendingUp, AlertTriangle, Flame, Award, Building, DollarSign, Eye, TrendingDown, Zap, Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Opportunity, OutletTier } from '@shared/types/opportunity';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubscription } from '@/hooks/use-subscription';
import PaywallModal from '@/components/paywall-modal';
import { useState, useEffect, useMemo } from 'react';
import { getLogoContainerClasses, getDeviceOptimizedClasses } from '@/lib/responsive-utils';
import { useAuth } from '@/hooks/use-auth';
import { apiFetch } from '@/lib/apiFetch';
import { useTheme } from '@/hooks/use-theme';

interface OpportunityCardProps {
  opportunity: Opportunity;
  isPriority?: boolean; // Whether this card is above-the-fold and should load with high priority
}

// Map tier to display label
const tierLabels: Record<OutletTier, string> = {
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3'
};

export default function OpportunityCard({ opportunity, isPriority = false }: OpportunityCardProps) {
  // EFFICIENT LOGO LOADING STRATEGY FOR LIVE FEED:
  // - Smart preloading for first 6 opportunities (above-the-fold) to prevent initial sign-in lag
  // - High priority loading for above-the-fold content
  // - Lazy loading for opportunities below the fold to save bandwidth
  // - Let browser handle caching and optimization naturally
  // - Significantly reduces bandwidth usage while improving initial page load experience
  
  const { hasActiveSubscription } = useSubscription();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hourlyChange, setHourlyChange] = useState<number>(0);
  const [recentTrend, setRecentTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [currentPriceState, setCurrentPriceState] = useState(opportunity.currentPrice);
  const [priceJustUpdated, setPriceJustUpdated] = useState(false);
  const [tickInterval, setTickInterval] = useState(60000); // Default 1 minute

  const {
    id,
    title,
    outlet,
    outletLogo,
    tier,
    topicTags,
    currentPrice,
    basePrice,
    deadline,
    slotsRemaining,
    slotsTotal,
    summary
  } = opportunity;

  // Fetch real hourly price change data synced with admin tick interval
  useEffect(() => {
    const fetchHourlyChange = async () => {
      try {
        const response = await apiFetch(`/api/opportunities/${id}/price-trend?window=1h`, {
          credentials: 'include'
        });
        if (response.ok) {
          const priceHistory = await response.json();
          if (priceHistory.length >= 2) {
            const latest = priceHistory[priceHistory.length - 1];
            const previous = priceHistory[0];
            const change = latest.p - previous.p;
            const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
            setHourlyChange(change);
            setRecentTrend(trend);
          } else {
            setHourlyChange(0);
            setRecentTrend('stable');
          }
        }
      } catch (error) {
        console.error(`Failed to fetch hourly change for opportunity ${id}:`, error);
        setHourlyChange(0);
        setRecentTrend('stable');
      }
    };
    
    // Initial fetch
    fetchHourlyChange();
    
    // Set up real-time updates synced with admin tick interval
    const interval = setInterval(fetchHourlyChange, tickInterval);
    
    return () => clearInterval(interval);
  }, [id, tickInterval]);

  // Real-time price updates synced with admin tick interval
  useEffect(() => {
    const fetchLatestPrice = async () => {
      try {
        const response = await apiFetch(`/api/opportunities/${id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const latestOpportunity = await response.json();
          if (latestOpportunity.currentPrice !== currentPriceState) {
            setCurrentPriceState(latestOpportunity.currentPrice);
            // Show visual feedback for price update
            setPriceJustUpdated(true);
            setTimeout(() => setPriceJustUpdated(false), 2000);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch latest price for opportunity ${id}:`, error);
      }
    };
    
    // Set up real-time price updates synced with admin tick interval
    const priceInterval = setInterval(fetchLatestPrice, tickInterval);
    
    return () => clearInterval(priceInterval);
  }, [id, currentPriceState, tickInterval]);

  // Update local price state when opportunity prop changes
  useEffect(() => {
    setCurrentPriceState(opportunity.currentPrice);
  }, [opportunity.currentPrice]);

  // Improved logo loading handler for retina displays
  const handleLogoLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    // For priority images, reduce delay; for lazy images, use standard delay
    const delay = isPriority ? 10 : 100;
    setTimeout(() => {
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setLogoLoaded(true);
        setLogoFailed(false);
      } else {
        setLogoFailed(true);
      }
    }, delay);
  };

  const handleLogoError = () => {
    setLogoFailed(true);
    setLogoLoaded(false);
  };

  // Get logo URL using memoization for performance
  const logoUrl = useMemo(() => {
    return outletLogo && outletLogo.trim() && outletLogo !== 'null' && outletLogo !== 'undefined' 
      ? (outletLogo.startsWith('http') || outletLogo.startsWith('data:') 
          ? outletLogo 
          : `${window.location.origin}${outletLogo}`)
      : '';
  }, [outletLogo]);

  // Use default tick interval (no need to fetch admin config for regular users)
  useEffect(() => {
    setTickInterval(60000); // Default 1 minute tick interval
  }, []);

  // Calculate price changes and trends using bulk data from opportunities API
  const priceIncrease = currentPriceState > basePrice
    ? Math.round(((currentPriceState - basePrice) / basePrice) * 100)
    : 0;

  // Format deadline
  let deadlineDate: Date;
  try {
    deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 7);
    }
  } catch (e) {
    deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 7);
  }
  
  // Calculate days and hours remaining
  const timeRemaining = deadlineDate.getTime() - Date.now();
  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));

  // Smart tag logic using bulk pricing data
  const isPremium = tier === 1; // Only Tier 1 is premium
  const isUrgent = hoursRemaining <= 24; // Less than 24 hours
  const isHot = priceIncrease > 25; // Price increased significantly
  const isTrending = Math.abs(hourlyChange) >= 5; // Recent significant movement
  const isNew = timeRemaining < (7 * 24 * 60 * 60 * 1000) && daysRemaining >= 6; // Posted recently

  const handleCardClick = () => {
    if (!hasActiveSubscription) {
      setShowPaywallModal(true);
      return;
    }
    window.location.href = `/opportunities/${id}`;
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasActiveSubscription) {
      setShowPaywallModal(true);
      return;
    }
    window.location.href = `/opportunities/${id}`;
  };

  // Check if opportunity is saved when component mounts
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!user?.id) return;
      
      try {

        const response = await apiFetch(`/api/users/${user.id}/saved/${id}/status`);
        if (response.ok) {
          const data = await response.json();
          setIsSaved(data.isSaved);
        } else {

          // Default to false if we can't check
          setIsSaved(false);
        }
      } catch (error) {

        // Default to false if there's an error
        setIsSaved(false);
      }
    };
    
    checkSavedStatus();
    
    // Listen for refresh events from the saved page
    const handleRefreshSavedStatus = () => {
      checkSavedStatus();
    };
    
    window.addEventListener('refreshSavedStatus', handleRefreshSavedStatus);
    
    return () => {
      window.removeEventListener('refreshSavedStatus', handleRefreshSavedStatus);
    };
  }, [user?.id, id]);

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user?.id) return;
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (isSaved) {
        // Unsave the opportunity
        const response = await apiFetch(`/api/users/${user.id}/saved/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setIsSaved(false);
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        }
      } else {
        // Save the opportunity
        console.log(`💾 Attempting to save opportunity ${id}`);
        const response = await apiFetch('/api/saved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.id,
            opportunityId: id
          })
        });
        
        if (response.ok) {
          setIsSaved(true);
          console.log(`✅ Successfully saved opportunity ${id}`);
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error(`❌ Failed to save opportunity ${id}:`, response.status, errorData);
          
          // If it's already saved, just update our state to reflect that
          if (response.status === 400 && errorData.message?.includes('already saved')) {
            console.log(`🔄 Opportunity ${id} was already saved, updating button state to "Saved"`);
            setIsSaved(true);
          }
        }
      }
    } catch (error) {
      console.error('💥 Error in save/unsave operation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        title="View Opportunity Details"
        description="You need an active subscription to view opportunity details and submit pitches."
      />
      
      <div 
        className={cn(
          "backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1 group",
          theme === 'dark' 
            ? "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-700/30 border border-slate-600/50 hover:shadow-blue-500/10 hover:border-blue-500/40 hover:bg-gradient-to-br hover:from-slate-900/98 hover:via-slate-800/95 hover:to-slate-700/40"
            : "bg-white border border-gray-200 hover:shadow-lg"
        )}
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className={cn(
          "p-4 pb-3 border-b",
          theme === 'dark' ? "border-slate-600/40" : "border-gray-100"
        )}>
          <div className="flex justify-between items-start mb-3">
            {/* Publication Logo & Name */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className={cn(
                `${getLogoContainerClasses()} ${getDeviceOptimizedClasses()}`,
                theme === 'dark' ? "ring-1 ring-slate-500/20" : ""
              )}>
                {logoUrl && !logoFailed ? (
                  <img
                    src={logoUrl}
                    alt={`${outlet} logo`}
                    className={cn(
                      "w-full h-full object-contain rounded",
                      theme === 'dark' ? "bg-white/90 p-1" : ""
                    )}
                    loading={isPriority ? "eager" : "lazy"}
                    decoding={isPriority ? "sync" : "async"}
                    {...(isPriority && { fetchPriority: "high" as any })}
                    onLoad={handleLogoLoad}
                    onError={handleLogoError}
                  />
                ) : (
                  // Text-based fallback when logo fails or is not available
                  <div className={cn(
                    "w-full h-full flex items-center justify-center rounded",
                    theme === 'dark' ? "bg-gradient-to-br from-slate-600/60 to-slate-700/80 border border-slate-500/40" : "bg-white"
                  )}>
                    <span className={cn(
                      "text-xs font-semibold text-center px-1",
                      theme === 'dark' ? "text-slate-100" : "text-gray-600"
                    )}>
                      {outlet?.split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className={cn(
                  "text-sm sm:text-base md:text-base lg:text-base xl:text-lg font-bold truncate leading-tight",
                  theme === 'dark' ? "text-white" : "text-gray-900"
                )}>
                  {outlet}
                </h3>
              </div>
            </div>
            
            {/* Tier badge */}
            <Badge 
              className={cn(
                "font-bold text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1 rounded-full flex-shrink-0 ml-3", 
                theme === 'dark' 
                  ? tier === 1 ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/50" : 
                    tier === 2 ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border border-indigo-500/50" : 
                    "bg-gradient-to-r from-slate-600 to-slate-700 text-white border border-slate-500/50"
                  : tier === 1 ? "bg-blue-600 text-white" : 
                    tier === 2 ? "bg-indigo-600 text-white" : 
                    "bg-gray-600 text-white"
              )}
            >
              Tier {tier}
            </Badge>
          </div>
          
          {/* Expert Request label */}
          <div className={cn(
            "text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm font-semibold uppercase tracking-wide",
            theme === 'dark' 
              ? "bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent"
              : "text-blue-600"
          )}>EXPERT REQUEST</div>
        </div>
        
        {/* Content */}
        <div className="px-4 py-3 flex-1 flex flex-col">
          {/* Title */}
          <h2 className={cn(
            "text-base sm:text-lg md:text-lg lg:text-xl xl:text-xl font-bold mb-2 line-clamp-2 leading-snug",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}>
            {title}
          </h2>
          
          {/* Description */}
          <div className={cn(
            "text-sm sm:text-sm md:text-sm lg:text-base xl:text-base mb-3 line-clamp-2 leading-relaxed font-medium",
            theme === 'dark' ? "text-slate-300" : "text-gray-600"
          )}>
            {summary ? summary.substring(0, 120) + (summary.length > 120 ? '...' : '') : 'We\'re looking for experts: 1. 2. 3.'}
          </div>
          
          {/* Enhanced Category Tag */}
          <div className="mb-3">
            {topicTags && topicTags.length > 0 ? (
              <span className={cn(
                "inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-1.5 text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm font-semibold rounded-lg shadow-sm",
                theme === 'dark' 
                  ? "bg-gradient-to-r from-blue-600/20 to-blue-700/25 text-blue-300 border border-blue-500/40 backdrop-blur-sm"
                  : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full mr-1.5",
                  theme === 'dark' 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600"
                    : "bg-blue-500"
                )}></span>
                {topicTags[0]}
              </span>
            ) : (
              <span className={cn(
                "inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-1.5 text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm font-semibold rounded-lg shadow-sm",
                theme === 'dark' 
                  ? "bg-gradient-to-r from-slate-700/40 to-slate-600/40 text-slate-200 border border-slate-500/50 backdrop-blur-sm"
                  : "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border border-gray-200"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full mr-1.5",
                  theme === 'dark' 
                    ? "bg-gradient-to-r from-slate-500 to-slate-600"
                    : "bg-gray-500"
                )}></span>
                General
              </span>
            )}
          </div>
          
          {/* Price Section with Background */}
          <div className={cn(
            "mb-3 p-3 sm:p-3.5 md:p-4 lg:p-4 xl:p-5 rounded-xl shadow-lg transition-all duration-500",
            theme === 'dark' 
              ? priceJustUpdated
                ? "bg-gradient-to-br from-blue-600/30 via-blue-700/25 to-slate-700/60 border border-blue-500/50 backdrop-blur-sm"
                : "bg-gradient-to-br from-blue-600/25 via-blue-700/20 to-slate-700/60 border border-blue-500/40 backdrop-blur-sm"
              : priceJustUpdated
                ? "bg-gradient-to-r from-blue-100/60 to-blue-200/40 border border-blue-300/70"
                : "bg-gradient-to-r from-gray-50/50 to-blue-50/30 border border-gray-100"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className={cn(
                  "text-xs sm:text-xs md:text-sm lg:text-sm xl:text-sm font-semibold mb-1",
                  theme === 'dark' ? "text-blue-200" : "text-gray-700"
                )}>Current Price</span>
                <div className={cn(
                  "text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-3xl font-black transition-all duration-500",
                  theme === 'dark' ? "bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent" : "text-gray-900"
                )}>${currentPriceState % 1 === 0 ? Math.floor(currentPriceState) : currentPriceState}</div>
              </div>
              <div className={cn(
                "flex items-center text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border shadow-sm transition-all duration-200 hover:scale-105",
                theme === 'dark' 
                  ? recentTrend === 'up' ? "text-green-300 bg-gradient-to-r from-green-800/60 to-emerald-800/60 border-green-600/50" : 
                    recentTrend === 'down' ? "text-red-300 bg-gradient-to-r from-red-800/60 to-rose-800/60 border-red-600/50" : 
                    "text-blue-300 bg-gradient-to-r from-blue-800/60 to-indigo-800/60 border-blue-600/50"
                  : recentTrend === 'up' ? "text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-green-100" : 
                    recentTrend === 'down' ? "text-red-700 bg-gradient-to-r from-red-50 to-rose-50 border-red-200 shadow-red-100" : 
                    "text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-blue-100"
              )}>
                {recentTrend === 'up' ? (
                  <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                ) : recentTrend === 'down' ? (
                  <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                ) : (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-1.5 animate-pulse"></div>
                )}
                <span>
                  {recentTrend === 'stable' ? 'No change' : `${hourlyChange > 0 ? '+' : ''}$${Math.abs(hourlyChange)} past hour`}
                </span>
              </div>
            </div>
          </div>
          
          {/* Smart Status Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3 pointer-events-none">
            {isPremium && (
              <Badge className={cn(
                "flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5",
                theme === 'dark' 
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/50"
                  : "bg-blue-100 text-blue-700"
              )}>
                <Award className="h-2.5 w-2.5" /> 
                Premium
              </Badge>
            )}
            
            {isUrgent && (
              <Badge className={cn(
                "flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5",
                theme === 'dark' 
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white border border-red-500/50"
                  : "bg-red-100 text-red-700"
              )}>
                <AlertTriangle className="h-2.5 w-2.5" /> 
                {hoursRemaining <= 6 ? 'Urgent' : 'Closing Soon'}
              </Badge>
            )}

            {isHot && !isUrgent && (
              <Badge className={cn(
                "flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5",
                theme === 'dark' 
                  ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white border border-orange-500/50"
                  : "bg-orange-100 text-orange-700"
              )}>
                <Flame className="h-2.5 w-2.5" /> 
                Hot
              </Badge>
            )}

            {isTrending && !isHot && !isUrgent && (
              <Badge className={cn(
                "flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5",
                theme === 'dark' 
                  ? "bg-gradient-to-r from-green-600 to-green-700 text-white border border-green-500/50"
                  : "bg-green-100 text-green-700"
              )}>
                <Zap className="h-2.5 w-2.5" /> 
                Trending
              </Badge>
            )}

            {isNew && !isPremium && !isUrgent && !isHot && (
              <Badge className={cn(
                "flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5",
                theme === 'dark' 
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/50"
                  : "bg-blue-100 text-blue-700"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  theme === 'dark' ? "bg-blue-300" : "bg-blue-500"
                )}></span> 
                New
              </Badge>
            )}
          </div>
          
          {/* Deadline info */}
          <div className={cn(
            "flex items-center justify-between text-sm mb-3",
            theme === 'dark' ? "text-slate-300" : "text-gray-600"
          )}>
            <div className="flex items-center">
            <Clock className={cn(
              "h-3.5 w-3.5 mr-1.5",
              theme === 'dark' ? "text-slate-400" : "text-gray-500"
            )} />
            <span className="font-semibold">
              {hoursRemaining <= 0 ? 'Closed' :
               hoursRemaining <= 6 ? `${hoursRemaining}h left` :
               hoursRemaining <= 24 ? 'Closes today' : 
               daysRemaining === 1 ? 'Closes tomorrow' :
               `${daysRemaining} days left`}
            </span>
            </div>
            
            {/* Save Button */}
            <button
              onClick={handleSaveClick}
              disabled={isLoading}
              className={cn(
                "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
                theme === 'dark' 
                  ? isSaved 
                    ? 'bg-gradient-to-r from-blue-600/25 to-blue-700/25 text-blue-200 hover:from-blue-600/35 hover:to-blue-700/35 border border-blue-500/50 shadow-md' 
                    : 'bg-gradient-to-r from-slate-700/60 to-slate-600/60 text-slate-300 hover:from-slate-700/80 hover:to-slate-600/80 border border-slate-500/60 shadow-md'
                  : isSaved 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''} ${isLoading ? 'animate-pulse' : ''}`} />
              <span>{isLoading ? 'Saving...' : isSaved ? 'Saved' : 'Save Opportunity'}</span>
            </button>
          </div>
        </div>
        
        {/* Action button with separator */}
        <div className={cn(
          "border-t p-4 pt-3",
          theme === 'dark' ? "border-slate-600/40" : "border-gray-100"
        )}>
          <Button 
            className={cn(
              "w-full text-white font-medium py-3 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.01]",
              theme === 'dark' 
                ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                : "bg-blue-600 hover:bg-blue-700"
            )}
            size="sm"
            onClick={handleButtonClick}
          >
            View Details →
          </Button>
        </div>
      </div>
    </>
  );
}