import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Search, Trophy, TrendingUp, Calendar, Star, Award, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { mockOpportunity } from '@/mocks/opportunity';
import OpportunityCard from '@/components/opportunity/OpportunityCard';
import QuoteBidLogo from '@/components/QuoteBidLogo';
import { initializeMarketPulse, MarketPulseConnection } from '@/lib/marketPulse';
import { Opportunity } from '@shared/types/opportunity';
import { apiFetch } from '@/lib/apiFetch';

// Demo opportunity data
const DEMO_OPPORTUNITY = {
  id: 10,
  title: "Crypto Experts Needed For A Story on Agentic AI in Crypto",
  outlet: "Bloomberg",
  tier: 1,
  summary: "Looking for Crypto Experts to give insight on the following:\n\n1. Is the Crypto Market good for AI?\n\n2. Will Crypto use Agentic AI?\n\n3. How does this help companies in the Crypto space?",
  topicTags: ["Crypto", "Capital Markets"],
  basePrice: 199,
  currentPrice: 249,
  deadline: new Date("2025-05-25").toISOString(),
  postedAt: new Date("2025-05-01").toISOString(),
  outletLogo: "https://logos-world.net/wp-content/uploads/2021/02/Bloomberg-Logo.png"
};

export default function AuctionStyleOpportunities() {
  // Use state for opportunity data
  const [opportunity, setOpportunity] = useState({
    ...mockOpportunity,
    // Use the DEMO_OPPORTUNITY data for consistency
    title: DEMO_OPPORTUNITY.title,
    outlet: DEMO_OPPORTUNITY.outlet,
    outletLogo: DEMO_OPPORTUNITY.outletLogo,
    summary: DEMO_OPPORTUNITY.summary,
    topicTags: DEMO_OPPORTUNITY.topicTags,
    basePrice: DEMO_OPPORTUNITY.basePrice,
    currentPrice: DEMO_OPPORTUNITY.currentPrice,
    deadline: DEMO_OPPORTUNITY.deadline,
    postedAt: DEMO_OPPORTUNITY.postedAt
  });
  
  // State for auction features
  const [priceDirection, setPriceDirection] = useState<'neutral' | 'up' | 'down'>('neutral');
  const [currentPrice, setCurrentPrice] = useState(DEMO_OPPORTUNITY.currentPrice);
  const [searchTerm, setSearchTerm] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPriceAnimation, setShowPriceAnimation] = useState(false);
  
  // Market pulse connection
  const [marketPulse, setMarketPulse] = useState<MarketPulseConnection | null>(null);
  
  // Simulate price changes
  const simulatePriceChange = () => {
    const randomChange = Math.floor(Math.random() * 6) - 3; // -3 to +2
    const newPrice = Math.max(DEMO_OPPORTUNITY.basePrice, currentPrice + randomChange);
    
    if (newPrice > currentPrice) {
      setPriceDirection('up');
    } else if (newPrice < currentPrice) {
      setPriceDirection('down');
    }
    
    setCurrentPrice(newPrice);
    setShowPriceAnimation(true);
    
    // Reset direction and animation after animation
    setTimeout(() => {
      setPriceDirection('neutral');
      setShowPriceAnimation(false);
    }, 1000);
  };
  
  // Update opportunity state when price changes
  useEffect(() => {
    setOpportunity(prev => ({
      ...prev,
      currentPrice: currentPrice
    }));
  }, [currentPrice]);

  // Initialize market pulse WebSocket connection
  useEffect(() => {
    const pulse = initializeMarketPulse({
      opportunityId: opportunity.id,
      onPriceUpdate: (priceChange, direction) => {
        const newPrice = Math.max(opportunity.basePrice, currentPrice + priceChange);
        setCurrentPrice(newPrice);
        setPriceDirection(direction);
        setShowPriceAnimation(true);
        
        setTimeout(() => {
          setPriceDirection('neutral');
          setShowPriceAnimation(false);
        }, 1000);
      },
      onBidReceived: (bidData) => {
        console.log('New bid received:', bidData);
      }
    });
    
    setMarketPulse(pulse);
    
    // Cleanup on unmount
    return () => {
      pulse.disconnect();
    };
  }, [opportunity.id, opportunity.basePrice, currentPrice]);

  // Fetch real opportunities from API
  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const response = await apiFetch('/api/opportunities');
        if (response.ok) {
          const data = await response.json();
          
          // Format the opportunities data
          const formattedOpportunities = data.map((item: any) => {
            const opp = item.opportunity || item;
            const pub = item.publication || {};
            
            return {
              id: opp.id,
              title: opp.title || '',
              outlet: pub.name || opp.outlet || '',
              outletLogo: pub.logo || opp.outletLogo || '',
              tier: opp.tier ? (typeof opp.tier === 'string' && opp.tier.startsWith('Tier ') ? parseInt(opp.tier.split('Tier ')[1]) : Number(opp.tier)) : 1,
              status: opp.status || 'open',
              summary: opp.description || opp.summary || '',
              topicTags: Array.isArray(opp.tags) ? opp.tags : 
                       (opp.topicTags || []).map((tag: any) => 
                         typeof tag === 'string' ? tag : (tag.name || '')),
              slotsTotal: opp.slotsTotal || 1,
              slotsRemaining: opp.slotsRemaining || 1,
              basePrice: opp.minimumBid || opp.basePrice || 0,
              currentPrice: opp.currentPrice || opp.minimumBid || 0,
              increment: opp.increment || 50,
              floorPrice: opp.floorPrice || opp.minimumBid || 0,
              cutoffPrice: opp.cutoffPrice || (opp.minimumBid ? opp.minimumBid * 2 : 0),
              deadline: opp.deadline || new Date().toISOString(),
              postedAt: opp.createdAt || new Date().toISOString(),
              createdAt: opp.createdAt || new Date().toISOString(),
              updatedAt: opp.updatedAt || new Date().toISOString(),
              publicationId: opp.publicationId || pub.id || 0,
            } as Opportunity;
          });
          
          setOpportunities(formattedOpportunities);
        }
      } catch (error) {
        console.error('Error fetching opportunities:', error);
        // Fallback to demo data
        setOpportunities([opportunity]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOpportunities();
  }, []);

  // Filter opportunities based on search
  const filteredOpportunities = opportunities.filter(opp =>
    opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.outlet.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.topicTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleBidClick = (opportunityId: number) => {
    // Navigate to opportunity detail page or open bid modal
    console.log('Bidding on opportunity:', opportunityId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/opportunities">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to List</span>
                </Button>
              </Link>
              <QuoteBidLogo size="sm" />
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search opportunities..."
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={simulatePriceChange}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Simulate Price Change</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Live Auction Marketplace
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Watch prices move in real-time as experts compete for premium media opportunities. 
            Lock in your bid before the market heats up.
          </p>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{opportunities.filter(o => o.tier === 1).length}</div>
              <div className="text-sm text-gray-600">Tier 1 Outlets</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                ${Math.round(opportunities.reduce((sum, o) => sum + o.currentPrice, 0) / opportunities.length || 0)}
              </div>
              <div className="text-sm text-gray-600">Avg. Current Price</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{opportunities.filter(o => o.status === 'open').length}</div>
              <div className="text-sm text-gray-600">Active Auctions</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {opportunities.reduce((sum, o) => sum + o.slotsRemaining, 0)}
              </div>
              <div className="text-sm text-gray-600">Available Slots</div>
            </CardContent>
          </Card>
        </div>

        {/* Featured Opportunity */}
        {opportunity && (
          <div className="mb-12">
            <div className="flex items-center space-x-2 mb-6">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 px-3 py-1">
                🔥 Featured Auction
              </Badge>
              <span className="text-sm text-gray-600">Live pricing updates</span>
            </div>
            
            <div className="max-w-md mx-auto">
              <OpportunityCard
                opportunity={opportunity}
                onBidClick={handleBidClick}
                showPriceAnimation={showPriceAnimation}
                priceDirection={priceDirection}
              />
            </div>
          </div>
        )}

        {/* All Opportunities Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">All Live Auctions</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredOpportunities.length} opportunities
              </span>
              {searchTerm && (
                <Badge variant="outline" className="text-xs">
                  Filtered: "{searchTerm}"
                </Badge>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-48 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onBidClick={handleBidClick}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No opportunities found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? `No opportunities match "${searchTerm}". Try adjusting your search.`
                    : 'No opportunities are currently available.'
                  }
                </p>
                {searchTerm && (
                  <Button onClick={() => setSearchTerm('')} variant="outline">
                    Clear Search
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 