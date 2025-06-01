import { format } from 'date-fns';
import { Clock, Users, TrendingUp, AlertTriangle, Flame, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Opportunity, OutletTier } from '@shared/types/opportunity';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubscription } from '@/hooks/use-subscription';
import PaywallModal from '@/components/paywall-modal';
import { useState } from 'react';

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

  // Calculate price increase percentage
  const priceIncrease = currentPrice > basePrice
    ? Math.round(((currentPrice - basePrice) / basePrice) * 100)
    : 0;

  // Format deadline - handle potential invalid date objects safely
  let deadlineDate: Date;
  try {
    deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      // If invalid, set to 7 days from now as fallback
      deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 7);
    }
  } catch (e) {
    // If there's an error, set to 7 days from now as fallback
    deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 7);
  }
  
  const formattedDeadline = format(deadlineDate, 'MMM d, yyyy');
  
  // Calculate days remaining
  const daysRemaining = Math.ceil(
    (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Simulate number of pitches (in production would come from API)
  const pitchCount = slotsTotal - slotsRemaining;
  const pitchCapacity = slotsTotal;
  const pitchFillPercentage = Math.min(100, Math.round((pitchCount / pitchCapacity) * 100));

  // Determine status indicators
  const isHot = priceIncrease > 30;
  const isUrgent = daysRemaining <= 2;
  const isPremium = tier === 1;

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
        className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow hover:shadow-md transition-all h-[470px] flex flex-col cursor-pointer" 
        onClick={handleCardClick}
      >
        {/* Outlet header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* Publication Logo */}
            {outletLogo ? (
              <img 
                src={outletLogo} 
                alt={`${outlet} logo`}
                className="w-8 h-8 object-contain rounded bg-white border border-gray-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-8 h-8 bg-gray-100 rounded flex items-center justify-center ${outletLogo ? 'hidden' : ''}`}>
              <span className="text-gray-400 text-xs font-bold">
                {outlet.charAt(0).toUpperCase()}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-gray-800">{outlet}</h3>
          </div>
          
          {/* Tier badge on right */}
          <Badge 
            className={cn(
              "font-medium rounded-md px-3 py-1", 
              tier === 1 ? "bg-blue-100 text-blue-700" : 
              tier === 2 ? "bg-purple-100 text-purple-700" : 
              "bg-gray-100 text-gray-700"
            )}
          >
            Tier {tier}
          </Badge>
        </div>
        
        {/* Content area with fixed height */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Expert Request label */}
          <div className="text-sm font-medium text-indigo-800 mb-2">EXPERT REQUEST</div>
          
          {/* Title with fixed height and truncation */}
          <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 h-[56px]">
            {title}
          </h2>
          
          {/* Description preview with small font */}
          <div className="text-sm text-gray-700 mb-4 line-clamp-3 h-[60px]">
            {summary ? summary.substring(0, 120) + (summary.length > 120 ? '...' : '') : 'No description available'}
          </div>
          
          {/* Tags with scrollable area to prevent overflow */}
          <div className="flex flex-wrap gap-2 mb-3 max-h-[32px] overflow-hidden">
            {topicTags && topicTags.length > 0 ? (
              topicTags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="px-2 py-0.5 text-xs rounded-full bg-gray-50">
                  #{tag}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="px-2 py-0.5 text-xs rounded-full bg-gray-50">
                #General
              </Badge>
            )}
            {topicTags && topicTags.length > 3 && (
              <Badge variant="outline" className="px-2 py-0.5 text-xs rounded-full bg-gray-50">+{topicTags.length - 3}</Badge>
            )}
          </div>
          
          {/* Current Price with status indicators */}
          <div className="mb-5">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm font-medium">Current Price</span>
              <span className="text-2xl font-bold">${currentPrice}</span>
            </div>
            
            {/* Price trend indicator */}
            {priceIncrease > 0 && (
              <div className="flex items-center text-emerald-600 text-sm mt-1 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Price up {priceIncrease}% from base</span>
              </div>
            )}
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-2 mb-5">
            {isPremium && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1 rounded-full font-medium">
                      <Award className="h-3 w-3" /> 
                      <span>Premium</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tier 1 premium opportunity</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {isHot && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-red-100 text-red-700 flex items-center gap-1 rounded-full font-medium">
                      <Flame className="h-3 w-3" /> 
                      <span>Hot</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Price has increased significantly</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {isUrgent && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1 rounded-full font-medium">
                      <AlertTriangle className="h-3 w-3" /> 
                      <span>Closing Soon</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Less than 2 days remaining</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {/* Progress bar for pitches */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{pitchCount} pitches</span>
              <span>{pitchCapacity - pitchCount} slots remaining</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full", 
                  pitchFillPercentage > 75 ? "bg-red-500" :
                  pitchFillPercentage > 50 ? "bg-amber-500" :
                  pitchFillPercentage > 25 ? "bg-green-500" :
                  "bg-blue-500"
                )}
                style={{ width: `${pitchFillPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Slots & Deadline */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-5">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-gray-500 mr-2" />
              <span>{slotsRemaining}/{slotsTotal} slots left</span>
            </div>
            
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-gray-500 mr-2" />
              <span>{daysRemaining <= 0 ? 'Closes today' : `${daysRemaining} days left`}</span>
            </div>
          </div>
        </div>
        
        {/* Button at bottom, fixed position */}
        <div className="p-4 border-t border-gray-100 mt-auto">
          <Button 
            className="w-full bg-blue-800 hover:bg-blue-900 text-white" 
            size="lg"
            onClick={handleButtonClick}
          >
            View Details
          </Button>
        </div>
      </div>
    </>
  );
}