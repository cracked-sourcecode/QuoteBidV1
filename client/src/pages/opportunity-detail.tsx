import { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { ChevronLeft, Calendar, Clock, DollarSign, TrendingUp, Flame, ChevronUp, Info, Mic, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { mockOpportunity } from '@/mocks/opportunity';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ReferenceDot, Tooltip } from 'recharts';

export default function OpportunityDetail() {
  const { toast } = useToast();
  const [, params] = useRoute('/opportunities/:id');
  const opportunityId = params ? parseInt(params.id) : 0;
  const [isBriefMinimized, setIsBriefMinimized] = useState(false);
  const [pitchContent, setPitchContent] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'Daily' | 'Weekly'>('Daily');
  
  // Use the demo opportunity data for now
  const [opportunity] = useState({
    ...mockOpportunity,
    id: opportunityId,
    title: "Crypto Experts Needed For A Story on Agentic AI in Crypto",
    outlet: "Bloomberg",
    tier: 1,
    topicTags: ["Crypto", "Capital Markets"],
    summary: "Looking for Crypto Experts to give insight on the following:\n\n1. Is the Crypto Market good for AI?\n\n2. Will Crypto use Agentic AI?\n\n3. How does this help companies in the Crypto space?",
    basePrice: 199,
    currentPrice: 249,
    deadline: new Date("2025-05-24").toISOString(),
    postedAt: new Date("2025-04-30").toISOString()
  });

  const currentPrice = 249;
  const priceIncrease = 25;
  const belowListPercentage = 17;
  const maxPitchLength = 2000;
  const remainingChars = maxPitchLength - pitchContent.length;
  
  // Calculate if today is the deadline
  const isToday = format(new Date(opportunity.deadline), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Price chart data - with numeric x-axis for proper linear spacing
  const priceData = [
    { day: 1, price: 199, label: '1d' },
    { day: 2, price: 203, label: '2d' },
    { day: 3, price: 215, label: '3d' },
    { day: 4, price: 208, label: '4d' },
    { day: 5, price: 228, label: '5d' },
    { day: 6, price: 240, label: '6d' },
    { day: 7, price: 249, label: '7d' }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Main Content */}
      <div className="mx-auto px-4 py-4">
        {/* White Container Wrapper */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="p-6">
            {/* Publication Name */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                {/* TODO: Implement publication logo system - use actual logo assets instead of text */}
                <div className="flex items-center">
                  <h2 className="text-3xl font-semibold text-black tracking-tight">
                    {opportunity.outlet}
                  </h2>
                  {/* Future: <img src={`/logos/${opportunity.outlet.toLowerCase()}-logo.svg`} alt={opportunity.outlet} className="h-12" /> */}
                </div>
                <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md px-4 py-2 text-sm font-semibold">
                  Tier 1
                </Badge>
              </div>
            </div>

            {/* Opportunity Title */}
            <div className="mb-8">
              <h1 className="text-5xl font-medium text-black leading-tight tracking-tighter max-w-5xl">
                {opportunity.title}
              </h1>
            </div>

            {/* Topic Tags */}
            <div className="mb-10">
              <div className="flex items-center space-x-3">
                {opportunity.topicTags.map((tag, index) => (
                  <div 
                    key={tag} 
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
                    {format(new Date(opportunity.postedAt), 'MMM d, yyyy')}
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
                    <span className="text-sm font-medium text-green-700">$25 increase (last hour)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200/50">
                    <Flame className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">8 pitches (last hour)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-orange-50 px-4 py-2 rounded-xl border border-orange-200/50">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">18h remaining</span>
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
                    <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 px-4 py-2 font-semibold shadow-md">
                      Open
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                {!isBriefMinimized && (
                  <div className="mb-6">
                    <div className="bg-gradient-to-r from-white to-gray-50 border-l-4 border-blue-500 rounded-r-2xl shadow-inner overflow-hidden">
                      <div className="p-6">
                        <div className="text-gray-900 text-lg leading-relaxed">
                          <p className="font-semibold text-gray-800 mb-4 text-xl">
                            Looking for Crypto Experts to give insight on the following:
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-start space-x-4 p-3 bg-white/70 rounded-xl border border-gray-200/50 shadow-sm">
                              <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">1</span>
                              <span className="text-gray-700 font-medium pt-1">Is the Crypto Market good for AI?</span>
                            </div>
                            <div className="flex items-start space-x-4 p-3 bg-white/70 rounded-xl border border-gray-200/50 shadow-sm">
                              <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">2</span>
                              <span className="text-gray-700 font-medium pt-1">Will Crypto use Agentic AI?</span>
                            </div>
                            <div className="flex items-start space-x-4 p-3 bg-white/70 rounded-xl border border-gray-200/50 shadow-sm">
                              <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">3</span>
                              <span className="text-gray-700 font-medium pt-1">How does this help companies in the Crypto space?</span>
                            </div>
                          </div>
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
                            domain={[190, 260]}
                            ticks={[190, 210, 230, 250]}
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
                            x={7}
                            y={249}
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
                        <span className="text-green-600 font-bold text-lg">$199</span>
                        <span className="text-gray-500 text-sm">Low</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-500 font-bold text-lg">$259</span>
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
                      <div className="flex items-center space-x-1 text-green-600 text-lg font-semibold">
                        <TrendingUp className="h-5 w-5" />
                        <span>+${priceIncrease}</span>
                      </div>
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
                        <span>Secure Pitch at Current Market Rate</span>
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
                    Low Demand
                  </Badge>
                </div>

                {/* Competition Meter */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Demand Level</span>
                    <span className="text-sm font-bold text-orange-600">32% Competitive</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div 
                      className="h-3 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400 transition-all duration-1000 ease-out shadow-sm"
                      style={{ width: '32%' }}
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
                        <span className="font-bold text-2xl">12</span>
                      </div>
                      
                      {/* Info */}
                      <div>
                        <div className="text-lg font-bold text-gray-900">Experts Pitched</div>
                        <div className="text-green-600 text-sm font-semibold">↗ +3 today</div>
                        <div className="text-gray-500 text-sm">Driving current demand level</div>
                      </div>
                    </div>
                    
                    {/* Expert Avatars */}
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-10 h-10 bg-emerald-500 text-white rounded-full text-sm font-bold shadow-md border-2 border-white">
                        ET
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full text-sm font-bold shadow-md border-2 border-white -ml-2">
                        WC
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-purple-500 text-white rounded-full text-sm font-bold shadow-md border-2 border-white -ml-2">
                        WS
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-orange-500 text-white rounded-full text-sm font-bold shadow-md border-2 border-white -ml-2">
                        JP
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-red-500 text-white rounded-full text-sm font-bold shadow-md border-2 border-white -ml-2">
                        +8
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested for You Section */}
            <div className="mt-12 bg-white rounded-3xl border border-gray-200/50 overflow-hidden shadow-lg">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Suggested for you • Active {opportunity.topicTags[0]} Stories</h3>
                    <p className="text-gray-600 mt-1">Similar opportunities in your expertise area</p>
                  </div>
                  <Link href="/opportunities">
                    <Button variant="outline" className="flex items-center space-x-2 hover:bg-blue-50 border-blue-200 text-blue-600">
                      <span>View All</span>
                      <ChevronLeft className="h-4 w-4 rotate-180" />
                    </Button>
                  </Link>
                </div>

                {/* Suggested Opportunities Grid */}
                <div className="grid grid-cols-3 gap-6">
                  {/* Opportunity 1 */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-200/50 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">TechCrunch</span>
                        <Badge className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1">
                          Tier 1
                        </Badge>
                      </div>
                      
                      <h4 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                        AI Startups Disrupting Traditional Banking: Expert Analysis Needed
                      </h4>
                      
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-1 text-red-500 text-sm font-medium">
                          <Flame className="h-4 w-4" />
                          <span>Trending</span>
                        </div>
                        <span className="text-gray-500 text-sm">18h remaining</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-green-600">$299</span>
                          <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                            <TrendingUp className="h-4 w-4" />
                            <span>+$15</span>
                          </div>
                        </div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                          Pitch Now
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Opportunity 2 */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-200/50 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">Forbes</span>
                        <Badge className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1">
                          Tier 2
                        </Badge>
                      </div>
                      
                      <h4 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                        DeFi Protocol Security: Risk Assessment for New Regulations
                      </h4>
                      
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-1 text-orange-500 text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          <span>Urgent</span>
                        </div>
                        <span className="text-gray-500 text-sm">32h remaining</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-green-600">$199</span>
                          <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                            <TrendingUp className="h-4 w-4" />
                            <span>+$15</span>
                          </div>
                        </div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                          Pitch Now
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Opportunity 3 */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-200/50 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-500">Wall Street Journal</span>
                        <Badge className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1">
                          Tier 1
                        </Badge>
                      </div>
                      
                      <h4 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                        Corporate Adoption of Blockchain Technology in 2025
                      </h4>
                      
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-1 text-green-500 text-sm font-medium">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Flash Sale</span>
                        </div>
                        <span className="text-gray-500 text-sm">24h remaining</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-green-600">$399</span>
                          <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                            <TrendingUp className="h-4 w-4" />
                            <span>+$15</span>
                          </div>
                        </div>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                          Pitch Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
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