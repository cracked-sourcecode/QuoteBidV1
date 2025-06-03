import { format } from 'date-fns';
import { Clock, Users, TrendingUp, AlertTriangle, Flame, Award, Building, DollarSign, Eye, TrendingDown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Opportunity, OutletTier } from '@shared/types/opportunity';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubscription } from '@/hooks/use-subscription';
import PaywallModal from '@/components/paywall-modal';
import { useState } from 'react';
import { getLogoContainerClasses, getDeviceOptimizedClasses } from '@/lib/responsive-utils';

interface OpportunityCardProps {
  opportunity: Opportunity;
}

// Map tier to display label
const tierLabels: Record<OutletTier, string> = {
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3'
};

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const { hasActiveSubscription } = useSubscription();
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

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

  // Improved logo loading handler for retina displays
  const handleLogoLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    // On retina displays, wait a bit to ensure proper loading
    setTimeout(() => {
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setLogoLoaded(true);
        setLogoFailed(false);
        console.log(`✅ Logo loaded successfully for ${outlet}: ${img.naturalWidth}x${img.naturalHeight}`);
      } else {
        console.log(`❌ Logo failed dimension check for ${outlet}: ${img.naturalWidth}x${img.naturalHeight}`);
        setLogoFailed(true);
      }
    }, 100);
  };

  const handleLogoError = () => {
    console.log(`❌ Logo failed to load for ${outlet}: ${outletLogo}`);
    setLogoFailed(true);
    setLogoLoaded(false);
  };

  // Get logo URL using the new system
  const logoUrl = outletLogo && outletLogo.trim() && outletLogo !== 'null' && outletLogo !== 'undefined' 
    ? (outletLogo.startsWith('http') || outletLogo.startsWith('data:') 
        ? outletLogo 
        : `${window.location.origin}${outletLogo}`)
    : '';

  console.log(`OpportunityCard - ${outlet}: logo URL = ${logoUrl}, original = ${outletLogo}`);

  // Calculate price changes and trends
  const priceIncrease = currentPrice > basePrice
    ? Math.round(((currentPrice - basePrice) / basePrice) * 100)
    : 0;

  // Simulate hourly price movement (in production this would come from API)
  const hourlyChange = Math.floor(Math.random() * 21) - 10; // -10 to +10
  const recentTrend = hourlyChange > 0 ? 'up' : hourlyChange < 0 ? 'down' : 'stable';

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

  // Smart tag logic
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

  return (
    <>
      <PaywallModal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        title="View Opportunity Details"
        description="You need an active subscription to view opportunity details and submit pitches."
      />
      
      <div 
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1 group" 
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="p-4 pb-3 border-b border-gray-100">
          <div className="flex justify-between items-start mb-3">
            {/* Publication Logo & Name */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className={`${getLogoContainerClasses()} ${getDeviceOptimizedClasses()}`}>
                {logoUrl && !logoFailed ? (
                  <img
                    src={logoUrl}
                    alt={`${outlet} logo`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    onLoad={handleLogoLoad}
                    onError={handleLogoError}
                  />
                ) : (
                  // Text-based fallback when logo fails or is not available
                  <div className="w-full h-full flex items-center justify-center bg-white rounded">
                    <span className="text-xs font-semibold text-gray-600 text-center px-1">
                      {outlet?.split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base md:text-base lg:text-base xl:text-lg font-bold text-gray-900 truncate leading-tight">
                  {outlet}
                </h3>
              </div>
            </div>
            
            {/* Tier badge */}
            <Badge 
              className={cn(
                "font-bold text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1 rounded-full flex-shrink-0 ml-3", 
                tier === 1 ? "bg-blue-600 text-white" : 
                tier === 2 ? "bg-purple-600 text-white" : 
                "bg-gray-600 text-white"
              )}
            >
              Tier {tier}
            </Badge>
          </div>
          
          {/* Expert Request label */}
          <div className="text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm font-semibold text-blue-600 uppercase tracking-wide">EXPERT REQUEST</div>
        </div>
        
        {/* Content */}
        <div className="px-4 py-3 flex-1 flex flex-col">
          {/* Title */}
          <h2 className="text-base sm:text-lg md:text-lg lg:text-xl xl:text-xl font-bold text-gray-900 mb-2 line-clamp-2 leading-snug">
            {title}
          </h2>
          
          {/* Description */}
          <div className="text-sm sm:text-sm md:text-sm lg:text-base xl:text-base text-gray-600 mb-3 line-clamp-2 leading-relaxed font-medium">
            {summary ? summary.substring(0, 120) + (summary.length > 120 ? '...' : '') : 'We\'re looking for experts: 1. 2. 3.'}
          </div>
          
          {/* Enhanced Category Tag */}
          <div className="mb-3">
            {topicTags && topicTags.length > 0 ? (
              <span className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-1.5 text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg border border-blue-200 shadow-sm">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                {topicTags[0]}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-1.5 text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm font-semibold bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 rounded-lg border border-gray-200 shadow-sm">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full mr-1.5"></span>
                General
              </span>
            )}
          </div>
          
          {/* Price Section with Background */}
          <div className="mb-3 p-3 sm:p-3.5 md:p-4 lg:p-4 xl:p-5 bg-gradient-to-r from-gray-50/50 to-blue-50/30 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-xs md:text-sm lg:text-sm xl:text-sm font-semibold text-gray-700">Current Price</span>
              {recentTrend !== 'stable' && (
                <div className={cn(
                  "flex items-center text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full",
                  recentTrend === 'up' ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                )}>
                  {recentTrend === 'up' ? (
                    <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  )}
                  <span>{recentTrend === 'up' ? '+' : ''}${Math.abs(hourlyChange)} past hour</span>
                </div>
              )}
            </div>
            <div className="text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-3xl font-black text-gray-900">${currentPrice}</div>
          </div>
          
          {/* Smart Status Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {isPremium && (
              <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5">
                <Award className="h-2.5 w-2.5" /> 
                Premium
              </Badge>
            )}
            
            {isUrgent && (
              <Badge className="bg-red-100 text-red-700 flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> 
                {hoursRemaining <= 6 ? 'Urgent' : 'Closing Soon'}
              </Badge>
            )}

            {isHot && !isUrgent && (
              <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5">
                <Flame className="h-2.5 w-2.5" /> 
                Hot
              </Badge>
            )}

            {isTrending && !isHot && !isUrgent && (
              <Badge className="bg-green-100 text-green-700 flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5">
                <Zap className="h-2.5 w-2.5" /> 
                Trending
              </Badge>
            )}

            {isNew && !isPremium && !isUrgent && !isHot && (
              <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1 rounded-full font-medium text-xs px-2 py-0.5">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> 
                New
              </Badge>
            )}
          </div>
          
          {/* Deadline info */}
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
            <span className="font-semibold">
              {hoursRemaining <= 0 ? 'Closed' :
               hoursRemaining <= 6 ? `${hoursRemaining}h left` :
               hoursRemaining <= 24 ? 'Closes today' : 
               daysRemaining === 1 ? 'Closes tomorrow' :
               `${daysRemaining} days left`}
            </span>
          </div>
        </div>
        
        {/* Action button with separator */}
        <div className="border-t border-gray-100 p-4 pt-3">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-200" 
            size="sm"
            onClick={handleButtonClick}
          >
            View Details
          </Button>
        </div>
      </div>
    </>
  );
}