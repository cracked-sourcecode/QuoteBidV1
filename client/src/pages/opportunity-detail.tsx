import { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { ChevronLeft, Calendar, Clock, DollarSign, TrendingUp, Flame, ChevronUp, Info, Mic, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/apiFetch';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ReferenceDot, Tooltip } from 'recharts';
import LogoUniform from '@/components/ui/logo-uniform';

export default function OpportunityDetail() {
  const { toast } = useToast();
  const [, params] = useRoute('/opportunities/:id');
  const opportunityId = params ? parseInt(params.id) : 0;
  const [isBriefMinimized, setIsBriefMinimized] = useState(false);
  const [pitchContent, setPitchContent] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'Daily' | 'Weekly'>('Daily');
  
  // State for real data
  const [opportunity, setOpportunity] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [bidInfo, setBidInfo] = useState<any>(null);
  const [pitches, setPitches] = useState<any[]>([]);
  const [relatedOpportunities, setRelatedOpportunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  
  // Fetch opportunity data
  useEffect(() => {
    const fetchOpportunityData = async () => {
      if (!opportunityId) return;
      
      // Scroll to top when navigating to a new opportunity
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch opportunity details
        const opportunityResponse = await apiFetch(`/api/opportunities/${opportunityId}`, {
          credentials: 'include'
        });
        
        if (!opportunityResponse.ok) {
          throw new Error('Failed to fetch opportunity details');
        }
        
        const opportunityData = await opportunityResponse.json();
        setOpportunity(opportunityData);
        
        // Fetch price history
        try {
          const priceResponse = await apiFetch(`/api/opportunities/${opportunityId}/price-history`, {
            credentials: 'include'
          });
          
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            // Transform price history data for the chart
            const chartData = priceData.map((item: any, index: number) => ({
              day: index + 1,
              price: item.price,
              label: `${index + 1}d`,
              timestamp: item.timestamp
            }));
            setPriceHistory(chartData);
          }
        } catch (priceError) {
          console.log('Price history not available, using fallback data');
          // Generate fallback price data
          const fallbackData = generateFallbackPriceData(opportunityData);
          setPriceHistory(fallbackData);
        }
        
        // Fetch bid info
        try {
          const bidResponse = await apiFetch(`/api/opportunities/${opportunityId}/bid-info`, {
            credentials: 'include'
          });
          
          if (bidResponse.ok) {
            const bidData = await bidResponse.json();
            setBidInfo(bidData);
          }
        } catch (bidError) {
          console.log('Bid info not available, using fallback data');
          // Generate fallback bid info
          setBidInfo({
            opportunityId: opportunityData.id,
            currentPrice: opportunityData.currentPrice || opportunityData.basePrice || 100,
            minBid: (opportunityData.currentPrice || opportunityData.basePrice || 100) + 50,
            deadline: opportunityData.deadline,
            slotsRemaining: opportunityData.slotsRemaining || 3,
            slotsTotal: opportunityData.slotsTotal || 5
          });
        }
        
        // Fetch pitches with user data
        try {
          const pitchesResponse = await apiFetch(`/api/opportunities/${opportunityId}/pitches-with-users`, {
            credentials: 'include'
          });
          
          if (pitchesResponse.ok) {
            const pitchesData = await pitchesResponse.json();
            setPitches(pitchesData || []);
          }
        } catch (pitchError) {
          console.log('Pitches not available, using fallback data');
          setPitches([]);
        }

        // Fetch related opportunities by industry
        if (opportunityData) {
          try {
            // Get the primary industry/category from topic tags
            const primaryCategory = opportunityData.topicTags?.[0] || opportunityData.industry || 'General';
            const relatedResponse = await apiFetch(`/api/opportunities/related/${encodeURIComponent(primaryCategory)}?exclude=${opportunityId}`, {
              credentials: 'include'
            });
            
            if (relatedResponse.ok) {
              const relatedData = await relatedResponse.json();
              setRelatedOpportunities(relatedData || []);
            }
          } catch (relatedError) {
            console.log('Related opportunities not available, using fallback data');
            setRelatedOpportunities([]);
          }
        }
        
      } catch (err) {
        console.error('Error fetching opportunity data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load opportunity');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOpportunityData();
  }, [opportunityId]);
  
  // Generate fallback price data if API doesn't have it
  const generateFallbackPriceData = (opp: any) => {
    const basePrice = opp.basePrice || 100;
    const currentPrice = opp.currentPrice || basePrice;
    const days = 7;
    
    const data = [];
    for (let i = 0; i < days; i++) {
      const progress = i / (days - 1);
      const price = Math.round(basePrice + (currentPrice - basePrice) * progress);
      data.push({
        day: i + 1,
        price: price,
        label: `${i + 1}d`
      });
    }
    
    return data;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading opportunity details...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Opportunity not found'}</p>
          <Link href="/opportunities">
            <Button>Back to Opportunities</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = bidInfo?.currentPrice || opportunity?.currentPrice || opportunity?.basePrice || 100;
  const priceIncrease = currentPrice - (opportunity?.basePrice || 100);
  const belowListPercentage = 17; // This could be calculated based on real data later
  const maxPitchLength = 2000;
  const remainingChars = maxPitchLength - pitchContent.length;
  
  // Calculate if today is the deadline
  const isToday = opportunity?.deadline ? format(new Date(opportunity.deadline), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false;

  // Use real price data or fallback data
  const priceData = priceHistory.length > 0 ? priceHistory : [
    { day: 1, price: currentPrice - 50, label: '1d' },
    { day: 2, price: currentPrice - 30, label: '2d' },
    { day: 3, price: currentPrice - 20, label: '3d' },
    { day: 4, price: currentPrice - 35, label: '4d' },
    { day: 5, price: currentPrice - 10, label: '5d' },
    { day: 6, price: currentPrice - 5, label: '6d' },
    { day: 7, price: currentPrice, label: '7d' }
  ];

  const handleSecurePitch = () => {
    toast({
      title: "Pitch Submitted",
      description: `Your pitch has been submitted at the current market rate of $${currentPrice}`,
    });
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentPrice = payload[0].value;
      const dayIndex = payload[0].payload.day;
      const prevPrice = dayIndex > 1 ? priceData[dayIndex - 2].price : priceData[0].price;
      const priceChange = currentPrice - prevPrice;
      const changeDirection = priceChange >= 0 ? '+' : '';
      
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[140px]">
          <div className="text-xs text-gray-500 font-medium mb-1">Day {dayIndex}</div>
          <div className="text-lg font-bold text-gray-900 mb-1">${currentPrice}</div>
          {dayIndex > 1 && (
            <div className={`text-xs font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changeDirection}${Math.abs(priceChange)} from yesterday
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Get tier display
  const getTierDisplay = (tier: any) => {
    if (typeof tier === 'number') return tier;
    if (typeof tier === 'string') {
      // Remove all instances of "Tier" (case insensitive) and extract just the number
      const cleanTier = tier.replace(/tier\s*/gi, '').trim();
      const parsed = parseInt(cleanTier);
      return isNaN(parsed) ? 1 : parsed;
    }
    return 1; // Default
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Main Content */}
      <div className="mx-auto px-4 py-4">
        {/* White Container Wrapper */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="px-6 pb-6">
            {/* Publication Name */}
            <div className="-mt-2">
              {/* Show publication logo if available, otherwise show name */}
              {opportunity.outletLogo && !logoFailed ? (
                <img
                  src={opportunity.outletLogo}
                  alt={opportunity.outlet}
                  className="h-32 w-auto object-contain"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <h2 className="text-4xl font-semibold text-black tracking-tight">
                  {opportunity.outlet}
                </h2>
              )}
            </div>

            {/* Opportunity Title */}
            <div className="mb-6 -mt-4">
              <h1 className="text-5xl font-medium text-black leading-tight tracking-tighter">
                {opportunity.title}
              </h1>
            </div>

            {/* Topic Tags */}
            <div className="mb-10">
              <div className="flex items-center space-x-3">
                <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md px-4 py-2 text-sm font-semibold">
                  Tier {getTierDisplay(opportunity.tier)}
                </Badge>
                {(opportunity.topicTags || []).map((tag: string, index: number) => (
                  <div 
                    key={`${tag}-${index}`}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full shadow-sm border border-gray-200 hover:bg-gray-150 transition-colors"
                  >
                    {tag}
                  </div>
                ))}
              </div>
              <div className="mt-4 h-1.5 w-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-sm"></div>
            </div>

            {/* Key Info Row */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              {/* Posted Date */}
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-50 rounded-xl shadow-sm">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Posted</div>
                  <div className="text-xl font-semibold text-gray-900 mt-1">
                    {format(new Date(opportunity.postedAt || opportunity.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              {/* Deadline */}
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-orange-50 rounded-xl shadow-sm">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Deadline</div>
                  <div className="text-xl font-semibold text-gray-900 mt-1 flex items-center space-x-3">
                    <span>{format(new Date(opportunity.deadline), 'MMM d, yyyy')}</span>
                    {isToday && (
                      <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold px-3 py-1 shadow-md">
                        Today
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity */}
            <div className="mb-10">
              <div className="bg-gray-50 rounded-2xl border border-gray-200/50 p-6">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex items-center justify-center w-6 h-6">
                      <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></span>
                    </div>
                    <span className="text-lg font-medium text-gray-800">Live Activity:</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-xl border border-green-200/50">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">${Math.abs(priceIncrease)} {priceIncrease >= 0 ? 'increase' : 'decrease'} (last hour)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200/50">
                    <Flame className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">8 pitches (last hour)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-orange-50 px-4 py-2 rounded-xl border border-orange-200/50">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">
                      {Math.max(0, Math.ceil((new Date(opportunity.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)))}h remaining
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Opportunity Brief Card */}
            <div className="bg-gray-50 rounded-3xl border border-gray-200/50 overflow-hidden mb-10">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-1.5">
                      <span className="w-3 h-3 bg-blue-500 rounded-full shadow-md"></span>
                      <span className="w-3 h-3 bg-blue-400 rounded-full shadow-md"></span>
                      <span className="w-3 h-3 bg-blue-300 rounded-full shadow-md"></span>
                    </div>
                    <h3 className="text-xl font-bold text-blue-600 uppercase tracking-wider">
                      OPPORTUNITY BRIEF
                    </h3>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">Classification:</span>
                    <Badge className={`border-0 px-4 py-2 font-semibold shadow-md ${
                      opportunity.status === 'open' 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                    }`}>
                      {opportunity.status ? opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1) : 'Open'}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                {!isBriefMinimized && (
                  <div className="mb-6">
                    <div className="bg-gradient-to-r from-white to-gray-50 border-l-4 border-blue-500 rounded-r-2xl shadow-inner overflow-hidden">
                      <div className="p-6">
                        <div className="text-gray-900 text-lg leading-relaxed">
                          {opportunity.summary ? (
                            <div className="whitespace-pre-wrap">{opportunity.summary}</div>
                          ) : (
                            <div>
                              <p className="font-semibold text-gray-800 mb-4 text-xl">
                                {opportunity.title}
                              </p>
                              <p className="text-gray-700">
                                This opportunity is seeking expert commentary and insights. Please provide your relevant experience and perspective in your pitch.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Minimize Button */}
                <div className="flex justify-start">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsBriefMinimized(!isBriefMinimized)}
                    className="flex items-center space-x-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 px-4 py-3 rounded-xl font-semibold"
                  >
                    <ChevronUp className={`h-5 w-5 transition-transform duration-300 ${isBriefMinimized ? 'rotate-180' : ''}`} />
                    <span className="uppercase tracking-wide text-sm">{isBriefMinimized ? 'EXPAND BRIEF' : 'MINIMIZE BRIEF'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Marketplace Pricing Section */}
            <div className="bg-gray-50 rounded-3xl border border-gray-200/50 overflow-hidden">
              <div className="grid grid-cols-2 gap-0">
                {/* Price Trend Section - Left Side */}
                <div className="p-8 border-r border-gray-200/50">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-gray-900">Price Trend</h3>
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          className="px-4 py-2 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm"
                        >
                          Daily
                        </button>
                      </div>
                    </div>

                    {/* Immersive Price Chart - Full Container */}
                    <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={priceData} 
                          margin={{ top: 5, right: 5, bottom: 5, left: 25 }}
                        >
                          <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          
                          <CartesianGrid 
                            strokeDasharray="2 2" 
                            stroke="#E5E7EB" 
                            strokeOpacity={0.5}
                            vertical={false}
                          />
                          
                          <XAxis 
                            type="number"
                            dataKey="day"
                            domain={[1, 7]}
                            ticks={[1, 2, 3, 4, 5, 6, 7]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            tickFormatter={(value) => `${value}d`}
                            height={15}
                          />
                          
                          <YAxis 
                            type="number"
                            domain={[
                              Math.floor(Math.min(...priceData.map(p => p.price)) * 0.95), 
                              Math.ceil(Math.max(...priceData.map(p => p.price)) * 1.05)
                            ]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            tickFormatter={(value) => `$${value}`}
                            width={25}
                          />
                          
                          <Tooltip content={<CustomTooltip />} />
                          
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke="#3B82F6"
                            strokeWidth={3.5}
                            fill="url(#priceGradient)"
                            dot={false}
                            activeDot={{ 
                              r: 5, 
                              fill: '#3B82F6', 
                              stroke: '#FFFFFF', 
                              strokeWidth: 2
                            }}
                          />
                          
                          <ReferenceDot
                            x={priceData.length}
                            y={currentPrice}
                            r={4}
                            fill="#3B82F6"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Price range */}
                    <div className="flex justify-between items-center mt-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 font-bold text-lg">${Math.min(...priceData.map(p => p.price))}</span>
                        <span className="text-gray-500 text-sm">Low</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-500 font-bold text-lg">${Math.max(...priceData.map(p => p.price))}</span>
                        <span className="text-gray-500 text-sm">High</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Price & Pitch Section - Right Side */}
                <div className="p-8 relative">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Current Price</h3>
                      <div className="flex items-center space-x-2 text-green-600 text-sm font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>{belowListPercentage}% below list price</span>
                      </div>
                    </div>

                    <div className="flex items-baseline space-x-3 mb-4">
                      <span className="text-4xl font-bold text-blue-600">${currentPrice}</span>
                      {priceIncrease !== 0 && (
                        <div className={`flex items-center space-x-1 text-lg font-semibold ${priceIncrease >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <TrendingUp className={`h-5 w-5 ${priceIncrease < 0 ? 'rotate-180' : ''}`} />
                          <span>{priceIncrease >= 0 ? '+' : ''}${priceIncrease}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mb-8">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      <span className="text-gray-600 font-medium">Dynamic pricing</span>
                    </div>

                    {/* Pitch Input */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-gray-700 font-medium">Add your pitch manually here</label>
                        <span className="text-red-500 text-sm font-medium">{remainingChars} characters remaining</span>
                      </div>
                      
                      <Textarea
                        value={pitchContent}
                        onChange={(e) => setPitchContent(e.target.value)}
                        placeholder="Your pitch..."
                        className="min-h-[200px] w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none text-gray-700"
                        maxLength={maxPitchLength}
                      />
                    </div>

                    {/* Record Pitch Button */}
                    <div className="flex items-center justify-between mb-6">
                      <Button
                        variant="outline"
                        className="flex items-center space-x-2 text-red-500 border-red-200 hover:bg-red-50"
                      >
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium">Record Pitch</span>
                      </Button>
                      <span className="text-blue-600 text-sm font-medium">Powered by QuoteBid AI</span>
                    </div>

                    {/* Secure Pitch Button */}
                    <Button
                      onClick={handleSecurePitch}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mb-4"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <Lock className="h-5 w-5" />
                        <span>Secure Pitch at ${currentPrice}</span>
                      </div>
                    </Button>

                    {/* Disclaimer */}
                    <p className="text-gray-500 text-sm text-center leading-relaxed">
                      By pitching, you agree to pay the accepted market rate at the time of submission—only if you're included in the article.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Competition Momentum Section */}
            <div className="mt-12 bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl border border-orange-200/50 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <Flame className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Competition Momentum</h3>
                      <p className="text-gray-600 mt-1">Demand level based on expert pitches</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 text-sm font-bold shadow-md">
                    {pitches.length === 0 ? 'No Interest' : 
                     pitches.length <= 2 ? 'Low Demand' : 
                     pitches.length <= 5 ? 'Medium Demand' : 
                     'High Demand'}
                  </Badge>
                </div>

                {/* Competition Meter */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Demand Level</span>
                    <span className="text-sm font-bold text-orange-600">{Math.min(pitches.length * 15, 100)}% Competitive</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div 
                      className="h-3 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400 transition-all duration-1000 ease-out shadow-sm"
                      style={{ width: `${Math.min(pitches.length * 15, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Low Demand</span>
                    <span>Medium Demand</span>
                    <span>High Demand</span>
                  </div>
                </div>

                {/* Experts Pitched - Combined Display */}
                <div className="bg-white/50 rounded-2xl p-6 border border-white/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Count Display */}
                      <div className="flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-xl shadow-md">
                        <span className="font-bold text-2xl">{pitches.length}</span>
                      </div>
                      
                      {/* Info */}
                      <div>
                        <div className="text-lg font-bold text-gray-900">Experts Pitched</div>
                        <div className="text-green-600 text-sm font-semibold">↗ +{pitches.length} today</div>
                        <div className="text-gray-500 text-sm">Driving current demand level</div>
                      </div>
                    </div>
                    
                    {/* Expert Avatars - Real user profile photos */}
                    <div className="flex items-center">
                      {pitches.length > 0 ? (
                        <>
                          {pitches.slice(0, 5).map((pitch, index) => (
                            <div key={pitch.id} className={`flex items-center justify-center w-10 h-10 rounded-full shadow-md border-2 border-white ${index > 0 ? '-ml-2' : ''}`}>
                              {pitch.user?.avatar ? (
                                <img 
                                  src={`http://localhost:5050${pitch.user.avatar}`}
                                  alt={pitch.user.fullName || 'Expert'}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {pitch.user?.fullName ? pitch.user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'EX'}
                                </div>
                              )}
                            </div>
                          ))}
                          {pitches.length > 5 && (
                            <div className="flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded-full text-xs font-bold shadow-md border-2 border-white -ml-2">
                              +{pitches.length - 5}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-500 text-sm">No pitches yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested for You Section */}
            <div className="mt-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 rounded-3xl border border-gray-200/50 overflow-hidden shadow-xl">
              <div className="p-8">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                          <span>Suggested for you</span>
                          <span className="text-blue-600">•</span>
                          <span className="text-lg text-blue-600 font-semibold">
                            Active {opportunity?.topicTags?.[0] || 'Related'} Stories
                          </span>
                        </h3>
                      </div>
                    </div>
                  </div>
                  <Link href="/opportunities">
                    <Button 
                      variant="outline" 
                      className="group bg-white/80 backdrop-blur-sm hover:bg-white border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md px-6 py-3"
                    >
                      <span className="font-semibold">View All</span>
                      <ChevronLeft className="h-4 w-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                  </Link>
                </div>

                {/* Opportunities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {relatedOpportunities.length > 0 ? (
                    relatedOpportunities.map((relatedOpp, index) => (
                      <Link 
                        key={relatedOpp.id} 
                        href={`/opportunities/${relatedOpp.id}`}
                        className="group block"
                      >
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 overflow-hidden hover:shadow-xl hover:border-blue-200/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                          {/* Card Header */}
                          <div className="p-6 pb-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                                  <span className="text-white text-xs font-bold">
                                    {(relatedOpp.publication?.name || relatedOpp.outlet || 'UK')[0]}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold text-gray-600">
                                  {relatedOpp.publication?.name || relatedOpp.outlet || 'Unknown Outlet'}
                                </span>
                              </div>
                              <Badge className={`text-xs font-bold px-3 py-1.5 shadow-sm border-0 ${
                                getTierDisplay(relatedOpp.tier) === 1 ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                                getTierDisplay(relatedOpp.tier) === 2 ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                                'bg-gradient-to-r from-green-500 to-green-600 text-white'
                              }`}>
                                Tier {getTierDisplay(relatedOpp.tier)}
                              </Badge>
                            </div>
                            
                            {/* Title */}
                            <h4 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                              {relatedOpp.title}
                            </h4>
                            
                            {/* Status and Time */}
                            <div className="flex items-center justify-between mb-4">
                              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                                relatedOpp.status === 'urgent' ? 'bg-red-50 text-red-600 border border-red-200' :
                                relatedOpp.status === 'trending' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                                'bg-green-50 text-green-600 border border-green-200'
                              }`}>
                                {relatedOpp.status === 'urgent' ? (
                                  <>
                                    <Clock className="h-4 w-4" />
                                    <span>Urgent</span>
                                  </>
                                ) : relatedOpp.status === 'trending' ? (
                                  <>
                                    <Flame className="h-4 w-4" />
                                    <span>Trending</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Open</span>
                                  </>
                                )}
                              </div>
                              <span className="text-gray-500 text-sm font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                {relatedOpp.deadline ? 
                                  `${Math.ceil((new Date(relatedOpp.deadline).getTime() - Date.now()) / (1000 * 60 * 60))}h left` :
                                  'Active'
                                }
                              </span>
                            </div>
                          </div>
                          
                          {/* Card Footer */}
                          <div className="px-6 pb-6">
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl border border-gray-100">
                              <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-bold text-green-600">
                                  ${relatedOpp.minimumBid || relatedOpp.currentPrice || 0}
                                </span>
                                {relatedOpp.increment && (
                                  <span className="text-gray-500 text-sm font-medium">
                                    +${relatedOpp.increment}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500 mb-1">Current Rate</div>
                                <div className="text-green-600 text-sm font-semibold flex items-center space-x-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>Live</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    // Enhanced fallback design
                    Array.from({ length: 3 }, (_, index) => (
                      <div 
                        key={`fallback-${index}`}
                        className="bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                            </div>
                            <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                          <div className="h-6 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
                          <div className="flex justify-between mb-4">
                            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                          <div className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Additional Info */}
                {relatedOpportunities.length > 0 && (
                  <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-center space-x-2 text-sm text-blue-700">
                      <Info className="h-4 w-4" />
                      <span className="font-medium">
                        Found {relatedOpportunities.length} related {relatedOpportunities.length === 1 ? 'opportunity' : 'opportunities'} in {opportunity?.topicTags?.[0] || 'your area'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="mt-12 text-center">
              <Link href="/opportunities">
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 transition-all duration-200 px-8 py-4 mx-auto"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="font-semibold text-lg">Back to Opportunities</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}