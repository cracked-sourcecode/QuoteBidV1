import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  Target,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Award,
  Clock,
  CheckCircle,
  TrendingDown,
  Eye,
  Calculator,
  MousePointer2,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6B7280"];

// Dynamic Tier Navigation Component
function PublicationPricingByTier({ organizedPublicationData }: { organizedPublicationData: any[] }) {
  const [selectedTier, setSelectedTier] = useState('all');
  
  const availableTiers = organizedPublicationData.map(tier => tier.tier);
  const selectedTierData = selectedTier === 'all' ? organizedPublicationData : organizedPublicationData.filter(tier => tier.tier === selectedTier);
  
  return (
    <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
              Publication Pricing Analysis by Tier
            </CardTitle>
            <CardDescription className="text-slate-400">Market rates organized by publication tier and individual outlets</CardDescription>
          </div>
          
          {/* Tier Navigation Dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">Filter by tier:</span>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-48 bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white hover:bg-slate-700">
                  All Tiers
                </SelectItem>
                {availableTiers.map((tier) => (
                  <SelectItem key={tier} value={tier} className="text-white hover:bg-slate-700">
                    {tier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {selectedTierData.map((tierGroup: any, tierIndex: number) => (
            <div key={tierIndex} className="space-y-4">
              {/* Tier Header */}
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-lg rounded-xl border border-purple-500/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{tierGroup.tier}</h3>
                      <p className="text-purple-200 text-sm">{tierGroup.publications.length} publications</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-xs text-purple-300 font-medium">Tier Average</p>
                      <p className="text-xl font-bold text-white">${tierGroup.tierAvg}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-purple-300 font-medium">Total Volume</p>
                      <p className="text-xl font-bold text-white">{tierGroup.tierVolume}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Publications in Tier */}
              {tierGroup.publications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tierGroup.publications.map((pub: any, pubIndex: number) => (
                    <div key={pubIndex} className="bg-slate-700/30 rounded-lg p-4 border border-white/10 hover:border-purple-500/30 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white text-sm">{pub.name}</h4>
                        <Badge className={`text-xs ${pub.isNew ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                          {pub.isNew ? 'New' : `$${pub.avgPrice}`}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400">Range</p>
                          <p className="text-slate-200">
                            {pub.isNew ? 'No data yet' : `$${pub.minPrice} - $${pub.maxPrice}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Volume</p>
                          <p className="text-slate-200">{pub.volume} deals</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Total Value</p>
                          <p className="text-slate-200">
                            {pub.isNew ? 'No data yet' : `$${pub.totalValue.toLocaleString()}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Conversion</p>
                          <p className="text-slate-200">
                            {pub.isNew ? 'No data yet' : `${pub.conversionRate.toFixed(1)}%`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Empty State for Tier with No Publications
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-700/20 rounded-xl border-2 border-dashed border-slate-600">
                  <div className="w-16 h-16 bg-slate-600/30 rounded-full flex items-center justify-center mb-4">
                    <Target className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-300 mb-2">Awaiting Outlets</h3>
                  <p className="text-slate-400 text-center text-sm max-w-md">
                    This tier is ready for publications to be added. Once outlets are assigned to {tierGroup.tier}, they'll appear here with pricing data.
                  </p>
                  <Badge className="mt-3 bg-slate-600/30 text-slate-300 border-slate-500/30">
                    Coming Soon
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch all data sources
  const { data: userActivity, isLoading: userActivityLoading } = useQuery({
    queryKey: ['/api/admin/user-activity'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/user-activity');
      if (!res.ok) throw new Error('Failed to fetch user activity');
      return res.json();
    },
  });
  
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });
  
  const { data: opportunitiesWithPitches, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['/api/admin/opportunities-with-pitches'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/opportunities-with-pitches');
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      return res.json();
    },
  });
  
  const { data: pitches, isLoading: pitchesLoading } = useQuery({
    queryKey: ['/api/admin/pitches'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/pitches');
      if (!res.ok) throw new Error('Failed to fetch pitches');
      return res.json();
    },
  });

  const { data: publications, isLoading: publicationsLoading } = useQuery({
    queryKey: ['/api/publications'],
    queryFn: async () => {
      const res = await apiFetch('/api/publications');
      if (!res.ok) throw new Error('Failed to fetch publications');
      return res.json();
    },
  });

  // Fetch detailed user events for activity tracking - ALL HISTORICAL DATA
  const { data: userEvents, isLoading: userEventsLoading, error: userEventsError } = useQuery({
    queryKey: ['/api/admin/user-events-all'],
    queryFn: async () => {
      console.log('🔍 Fetching user events from API...');
      const res = await apiFetch('/api/admin/user-events?limit=500&timeRange=all');
      console.log('📡 API Response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ API Error:', res.status, errorText);
        throw new Error(`Failed to fetch user events: ${res.status} - ${errorText}`);
      }
      const data = await res.json();
      console.log('✅ User events data received:', data);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time data
  });

  const isLoading = userActivityLoading || usersLoading || opportunitiesLoading || pitchesLoading || publicationsLoading || userEventsLoading;

  // Process and calculate analytics data
  const analytics = useMemo(() => {
    if (!users || !pitches || !opportunitiesWithPitches || !publications) return null;

    // Basic stats
    const totalUsers = users.length;
    const totalOpportunities = opportunitiesWithPitches.length;
    const totalPitches = pitches.length;
    const totalPublications = publications.length;
    
    // Pitch analytics - Individual status counts (5 statuses)
    const pendingPitches = pitches.filter((p: any) => 
      p.status === 'pending'
    ).length;
    const sentPitches = pitches.filter((p: any) => 
      p.status === 'sent_to_reporter' || p.status === 'sent'
    ).length;
    const interestedPitches = pitches.filter((p: any) => 
      p.status === 'interested'
    ).length;
    const notInterestedPitches = pitches.filter((p: any) => 
      p.status === 'not_interested'
    ).length;
    const successfulPitches = pitches.filter((p: any) => 
      p.status === 'successful'
    ).length;
    
    // Financial analytics
    const bidAmounts = pitches.map((p: any) => p.bidAmount || 0).filter((bid: number) => bid > 0);
    const totalRevenue = pitches
      .filter((p: any) => p.status === 'successful')
      .reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0);
    const averageBid = bidAmounts.length > 0 ? bidAmounts.reduce((sum: number, bid: number) => sum + bid, 0) / bidAmounts.length : 0;
    const highestBid = Math.max(...bidAmounts, 0);
    const lowestBid = Math.min(...bidAmounts.filter((bid: number) => bid > 0), 0) || 0;
    
    // Market Transparency Data - Core Value Proposition
    const successfulPitchesWithBids = pitches.filter((p: any) => 
      p.status === 'successful' && p.bidAmount > 0
    );
    
    // Average pricing by publication - SHOW ALL PUBLICATIONS
    const publicationPricing = publications.map((pub: any) => {
      const pubPitches = pitches.filter((p: any) => 
        p.opportunity?.publicationId === pub.id && 
        p.status === 'successful' && 
        p.bidAmount > 0
      );
      
      // Get tier from opportunities
      const pubOpportunities = opportunitiesWithPitches.filter((opp: any) => opp.publicationId === pub.id);
      const tier = pubOpportunities[0]?.tier || 'Unspecified';
      
      // Show publication even if no successful pitches yet
      if (pubPitches.length === 0) {
        return {
          name: pub.name,
          tier,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          volume: 0,
          totalValue: 0,
          demandScore: 0,
          conversionRate: 0,
          isNew: true // Flag for new publications
        };
      }
      
      const avgPrice = pubPitches.reduce((sum: number, p: any) => sum + p.bidAmount, 0) / pubPitches.length;
      const minPrice = Math.min(...pubPitches.map((p: any) => p.bidAmount));
      const maxPrice = Math.max(...pubPitches.map((p: any) => p.bidAmount));
      const totalVolume = pubPitches.length;
      
      return {
        name: pub.name,
        tier,
        avgPrice: Math.round(avgPrice),
        minPrice,
        maxPrice,
        volume: totalVolume,
        totalValue: pubPitches.reduce((sum: number, p: any) => sum + p.bidAmount, 0),
        demandScore: totalVolume / Math.max(1, pubOpportunities.length) * 100,
        conversionRate: pubPitches.length / Math.max(1, pubOpportunities.flatMap((opp: any) => opp.pitches || []).length) * 100,
        isNew: false
      };
    }).sort((a: any, b: any) => {
      // Sort: established publications first (by avgPrice), then new ones
      if (a.isNew && !b.isNew) return 1;
      if (!a.isNew && b.isNew) return -1;
      return b.avgPrice - a.avgPrice;
    });

    // Group ALL publications by tier - including new ones with no data
    const publicationsByTier = publicationPricing.reduce((acc: any, pub: any) => {
      const tier = pub.tier || 'Unspecified';
      if (!acc[tier]) {
        acc[tier] = [];
      }
      acc[tier].push(pub);
      return acc;
    }, {});

    // Get ALL tiers - combine standard tiers + any custom ones from API
    const tiersFromDB = Array.from(new Set(
      opportunitiesWithPitches.map((opp: any) => opp.tier).filter(Boolean)
    )) as string[];
    
    const standardTiers = ['Tier 1', 'Tier 2', 'Tier 3'];
    const allTiersInDB = Array.from(new Set([...standardTiers, ...tiersFromDB])).sort();
    
    // Create organized data for ALL tiers that exist
    const organizedPublicationData = allTiersInDB.map((tier: string) => ({
      tier,
      publications: publicationsByTier[tier] || [],
      tierAvg: publicationsByTier[tier] && publicationsByTier[tier].length > 0 ? 
        Math.round(publicationsByTier[tier].reduce((sum: number, pub: any) => sum + pub.avgPrice, 0) / publicationsByTier[tier].length) : 0,
      tierVolume: publicationsByTier[tier] ? 
        publicationsByTier[tier].reduce((sum: number, pub: any) => sum + pub.volume, 0) : 0
    })); // Show ALL tiers, even empty ones
    
    // Average pricing by tier
    const tierPricing = ['Tier 1', 'Tier 2', 'Tier 3', 'Premium'].map(tier => {
      const tierPitches = pitches.filter((p: any) => 
        p.opportunity?.tier === tier && 
        p.status === 'successful' && 
        p.bidAmount > 0
      );
      
      if (tierPitches.length === 0) return { tier, avgPrice: 0, volume: 0, range: [0, 0] };
      
      const prices = tierPitches.map((p: any) => p.bidAmount);
      const avgPrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
      
      return {
        tier,
        avgPrice: Math.round(avgPrice),
        volume: tierPitches.length,
        range: [Math.min(...prices), Math.max(...prices)],
        totalValue: tierPitches.reduce((sum: number, p: any) => sum + p.bidAmount, 0),
        medianPrice: Math.round(prices.sort((a: number, b: number) => a - b)[Math.floor(prices.length / 2)] || 0)
      };
    }).filter(data => data.volume > 0);
    
    // Additional market insights
    const marketInsights = {
      totalDeals: successfulPitchesWithBids.length,
      avgDealCycle: Math.round(Math.random() * 15 + 7), // Placeholder - would calculate from actual data
      topPerformingTier: tierPricing.reduce((prev, current) => (prev.volume > current.volume) ? prev : current)?.tier || 'N/A',
      priceGrowthRate: Math.round((Math.random() - 0.5) * 20), // Placeholder - would calculate from historical data
      marketActivity: Math.round(totalPitches / 30), // Pitches per day
      competitionIndex: Math.round((totalPitches / totalOpportunities) * 100) / 100
    };
    
    // Price distribution analysis
    const priceRanges = [
      { range: '$0-100', min: 0, max: 100 },
      { range: '$101-250', min: 101, max: 250 },
      { range: '$251-500', min: 251, max: 500 },
      { range: '$501-1000', min: 501, max: 1000 },
      { range: '$1000+', min: 1001, max: Infinity }
    ].map(range => ({
      ...range,
      count: successfulPitchesWithBids.filter((p: any) => 
        p.bidAmount >= range.min && p.bidAmount <= range.max
      ).length
    }));
    
    // Conversion rates
    const userToPitchRate = totalUsers > 0 ? (totalPitches / totalUsers) * 100 : 0;
    const pitchSuccessRate = totalPitches > 0 ? (successfulPitches / totalPitches) * 100 : 0;
    const opportunityFillRate = totalOpportunities > 0 ? (successfulPitches / totalOpportunities) * 100 : 0;
    
    // Industry distribution from users
    const industryCount: Record<string, number> = {};
    users.forEach((user: any) => {
      const industry = user.industry || 'Other';
      industryCount[industry] = (industryCount[industry] || 0) + 1;
    });
    
    const industryData = Object.entries(industryCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    
    // Publication performance with market insights
    const publicationPerformance = publications.map((pub: any) => {
      const pubOpportunities = opportunitiesWithPitches.filter((opp: any) => opp.publicationId === pub.id);
      const pubPitches = pubOpportunities.flatMap((opp: any) => opp.pitches || []);
      const pubSuccessful = pubPitches.filter((p: any) => 
        p.status === 'successful'
      );
      
      return {
        name: pub.name.length > 15 ? pub.name.substring(0, 15) + '...' : pub.name,
        opportunities: pubOpportunities.length,
        pitches: pubPitches.length,
        successful: pubSuccessful.length,
        successRate: pubPitches.length > 0 ? (pubSuccessful.length / pubPitches.length) * 100 : 0,
        avgBid: pubPitches.length > 0 ? 
          pubPitches.filter((p: any) => p.bidAmount > 0).reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0) / 
          pubPitches.filter((p: any) => p.bidAmount > 0).length : 0,
        marketShare: pubSuccessful.length > 0 ? (pubSuccessful.length / successfulPitches) * 100 : 0
      };
    }).filter((pub: any) => pub.opportunities > 0);
    
    // Time-based analytics (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentPitches = pitches.filter((p: any) => 
      p.createdAt && new Date(p.createdAt) >= thirtyDaysAgo
    );
    
    const dailyActivity = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayPitches = recentPitches.filter((p: any) => 
        p.createdAt && format(new Date(p.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      const dayOpportunities = opportunitiesWithPitches.filter((opp: any) => 
        opp.createdAt && format(new Date(opp.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      const daySuccessful = dayPitches.filter((p: any) => 
        p.status === 'successful'
      );
      const avgPrice = daySuccessful.length > 0 ? 
        daySuccessful.reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0) / daySuccessful.length : 0;
      
      dailyActivity.push({
        date: format(date, 'MMM dd'),
        pitches: dayPitches.length,
        opportunities: dayOpportunities.length,
        revenue: daySuccessful.reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0),
        avgPrice: Math.round(avgPrice)
      });
    }
    
    // Debug: Log actual pitch statuses to understand the data
    const pitchStatuses = Array.from(new Set(pitches.map((p: any) => p.status)));
    const statusCounts = pitchStatuses.reduce((acc: any, status: any) => {
      acc[status] = pitches.filter((p: any) => p.status === status).length;
      return acc;
    }, {});
    
    console.log('🔍 ALL PITCH STATUSES in database:', pitchStatuses);
    console.log('📊 DETAILED status counts:', statusCounts);
    console.log('📈 NEW 5-Status Distribution:', {
      pending: pendingPitches,
      sent: sentPitches,
      interested: interestedPitches,
      notInterested: notInterestedPitches,
      successful: successfulPitches,
      total: totalPitches
    });
    
    // Pitch status distribution - show all 5 individual statuses
    const allStatusData = [
      { name: 'Pending', value: pendingPitches, color: '#F59E0B' },
      { name: 'Sent to Reporter', value: sentPitches, color: '#3B82F6' },
      { name: 'Interested', value: interestedPitches, color: '#8B5CF6' },
      { name: 'Not Interested', value: notInterestedPitches, color: '#EF4444' },
      { name: 'Successful', value: successfulPitches, color: '#10B981' },
    ];
    const statusData = allStatusData; // Show all 5 statuses in pie chart, even if zero
    
    // Tier distribution
    const tierCount: Record<string, number> = {};
    opportunitiesWithPitches.forEach((opp: any) => {
      const tier = opp.tier || 'Unspecified';
      tierCount[tier] = (tierCount[tier] || 0) + 1;
    });
    
    const tierData = Object.entries(tierCount).map(([name, value]) => ({ name, value }));
    
    return {
      totalUsers,
      totalOpportunities,
      totalPitches,
      totalPublications,
      pendingPitches,
      sentPitches,
      interestedPitches,
      notInterestedPitches,
      successfulPitches,
      totalRevenue,
      averageBid,
      highestBid,
      lowestBid,
      userToPitchRate,
      pitchSuccessRate,
      opportunityFillRate,
      industryData,
      publicationPerformance,
      dailyActivity,
      allStatusData,
      statusData,
      tierData,
      activeToday: userActivity?.activeToday || 0,
      activeThisWeek: userActivity?.activeThisWeek || 0,
      // Market transparency data
      publicationPricing,
      tierPricing,
      priceRanges,
      marketMetrics: {
        totalMarketValue: totalRevenue,
        avgDealSize: averageBid,
        priceVolatility: bidAmounts.length > 1 ? 
          Math.sqrt(bidAmounts.reduce((sum: number, bid: number) => sum + Math.pow(bid - averageBid, 2), 0) / bidAmounts.length) : 0,
        marketConcentration: publicationPricing.slice(0, 5).reduce((sum: number, pub: any) => sum + (pub.totalValue || 0), 0) / totalRevenue * 100
      },
      marketInsights,
      organizedPublicationData
    };
  }, [users, pitches, opportunitiesWithPitches, publications, userActivity]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-300">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
        <div>
              <h1 className="text-3xl font-bold flex items-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">Analytics Dashboard</span>
          </h1>
              <p className="text-slate-300 text-lg">Comprehensive platform performance insights</p>
        </div>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
          Real-time Data
        </Badge>
          </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="bg-slate-800/30 backdrop-blur-lg rounded-2xl border border-white/20 mb-8">
            <TabsList className="bg-transparent border-b border-white/10 grid w-full grid-cols-6 rounded-none h-16 p-1">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-300 hover:text-slate-100 transition-all duration-200 rounded-lg mx-1"
              >
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
              <TabsTrigger 
                value="market" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-300 hover:text-slate-100 transition-all duration-200 rounded-lg mx-1"
              >
                <Calculator className="h-4 w-4" />
                Market Data
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-300 hover:text-slate-100 transition-all duration-200 rounded-lg mx-1"
              >
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-300 hover:text-slate-100 transition-all duration-200 rounded-lg mx-1"
              >
            <MousePointer2 className="h-4 w-4" />
            User Activity
          </TabsTrigger>
              <TabsTrigger 
                value="opportunities" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-300 hover:text-slate-100 transition-all duration-200 rounded-lg mx-1"
              >
            <Target className="h-4 w-4" />
            Opportunities
          </TabsTrigger>
              <TabsTrigger 
                value="financial" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-300 hover:text-slate-100 transition-all duration-200 rounded-lg mx-1"
              >
            <DollarSign className="h-4 w-4" />
            Financial
          </TabsTrigger>
        </TabsList>
          </div>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Total Users</CardTitle>
                    <Users className="h-5 w-5 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-white">{analytics.totalUsers}</div>
                  <p className="text-sm text-slate-400 mt-1">
                  {analytics.activeToday} active today
                </p>
              </CardContent>
            </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Total Pitches</CardTitle>
                    <FileText className="h-5 w-5 text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-white">{analytics.totalPitches}</div>
                  <p className="text-sm text-slate-400 mt-1">
                  {analytics.pitchSuccessRate.toFixed(1)}% success rate
                </p>
              </CardContent>
            </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Opportunities</CardTitle>
                    <Target className="h-5 w-5 text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-white">{analytics.totalOpportunities}</div>
                  <p className="text-sm text-slate-400 mt-1">
                  {analytics.opportunityFillRate.toFixed(1)}% fill rate
                </p>
              </CardContent>
            </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Total Revenue</CardTitle>
                    <DollarSign className="h-5 w-5 text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-white">${analytics.totalRevenue.toFixed(0)}</div>
                  <p className="text-sm text-slate-400 mt-1">
                  ${analytics.averageBid.toFixed(0)} avg bid
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Chart */}
            <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
            <CardHeader>
                <CardTitle className="text-white">Platform Activity (Last 30 Days)</CardTitle>
                <CardDescription className="text-slate-400">Daily pitches, opportunities, and revenue</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyActivity}>
                  <defs>
                    <linearGradient id="colorPitches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorOpportunities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="pitches" stackId="1" stroke="#3B82F6" fillOpacity={1} fill="url(#colorPitches)" name="Pitches" />
                  <Area type="monotone" dataKey="opportunities" stackId="1" stroke="#10B981" fillOpacity={1} fill="url(#colorOpportunities)" name="Opportunities" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

            {/* Status Distribution - Vertical Stack */}
            <div className="space-y-6">
              {/* Pie Chart */}
              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <PieChartIcon className="h-5 w-5 mr-2 text-blue-400" />
                  Pitch Status Distribution
                </CardTitle>
                  <CardDescription className="text-slate-400">Current status of all pitches</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusData}
                      cx="50%"
                      cy="50%"
                        outerRadius={140}
                        innerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                        stroke="#1e293b"
                        strokeWidth={2}
                    >
                      {analytics.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '2px solid #374151',
                          borderRadius: '12px',
                          color: '#1f2937',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      formatter={(value, name) => [
                        `${value} pitches (${((value as number / analytics.totalPitches) * 100).toFixed(1)}%)`,
                        name
                      ]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                        wrapperStyle={{ color: 'white' }}
                      formatter={(value, entry) => (
                          <span style={{ color: 'white', fontWeight: 'bold' }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

              {/* Status Summary Cards - Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                <Card className="bg-slate-800/50 backdrop-blur-lg border border-green-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-white">Successful Pitches</CardTitle>
                      <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-white mb-2">{analytics.successfulPitches}</div>
                    <p className="text-sm text-slate-300">
                    {analytics.pitchSuccessRate.toFixed(1)}% of all pitches
                  </p>
                    <div className="mt-3 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                      <p className="text-xs text-white font-medium">
                      Revenue Generated: ${analytics.totalRevenue.toFixed(0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

                <Card className="bg-slate-800/50 backdrop-blur-lg border border-yellow-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-white">Pending Pitches</CardTitle>
                      <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-white mb-2">{analytics.pendingPitches}</div>
                    <p className="text-sm text-slate-300">
                    {analytics.totalPitches > 0 ? ((analytics.pendingPitches / analytics.totalPitches) * 100).toFixed(1) : 0}% of all pitches
                  </p>
                    <div className="mt-3 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                      <p className="text-xs text-white font-medium">
                      Awaiting response from publications
                    </p>
                  </div>
                </CardContent>
              </Card>

                <Card className="bg-slate-800/50 backdrop-blur-lg border border-blue-500/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-white">Sent to Reporter</CardTitle>
                      <Clock className="h-6 w-6 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-white mb-2">{analytics.sentPitches}</div>
                    <p className="text-sm text-slate-300">
                      {analytics.totalPitches > 0 ? ((analytics.sentPitches / analytics.totalPitches) * 100).toFixed(1) : 0}% of all pitches
                  </p>
                    <div className="mt-3 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <p className="text-xs text-white font-medium">
                        Delivered to journalists for review
                    </p>
                  </div>
                </CardContent>
              </Card>

                <Card className="bg-slate-800/50 backdrop-blur-lg border border-purple-500/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-white">Interested Pitches</CardTitle>
                      <TrendingUp className="h-6 w-6 text-purple-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-white mb-2">{analytics.interestedPitches}</div>
                    <p className="text-sm text-slate-300">
                      {analytics.totalPitches > 0 ? ((analytics.interestedPitches / analytics.totalPitches) * 100).toFixed(1) : 0}% of all pitches
                    </p>
                    <div className="mt-3 p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
                      <p className="text-xs text-white font-medium">
                        Journalists have shown interest - awaiting next steps
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 backdrop-blur-lg border border-red-500/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-white">Not Interested Pitches</CardTitle>
                      <Zap className="h-6 w-6 text-red-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-white mb-2">{analytics.notInterestedPitches}</div>
                    <p className="text-sm text-slate-300">
                      {analytics.totalPitches > 0 ? ((analytics.notInterestedPitches / analytics.totalPitches) * 100).toFixed(1) : 0}% of all pitches
                    </p>
                    <div className="mt-3 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                      <p className="text-xs text-white font-medium">
                        {analytics.notInterestedPitches === 0 ? 'No rejections yet - great success rate!' : 'Learning opportunities for improvement'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
            </div>
          </div>
        </TabsContent>
          
          <TabsContent value="market" className="space-y-6">
            {/* Market Transparency Header */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 backdrop-blur-lg rounded-2xl border border-amber-500/30 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Market Transparency Data</h2>
                  <p className="text-amber-200 text-sm">Real market pricing for media coverage - bringing transparency to PR</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-300 font-medium">Market Value</p>
                  <p className="text-lg font-bold text-white">${analytics.marketMetrics.totalMarketValue.toFixed(0)}</p>
                </div>
                <div className="bg-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-300 font-medium">Avg Deal Size</p>
                  <p className="text-lg font-bold text-white">${analytics.marketMetrics.avgDealSize.toFixed(0)}</p>
                </div>
                <div className="bg-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-300 font-medium">Total Deals</p>
                  <p className="text-lg font-bold text-white">{analytics.marketInsights.totalDeals}</p>
                </div>
                <div className="bg-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-300 font-medium">Daily Activity</p>
                  <p className="text-lg font-bold text-white">{analytics.marketInsights.marketActivity}</p>
                </div>
                <div className="bg-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-300 font-medium">Competition</p>
                  <p className="text-lg font-bold text-white">{analytics.marketInsights.competitionIndex}x</p>
                </div>
                <div className="bg-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-300 font-medium">Top Tier</p>
                  <p className="text-lg font-bold text-white">{analytics.marketInsights.topPerformingTier}</p>
                </div>
              </div>
            </div>

            {/* Publication Pricing Analysis - Dynamic Tier Navigation */}
            <PublicationPricingByTier organizedPublicationData={analytics.organizedPublicationData} />

            {/* Tier Pricing Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Pricing by Tier</CardTitle>
                  <CardDescription className="text-slate-400">Average costs across publication tiers</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.tierPricing}>
                      <XAxis dataKey="tier" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, 'Average Price']} />
                      <Bar dataKey="avgPrice" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Price Distribution</CardTitle>
                  <CardDescription className="text-slate-400">Market distribution across price ranges</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.priceRanges}>
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} deals`, 'Count']} />
                      <Bar dataKey="count" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Tier Breakdown */}
            <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Comprehensive Tier Analysis</CardTitle>
                <CardDescription className="text-slate-400">Complete pricing data by publication tier with market insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analytics.tierPricing.map((tier: any, index: number) => (
                    <div key={index} className="bg-slate-700/30 rounded-lg p-4 border border-white/10 hover:border-amber-500/30 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white">{tier.tier}</h4>
                        <Target className="h-4 w-4 text-purple-400" />
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Avg Price</span>
                          <span className="text-white font-semibold">${tier.avgPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Median Price</span>
                          <span className="text-white font-semibold">${tier.medianPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Volume</span>
                          <span className="text-slate-300">{tier.volume}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Range</span>
                          <span className="text-slate-300">${tier.range[0]} - ${tier.range[1]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Value</span>
                          <span className="text-slate-300">${tier.totalValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Market Share</span>
                          <span className="text-slate-300">{((tier.volume / analytics.successfulPitches) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Market Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Calculator className="h-5 w-5 mr-2 text-blue-400" />
                    Market Intelligence
                  </CardTitle>
                  <CardDescription className="text-slate-400">Key market performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-400 font-medium mb-1">Price Volatility</p>
                      <p className="text-lg font-bold text-white">${analytics.marketMetrics.priceVolatility.toFixed(0)}</p>
                      <p className="text-xs text-slate-500">Standard deviation</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-400 font-medium mb-1">Market Concentration</p>
                      <p className="text-lg font-bold text-white">{analytics.marketMetrics.marketConcentration.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">Top 5 publications</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-400 font-medium mb-1">Competition Index</p>
                      <p className="text-lg font-bold text-white">{analytics.marketInsights.competitionIndex}x</p>
                      <p className="text-xs text-slate-500">Pitches per opportunity</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-400 font-medium mb-1">Success Rate</p>
                      <p className="text-lg font-bold text-white">{analytics.pitchSuccessRate.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">Platform average</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Eye className="h-5 w-5 mr-2 text-green-400" />
                    Pricing Transparency
                  </CardTitle>
                  <CardDescription className="text-slate-400">Market rate insights for informed decisions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-lg p-4 border border-green-500/30">
                      <h4 className="font-semibold text-white mb-2">Premium Insight</h4>
                      <p className="text-sm text-green-200 mb-3">
                        {analytics.marketInsights.topPerformingTier} publications show highest activity with ${
                          analytics.tierPricing.find((t: any) => t.tier === analytics.marketInsights.topPerformingTier)?.avgPrice || 'N/A'
                        } average rates.
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-green-300">Highest Tier Avg</p>
                          <p className="text-white font-semibold">${Math.max(...analytics.tierPricing.map((t: any) => t.avgPrice))}</p>
                        </div>
                        <div>
                          <p className="text-green-300">Market Entry Point</p>
                          <p className="text-white font-semibold">${Math.min(...analytics.tierPricing.map((t: any) => t.avgPrice))}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price Trends Chart */}
            <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
                  Daily Average Pricing Trends
                </CardTitle>
                <CardDescription className="text-slate-400">Market pricing evolution over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.dailyActivity}>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value) => [`$${value}`, 'Average Price']} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgPrice" 
                      stroke="#F59E0B" 
                      strokeWidth={3}
                      dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        
        <TabsContent value="users" className="space-y-6">
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center text-white">
                    <Users className="h-5 w-5 mr-2 text-blue-400" />
                  User Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                      <span className="text-sm text-slate-400">User to Pitch Ratio</span>
                      <span className="font-semibold text-white">{analytics.userToPitchRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Active This Week</span>
                      <span className="font-semibold text-white">{analytics.activeThisWeek}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Active Today</span>
                      <span className="font-semibold text-white">{analytics.activeToday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center text-white">
                    <Activity className="h-5 w-5 mr-2 text-green-400" />
                  Activity Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Avg Pitches/User</span>
                      <span className="font-semibold text-white">{(analytics.totalPitches / analytics.totalUsers).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Success Rate</span>
                      <span className="font-semibold text-white">{analytics.pitchSuccessRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Total Publications</span>
                      <span className="font-semibold text-white">{analytics.totalPublications}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center text-white">
                    <Award className="h-5 w-5 mr-2 text-amber-400" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Highest Bid</span>
                      <span className="font-semibold text-white">${analytics.highestBid}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Successful Pitches</span>
                      <span className="font-semibold text-white">{analytics.successfulPitches}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Total Revenue</span>
                      <span className="font-semibold text-white">${analytics.totalRevenue.toFixed(0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Industry Distribution */}
            <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
            <CardHeader>
                <CardTitle className="text-white">User Industry Distribution</CardTitle>
                <CardDescription className="text-slate-400">Breakdown of user industries on the platform</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.industryData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="opportunities" className="space-y-6">
          {/* Publication Performance */}
            <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
            <CardHeader>
                <CardTitle className="text-white">Publication Performance</CardTitle>
                <CardDescription className="text-slate-400">Opportunities, pitches, and success rates by publication</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.publicationPerformance}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="opportunities" fill="#3B82F6" name="Opportunities" />
                  <Bar dataKey="pitches" fill="#10B981" name="Pitches" />
                  <Bar dataKey="successful" fill="#F59E0B" name="Successful" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Opportunity Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.publicationPerformance.slice(0, 4).map((pub: any, index: number) => (
                <Card key={index} className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white">{pub.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Opportunities</span>
                        <span className="font-semibold text-white">{pub.opportunities}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Success Rate</span>
                        <span className="font-semibold text-white">{pub.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Avg Bid</span>
                        <span className="font-semibold text-white">${pub.avgBid.toFixed(0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Opportunity Tiers Distribution */}
            <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
            <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-purple-400" />
                  Opportunity Tiers Distribution
                </CardTitle>
                <CardDescription className="text-slate-400">Distribution by tier level across all opportunities</CardDescription>
            </CardHeader>
              <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.tierData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                      formatter={(value, name) => [
                        `${value} opportunities (${((value as number / analytics.totalOpportunities) * 100).toFixed(1)}%)`,
                        'Count'
                      ]}
                      labelStyle={{ color: '#f1f5f9' }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#8B5CF6" 
                      radius={[4, 4, 0, 0]}
                      stroke="#9333ea"
                      strokeWidth={1}
                    />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financial" className="space-y-6">
          {/* Revenue Chart */}
            <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
            <CardHeader>
                <CardTitle className="text-white">Revenue Trends (Last 30 Days)</CardTitle>
                <CardDescription className="text-slate-400">Daily revenue from successful pitches</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyActivity}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Total Revenue</CardTitle>
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-white">${analytics.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-slate-400 mt-1">From {analytics.successfulPitches} successful pitches</p>
              </CardContent>
            </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Average Bid</CardTitle>
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-white">${analytics.averageBid.toFixed(2)}</div>
                  <p className="text-xs text-slate-400 mt-1">Across all pitches</p>
              </CardContent>
            </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Highest Bid</CardTitle>
                    <Award className="h-5 w-5 text-purple-400" />
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-white">${analytics.highestBid}</div>
                  <p className="text-xs text-slate-400 mt-1">Record high</p>
              </CardContent>
            </Card>

              <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">Revenue per User</CardTitle>
                    <Users className="h-5 w-5 text-amber-400" />
                  </div>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-white">${(analytics.totalRevenue / analytics.totalUsers).toFixed(2)}</div>
                  <p className="text-xs text-slate-400 mt-1">Average per user</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {/* User Activity Header */}
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-600/20 backdrop-blur-lg rounded-2xl border border-purple-500/30 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <MousePointer2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">User Activity Tracking</h2>
                <p className="text-purple-200 text-sm">Real-time monitoring of user clicks and interactions</p>
              </div>
            </div>
            
            {/* Activity Summary */}
            {userEvents && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <p className="text-xs text-purple-300 font-medium mb-1">Total Events</p>
                  <p className="text-2xl font-bold text-white">{userEvents.summary?.totalEvents || 0}</p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <p className="text-xs text-purple-300 font-medium mb-1">Unique Users</p>
                  <p className="text-2xl font-bold text-white">{userEvents.summary?.uniqueUsers || 0}</p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <p className="text-xs text-purple-300 font-medium mb-1">Opportunities Clicked</p>
                  <p className="text-2xl font-bold text-white">{userEvents.summary?.uniqueOpportunities || 0}</p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <p className="text-xs text-purple-300 font-medium mb-1">Time Range</p>
                  <p className="text-2xl font-bold text-white">{userEvents.summary?.timeRange === 'all' ? 'All Time' : (userEvents.summary?.timeRange || 'All Time')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Event Types Breakdown */}
          {userEvents?.summary?.eventTypes && (
            <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-400" />
                  Event Types Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(userEvents.summary.eventTypes).map(([type, count]) => (
                    <div key={type} className="bg-slate-700/30 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 capitalize">{type.replace('_', ' ')}</span>
                        <span className="text-white font-bold">{count as number}</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, ((count as number) / (userEvents.summary?.totalEvents || 1)) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed User Activity Log */}
          <Card className="bg-slate-800/30 backdrop-blur-lg border border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-400" />
                Recent User Activity
              </CardTitle>
              <CardDescription className="text-slate-400">
                Complete historical tracking of all user clicks and interactions (showing last 500 events)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userEventsError ? (
                <div className="text-center py-8">
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                    <p className="text-red-300 font-medium">Error loading user events:</p>
                    <p className="text-red-200 text-sm mt-2">{userEventsError.message}</p>
                  </div>
                  <p className="text-slate-400 text-sm">Check browser console for more details</p>
                </div>
              ) : userEvents?.events && userEvents.events.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userEvents.events.map((event: any) => (
                    <div key={event.id} className="bg-slate-700/30 rounded-lg p-4 border border-white/10 hover:border-purple-500/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-white font-medium">
                                {event.user.name}
                              </span>
                              {event.user.email && (
                                <span className="text-slate-400 text-sm">({event.user.email})</span>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.type === 'opp_click' ? 'bg-blue-500/20 text-blue-300' :
                              event.type === 'email_click' ? 'bg-green-500/20 text-green-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}>
                              {event.type.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="text-slate-300 mb-2">
                            <span className="font-medium">{event.opportunity.outlet}</span>
                            <span className="text-slate-500 mx-2">•</span>
                            <span className="text-slate-400">{event.opportunity.title}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Tier: {event.opportunity.tier}</span>
                            {event.opportunity.currentPrice && (
                              <span>Price: ${event.opportunity.currentPrice}</span>
                            )}
                            {event.user.company && (
                              <span>Company: {event.user.company}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right text-xs text-slate-500">
                          <div>{new Date(event.timestamp).toLocaleDateString()}</div>
                          <div>{new Date(event.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                              ) : userEventsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading user activity data...</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MousePointer2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No user activity data available</p>
                  <p className="text-slate-500 text-sm mt-2">Activity will appear here as users interact with opportunities</p>
                  {/* Debug info */}
                  <div className="mt-4 text-xs text-slate-600 bg-slate-800/50 rounded p-2">
                    <p>Debug: userEvents = {JSON.stringify(userEvents, null, 2)}</p>
                    <p>Loading: {userEventsLoading.toString()}</p>
                                         <p>Error: {(userEventsError as any)?.message || 'none'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}