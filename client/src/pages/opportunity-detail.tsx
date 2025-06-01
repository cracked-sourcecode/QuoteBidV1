import { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { Loader2, ChevronLeft, Building, Tag, Calendar, AlertTriangle, Clock, TrendingUp, TrendingDown, Trophy, Award, Target, Star, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import PriceChart from '@/components/price-chart';
import BidTicket from '@/components/bid-ticket';
import useOpportunityStore from '@/store/opportunity-store';
import { OutletTier } from '@shared/types/opportunity';
import { calculateMarketHeat, getMarketPulseIndicators, initializeMarketPulse } from '@/lib/marketPulse';

// Map tier to display label
const tierLabels: Record<OutletTier, string> = {
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3'
};

export default function OpportunityDetail() {
  const { toast } = useToast();
  const [, params] = useRoute('/opportunities/:id');
  const opportunityId = params ? parseInt(params.id) : 0;
  
  const [priceDirection, setPriceDirection] = useState<'neutral' | 'up' | 'down'>('neutral');
  const [showPriceAnimation, setShowPriceAnimation] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  
  const {
    selectedOpportunity,
    priceHistory,
    bidInfo,
    isLoadingOpportunity,
    isLoadingPriceHistory,
    isSubmittingBid,
    opportunityError,
    bidError,
    selectOpportunity,
    submitBid,
    resetBidError
  } = useOpportunityStore();
  
  // Load opportunity data on initial render
  useEffect(() => {
    if (opportunityId) {
      selectOpportunity(opportunityId);
    }
  }, [opportunityId, selectOpportunity]);
  
  // Calculate time until deadline
  useEffect(() => {
    if (!selectedOpportunity) return;
    
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const deadline = new Date(selectedOpportunity.deadline).getTime();
      const difference = deadline - now;
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      } else {
        setTimeLeft('Expired');
      }
    };
    
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [selectedOpportunity]);
  
  // Initialize market pulse for this opportunity
  useEffect(() => {
    if (!selectedOpportunity) return;
    
    const pulse = initializeMarketPulse({
      opportunityId: selectedOpportunity.id,
      onPriceUpdate: (priceChange, direction) => {
        setPriceDirection(direction);
        setShowPriceAnimation(true);
        
        setTimeout(() => {
          setPriceDirection('neutral');
          setShowPriceAnimation(false);
        }, 1000);
      }
    });
    
    return () => pulse.disconnect();
  }, [selectedOpportunity]);
  
  // Handle bid submission
  const handleSubmitBid = async (amount: number, pitch: string, paymentIntentId?: string) => {
    resetBidError();
    
    const success = await submitBid(opportunityId, amount, pitch, paymentIntentId);
    
    if (success) {
      toast({
        title: "Bid Submitted",
        description: "Your bid has been successfully submitted.",
      });
    }
  };
  
  // Loading state
  if (isLoadingOpportunity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading opportunity...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (opportunityError || !selectedOpportunity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-red-800 mb-2">Failed to load opportunity</h2>
            <p className="text-red-600 mb-4">{opportunityError || "Opportunity not found"}</p>
            <Link href="/opportunities">
              <Button variant="outline">Back to Opportunities</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Calculate market metrics
  const hoursActive = (Date.now() - new Date(selectedOpportunity.postedAt).getTime()) / (1000 * 60 * 60);
  const marketHeat = calculateMarketHeat(selectedOpportunity.basePrice, selectedOpportunity.currentPrice, hoursActive);
  const pulseIndicators = getMarketPulseIndicators(marketHeat);
  const priceChange = ((selectedOpportunity.currentPrice - selectedOpportunity.basePrice) / selectedOpportunity.basePrice) * 100;
  
  // Tier styling
  const getTierStyling = (tier: number) => {
    switch (tier) {
      case 1:
        return {
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Trophy className="h-4 w-4" />,
          label: 'Tier 1'
        };
      case 2:
        return {
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Award className="h-4 w-4" />,
          label: 'Tier 2'
        };
      default:
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Target className="h-4 w-4" />,
          label: 'Tier 3'
        };
    }
  };
  
  const tierStyling = getTierStyling(selectedOpportunity.tier);
  
  // Format dates
  const deadlineDate = new Date(selectedOpportunity.deadline);
  const formattedDeadline = format(deadlineDate, 'MMM d, yyyy');
  const postedDate = new Date(selectedOpportunity.postedAt);
  const formattedPostedDate = format(postedDate, 'MMM d, yyyy');
  
  // Check if deadline has passed
  const deadlinePassed = deadlineDate.getTime() < Date.now();
  const daysAgo = deadlinePassed ? Math.abs(Math.floor((Date.now() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/opportunities">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Opportunities</span>
              </Button>
            </Link>
            
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${pulseIndicators.bgColor} ${pulseIndicators.borderColor} border`}>
              <span className="text-sm">{pulseIndicators.icon}</span>
              <span className={`text-sm font-medium ${pulseIndicators.color}`}>
                {pulseIndicators.label} Market
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Expired opportunity warning */}
        {deadlinePassed && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-amber-800 font-semibold text-lg mb-2">
                  Opportunity Expired
                </h3>
                <p className="text-amber-700 mb-2">
                  This request expired {daysAgo} days ago on {format(deadlineDate, 'MMMM d, yyyy')}. 
                  You can still submit a pitch as reporters sometimes consider late submissions.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Card */}
            <Card className="bg-white/70 backdrop-blur-sm border-2 border-gray-200">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-4">
                    {selectedOpportunity.outletLogo && (
                      <img
                        src={selectedOpportunity.outletLogo}
                        alt={`${selectedOpportunity.outlet} logo`}
                        className="h-16 w-16 object-contain rounded-lg bg-white border border-gray-200 p-2"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-logo.png';
                        }}
                      />
                    )}
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {selectedOpportunity.title}
                      </h1>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center text-gray-600">
                          <Building className="h-4 w-4 mr-1" />
                          <span className="font-medium">{selectedOpportunity.outlet}</span>
                        </div>
                        <Badge className={`${tierStyling.badge} flex items-center space-x-1`}>
                          {tierStyling.icon}
                          <span>{tierStyling.label}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  {selectedOpportunity.summary}
                </p>
                
                {/* Topic Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedOpportunity.topicTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                      <Tag className="h-3 w-3" />
                      <span>{tag}</span>
                    </Badge>
                  ))}
                </div>
                
                {/* Key Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-sm text-blue-600 font-medium">Posted</div>
                    <div className="text-lg font-bold text-blue-900">{formattedPostedDate}</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <Clock className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <div className="text-sm text-red-600 font-medium">Time Left</div>
                    <div className="text-lg font-bold text-red-900">{timeLeft}</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Star className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-sm text-green-600 font-medium">Slots Left</div>
                    <div className="text-lg font-bold text-green-900">{selectedOpportunity.slotsRemaining}</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Zap className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-sm text-purple-600 font-medium">Activity</div>
                    <div className="text-lg font-bold text-purple-900">{pulseIndicators.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Price Section */}
            <Card className={`bg-white/70 backdrop-blur-sm border-2 ${pulseIndicators.borderColor} ${pulseIndicators.pulse}`}>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Live Auction Price</h2>
                  <div className="flex items-center space-x-2">
                    {priceDirection === 'up' && (
                      <TrendingUp className={`h-6 w-6 text-green-500 ${showPriceAnimation ? 'animate-bounce' : ''}`} />
                    )}
                    {priceDirection === 'down' && (
                      <TrendingDown className={`h-6 w-6 text-red-500 ${showPriceAnimation ? 'animate-bounce' : ''}`} />
                    )}
                  </div>
                </div>
                
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline space-x-4">
                    <span className={`text-5xl font-bold ${
                      showPriceAnimation && priceDirection === 'up' ? 'text-green-600 animate-pulse' :
                      showPriceAnimation && priceDirection === 'down' ? 'text-red-600 animate-pulse' :
                      'text-gray-900'
                    } transition-colors duration-300`}>
                      ${selectedOpportunity.currentPrice}
                    </span>
                    <span className="text-xl text-gray-500">
                      from ${selectedOpportunity.basePrice}
                    </span>
                  </div>
                  
                  {priceChange > 0 && (
                    <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span className="text-lg font-bold text-green-600">
                        +{priceChange.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Price Chart */}
                <PriceChart
                  priceHistory={priceHistory}
                  basePrice={selectedOpportunity.basePrice}
                  currentPrice={selectedOpportunity.currentPrice}
                  isLoading={isLoadingPriceHistory}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Bid Ticket Sidebar */}
          <div className="space-y-6">
            {bidInfo ? (
              <BidTicket
                bidInfo={bidInfo}
                onSubmitBid={handleSubmitBid}
                isSubmitting={isSubmittingBid}
                error={bidError}
                publicationName={selectedOpportunity.outlet || 'Publication'}
                opportunityId={selectedOpportunity.id}
              />
            ) : (
              <Card className="bg-white/70 backdrop-blur-sm">
                <CardContent className="p-8 flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}