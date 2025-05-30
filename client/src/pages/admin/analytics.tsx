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
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6B7280"];

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

  const isLoading = userActivityLoading || usersLoading || opportunitiesLoading || pitchesLoading || publicationsLoading;

  // Process and calculate analytics data
  const analytics = useMemo(() => {
    if (!users || !pitches || !opportunitiesWithPitches || !publications) return null;

    // Basic stats
    const totalUsers = users.length;
    const totalOpportunities = opportunitiesWithPitches.length;
    const totalPitches = pitches.length;
    const totalPublications = publications.length;
    
    // Pitch analytics
    const successfulPitches = pitches.filter((p: any) => p.status === 'successful' || p.status === 'accepted').length;
    const pendingPitches = pitches.filter((p: any) => p.status === 'pending' || p.status === 'submitted').length;
    const rejectedPitches = pitches.filter((p: any) => p.status === 'rejected').length;
    
    // Financial analytics
    const bidAmounts = pitches.map((p: any) => p.bidAmount || 0).filter((bid: number) => bid > 0);
    const totalRevenue = pitches
      .filter((p: any) => p.status === 'successful' || p.status === 'accepted')
      .reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0);
    const averageBid = bidAmounts.length > 0 ? bidAmounts.reduce((sum: number, bid: number) => sum + bid, 0) / bidAmounts.length : 0;
    const highestBid = Math.max(...bidAmounts, 0);
    
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
    
    // Publication performance
    const publicationPerformance = publications.map((pub: any) => {
      const pubOpportunities = opportunitiesWithPitches.filter((opp: any) => opp.publicationId === pub.id);
      const pubPitches = pubOpportunities.flatMap((opp: any) => opp.pitches || []);
      const pubSuccessful = pubPitches.filter((p: any) => p.status === 'successful' || p.status === 'accepted');
      
      return {
        name: pub.name.length > 15 ? pub.name.substring(0, 15) + '...' : pub.name,
        opportunities: pubOpportunities.length,
        pitches: pubPitches.length,
        successful: pubSuccessful.length,
        successRate: pubPitches.length > 0 ? (pubSuccessful.length / pubPitches.length) * 100 : 0,
        avgBid: pubPitches.length > 0 ? 
          pubPitches.filter((p: any) => p.bidAmount > 0).reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0) / 
          pubPitches.filter((p: any) => p.bidAmount > 0).length : 0
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
      
      dailyActivity.push({
        date: format(date, 'MMM dd'),
        pitches: dayPitches.length,
        opportunities: dayOpportunities.length,
        revenue: dayPitches
          .filter((p: any) => p.status === 'successful' || p.status === 'accepted')
          .reduce((sum: number, p: any) => sum + (p.bidAmount || 0), 0)
      });
    }
    
    // Pitch status distribution
    const statusData = [
      { name: 'Successful', value: successfulPitches, color: '#10B981' },
      { name: 'Pending', value: pendingPitches, color: '#F59E0B' },
      { name: 'Rejected', value: rejectedPitches, color: '#EF4444' },
    ];
    
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
      successfulPitches,
      pendingPitches,
      rejectedPitches,
      totalRevenue,
      averageBid,
      highestBid,
      userToPitchRate,
      pitchSuccessRate,
      opportunityFillRate,
      industryData,
      publicationPerformance,
      dailyActivity,
      statusData,
      tierData,
      activeToday: userActivity?.activeToday || 0,
      activeThisWeek: userActivity?.activeThisWeek || 0,
    };
  }, [users, pitches, opportunitiesWithPitches, publications, userActivity]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Comprehensive platform performance insights</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Real-time Data
        </Badge>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-blue-800">Total Users</CardTitle>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{analytics.totalUsers}</div>
                <p className="text-sm text-blue-700 mt-1">
                  {analytics.activeToday} active today
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-green-800">Total Pitches</CardTitle>
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">{analytics.totalPitches}</div>
                <p className="text-sm text-green-700 mt-1">
                  {analytics.pitchSuccessRate.toFixed(1)}% success rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-purple-800">Opportunities</CardTitle>
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900">{analytics.totalOpportunities}</div>
                <p className="text-sm text-purple-700 mt-1">
                  {analytics.opportunityFillRate.toFixed(1)}% fill rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-orange-800">Total Revenue</CardTitle>
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-900">${analytics.totalRevenue.toFixed(0)}</div>
                <p className="text-sm text-orange-700 mt-1">
                  ${analytics.averageBid.toFixed(0)} avg bid
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Activity (Last 30 Days)</CardTitle>
              <CardDescription>Daily pitches, opportunities, and revenue</CardDescription>
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

          {/* Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Pitch Status Distribution
                </CardTitle>
                <CardDescription>Current status of all pitches</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, value }) => 
                        value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                      }
                      outerRadius={120}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {analytics.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value} pitches (${((value as number / analytics.totalPitches) * 100).toFixed(1)}%)`,
                        name
                      ]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      formatter={(value, entry) => (
                        <span style={{ color: entry.color, fontWeight: 'bold' }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Summary Cards */}
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-green-800">Successful Pitches</CardTitle>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-900 mb-2">{analytics.successfulPitches}</div>
                  <p className="text-sm text-green-700">
                    {analytics.pitchSuccessRate.toFixed(1)}% of all pitches
                  </p>
                  <div className="mt-3 p-3 bg-green-200 rounded-lg">
                    <p className="text-xs text-green-800 font-medium">
                      Revenue Generated: ${analytics.totalRevenue.toFixed(0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-yellow-800">Pending Pitches</CardTitle>
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-yellow-900 mb-2">{analytics.pendingPitches}</div>
                  <p className="text-sm text-yellow-700">
                    {analytics.totalPitches > 0 ? ((analytics.pendingPitches / analytics.totalPitches) * 100).toFixed(1) : 0}% of all pitches
                  </p>
                  <div className="mt-3 p-3 bg-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800 font-medium">
                      Awaiting response from publications
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-red-800">Rejected Pitches</CardTitle>
                    <Zap className="h-6 w-6 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-900 mb-2">{analytics.rejectedPitches}</div>
                  <p className="text-sm text-red-700">
                    {analytics.totalPitches > 0 ? ((analytics.rejectedPitches / analytics.totalPitches) * 100).toFixed(1) : 0}% of all pitches
                  </p>
                  <div className="mt-3 p-3 bg-red-200 rounded-lg">
                    <p className="text-xs text-red-800 font-medium">
                      Learning opportunities for improvement
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-6">
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  User Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">User to Pitch Ratio</span>
                    <span className="font-semibold">{analytics.userToPitchRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active This Week</span>
                    <span className="font-semibold">{analytics.activeThisWeek}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Today</span>
                    <span className="font-semibold">{analytics.activeToday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Activity Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Pitches/User</span>
                    <span className="font-semibold">{(analytics.totalPitches / analytics.totalUsers).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-semibold">{analytics.pitchSuccessRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Publications</span>
                    <span className="font-semibold">{analytics.totalPublications}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Highest Bid</span>
                    <span className="font-semibold">${analytics.highestBid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Successful Pitches</span>
                    <span className="font-semibold">{analytics.successfulPitches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Revenue</span>
                    <span className="font-semibold">${analytics.totalRevenue.toFixed(0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Industry Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>User Industry Distribution</CardTitle>
              <CardDescription>Breakdown of user industries on the platform</CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle>Publication Performance</CardTitle>
              <CardDescription>Opportunities, pitches, and success rates by publication</CardDescription>
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
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{pub.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Opportunities</span>
                      <span className="font-semibold">{pub.opportunities}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Success Rate</span>
                      <span className="font-semibold">{pub.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Avg Bid</span>
                      <span className="font-semibold">${pub.avgBid.toFixed(0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Opportunity Tiers Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Tiers Distribution</CardTitle>
              <CardDescription>Distribution by tier level across all opportunities</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.tierData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financial" className="space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends (Last 30 Days)</CardTitle>
              <CardDescription>Daily revenue from successful pitches</CardDescription>
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
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">${analytics.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-green-700 mt-1">From {analytics.successfulPitches} successful pitches</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Average Bid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">${analytics.averageBid.toFixed(2)}</div>
                <p className="text-xs text-blue-700 mt-1">Across all pitches</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-800">Highest Bid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">${analytics.highestBid}</div>
                <p className="text-xs text-purple-700 mt-1">Record high</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800">Revenue per User</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">${(analytics.totalRevenue / analytics.totalUsers).toFixed(2)}</div>
                <p className="text-xs text-orange-700 mt-1">Average per user</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}