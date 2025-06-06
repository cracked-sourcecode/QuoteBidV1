import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp, TrendingDown, Minus, Award, Target, Trophy, Bookmark } from 'lucide-react';
import { Opportunity } from '@shared/types/opportunity';
import { calculateMarketHeat, getMarketPulseIndicators } from '@/lib/marketPulse';
import { useOpportunityPrice } from '@/contexts/PriceContext';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onBidClick?: (opportunityId: number) => void;
  showPriceAnimation?: boolean;
  priceDirection?: 'up' | 'down' | 'neutral';
}

export default function OpportunityCard({ 
  opportunity, 
  onBidClick,
  showPriceAnimation = false,
  priceDirection = 'neutral'
}: OpportunityCardProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  
  // Connect to real-time price updates from pricing engine
  const priceData = useOpportunityPrice(opportunity.id);
  
  // Use real-time price data if available, fallback to opportunity data
  const currentPrice = priceData?.currentPrice || opportunity.currentPrice;
  const priceTrend = priceData?.trend || opportunity.trend || 'stable';
  const percentChange = priceData?.percentChange || 0;
  
  // Calculate time until deadline
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const deadline = new Date(opportunity.deadline).getTime();
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
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [opportunity.deadline]);
  
  // Calculate market heat and indicators using real-time price
  const hoursActive = (Date.now() - new Date(opportunity.postedAt).getTime()) / (1000 * 60 * 60);
  const marketHeat = calculateMarketHeat(opportunity.basePrice, currentPrice, hoursActive);
  const pulseIndicators = getMarketPulseIndicators(marketHeat);
  
  // Price change percentage using real-time data
  const realPriceChange = ((currentPrice - opportunity.basePrice) / opportunity.basePrice) * 100;
  
  // Tier styling
  const getTierStyling = (tier: number) => {
    switch (tier) {
      case 1:
        return {
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Trophy className="h-3 w-3" />,
          label: 'Tier 1'
        };
      case 2:
        return {
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Award className="h-3 w-3" />,
          label: 'Tier 2'
        };
      default:
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Target className="h-3 w-3" />,
          label: 'Tier 3'
        };
    }
  };
  
  const tierStyling = getTierStyling(opportunity.tier);
  
  const handleBidClick = () => {
    if (onBidClick) {
      onBidClick(opportunity.id);
    }
  };

  const handleSaveClick = () => {
    setIsSaved(!isSaved);
    // TODO: Connect to database and pricing engine
    console.log(`${isSaved ? 'Unsaved' : 'Saved'} opportunity ${opportunity.id}`);
  };
  
  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${pulseIndicators.bgColor} ${pulseIndicators.borderColor} border-2 ${pulseIndicators.pulse}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <img 
              src={opportunity.outletLogo} 
              alt={opportunity.outlet}
              className="h-6 w-6 rounded object-contain"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-logo.png';
              }}
            />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{opportunity.outlet}</h3>
              <Badge className={`${tierStyling.badge} text-xs px-2 py-0.5 flex items-center space-x-1`}>
                {tierStyling.icon}
                <span>{tierStyling.label}</span>
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Save Button */}
            <button
              onClick={handleSaveClick}
              className={`p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
                isSaved 
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save opportunity'}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          
          {/* Market Heat Indicator */}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${pulseIndicators.bgColor} ${pulseIndicators.borderColor} border`}>
            <span className="text-xs">{pulseIndicators.icon}</span>
            <span className={`text-xs font-medium ${pulseIndicators.color}`}>
              {pulseIndicators.label}
            </span>
            </div>
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {opportunity.title}
        </h2>
        
        {/* Summary */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
          {opportunity.summary}
        </p>
        
        {/* Topic Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {opportunity.topicTags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
              {tag}
            </Badge>
          ))}
          {opportunity.topicTags.length > 3 && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              +{opportunity.topicTags.length - 3}
            </Badge>
          )}
        </div>
        
        {/* Price Section - Now using real-time pricing data */}
        <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Current Price</span>
            <div className="flex items-center space-x-1">
              {/* Dynamic pricing indicator */}
              {priceData && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-red-600 border-red-200">
                  ● Dynamic
                </Badge>
              )}
              {(priceTrend === 'up' || priceDirection === 'up') && (
                <TrendingUp className={`h-3 w-3 text-green-500 ${showPriceAnimation || priceData ? 'animate-bounce' : ''}`} />
              )}
              {(priceTrend === 'down' || priceDirection === 'down') && (
                <TrendingDown className={`h-3 w-3 text-red-500 ${showPriceAnimation || priceData ? 'animate-bounce' : ''}`} />
              )}
              {priceTrend === 'stable' && (
                <Minus className="h-3 w-3 text-gray-400" />
              )}
            </div>
          </div>
          
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline space-x-2">
              <span className={`text-xl font-bold ${
                (showPriceAnimation && priceDirection === 'up') || priceTrend === 'up' ? 'text-green-600 animate-pulse' :
                (showPriceAnimation && priceDirection === 'down') || priceTrend === 'down' ? 'text-red-600 animate-pulse' :
                priceData ? 'text-blue-600' : 'text-gray-900'
              } transition-colors duration-300`}>
                ${currentPrice}
              </span>
              {priceTrend !== 'stable' && (
                <span className="text-xs text-green-500 ml-1">
                  {priceTrend === 'up' && '↑'}
                  {priceTrend === 'down' && '↓'}
                </span>
              )}
              <span className="text-xs text-gray-500">
                from ${opportunity.basePrice}
              </span>
            </div>
            
            {/* Show percentage change with real-time data */}
            {realPriceChange !== 0 && (
              <div className="flex items-center space-x-1">
                {realPriceChange > 0 ? (
                  <>
                <TrendingUp className="h-2.5 w-2.5 text-green-500" />
                <span className="text-xs font-medium text-green-600">
                      +{realPriceChange.toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-2.5 w-2.5 text-red-500" />
                    <span className="text-xs font-medium text-red-600">
                      {realPriceChange.toFixed(0)}%
                </span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Real-time price metadata */}
          {priceData?.lastPriceUpdate && (
            <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Updated {new Date(priceData.lastPriceUpdate).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="text-center">
            <div className="text-base font-bold text-gray-900">{opportunity.slotsRemaining}</div>
            <div className="text-xs text-gray-500">Slots Left</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Clock className="h-3 w-3 text-gray-400 mr-1" />
              <span className="text-sm font-semibold text-gray-900">{timeLeft}</span>
            </div>
            <div className="text-xs text-gray-500">Time Left</div>
          </div>
        </div>
        
        {/* Action Button - using real-time price */}
        <Button 
          onClick={handleBidClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105"
          disabled={opportunity.status !== 'open' || opportunity.slotsRemaining === 0}
        >
          {opportunity.status !== 'open' 
            ? 'Closed' 
            : opportunity.slotsRemaining === 0 
            ? 'No Slots Available'
            : `Place Bid at $${currentPrice}`
          }
        </Button>
      </CardContent>
    </Card>
  );
} 