import { useState } from "react";
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
} from "recharts";

// Mock data for charts - in production, this would come from real API data
const activityData = [
  { date: "Mon", active: 4, new: 2 },
  { date: "Tue", active: 3, new: 1 },
  { date: "Wed", active: 5, new: 2 },
  { date: "Thu", active: 7, new: 3 },
  { date: "Fri", active: 8, new: 1 },
  { date: "Sat", active: 6, new: 0 },
  { date: "Sun", active: 9, new: 4 },
];

const opportunityEngagement = [
  { name: "Forbes", engagement: 75 },
  { name: "Bloomberg", engagement: 63 },
  { name: "Wall Street Journal", engagement: 82 },
  { name: "TechCrunch", engagement: 58 },
  { name: "Business Insider", engagement: 45 },
];

const userIndustries = [
  { name: "Real Estate", value: 35 },
  { name: "Crypto", value: 20 },
  { name: "Finance", value: 15 },
  { name: "Technology", value: 25 },
  { name: "Other", value: 5 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28DFF"];

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Real data from API
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
  
  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['/api/opportunities'],
    queryFn: async () => {
      const res = await apiFetch('/api/opportunities');
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

  const isLoading = userActivityLoading || usersLoading || opportunitiesLoading || pitchesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // Calculate stats from real data
  const totalUsers = users?.length || 0;
  const totalOpportunities = opportunities?.length || 0;
  const totalPitches = pitches?.length || 0;
  const activeToday = userActivity?.activeToday || 0;
  const activeThisWeek = userActivity?.activeThisWeek || 0;
  const currentlyOnline = userActivity?.currentlyOnline || 0;
  
  // Calculate conversion rate
  const conversionRate = totalUsers > 0 ? Math.round((totalPitches / totalUsers) * 100) : 0;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunity Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalUsers}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="text-green-600 font-medium">{activeToday} active today</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{currentlyOnline}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="text-blue-600 font-medium">{activeThisWeek} active this week</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalOpportunities}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Across multiple publications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{conversionRate}%</div>
                <p className="text-sm text-muted-foreground mt-2">
                  User to pitch ratio
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>User Activity (7 Days)</CardTitle>
              <CardDescription>Daily active users and new signups</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="active" stroke="#8884d8" name="Active Users" strokeWidth={2} />
                  <Line type="monotone" dataKey="new" stroke="#82ca9d" name="New Signups" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Industry Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>User Industry Distribution</CardTitle>
              <CardDescription>Breakdown of user industries</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userIndustries}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userIndustries.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-6">
          {/* User Engagement Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>User Engagement Over Time</CardTitle>
              <CardDescription>Monthly active users</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { month: 'Jan', users: 42 },
                  { month: 'Feb', users: 45 },
                  { month: 'Mar', users: 48 },
                  { month: 'Apr', users: 52 },
                  { month: 'May', users: 58 },
                  { month: 'Jun', users: 65 },
                ]}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Retention */}
          <Card>
            <CardHeader>
              <CardTitle>User Retention</CardTitle>
              <CardDescription>How many users return after 1-6 weeks</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { week: '1 Week', retention: 85 },
                  { week: '2 Weeks', retention: 72 },
                  { week: '3 Weeks', retention: 63 },
                  { week: '4 Weeks', retention: 58 },
                  { week: '5 Weeks', retention: 52 },
                  { week: '6 Weeks', retention: 48 },
                ]}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="retention" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="opportunities" className="space-y-6">
          {/* Opportunity Engagement */}
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Engagement</CardTitle>
              <CardDescription>Which opportunities get the most engagement</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opportunityEngagement} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pitch Success Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Pitch Success Rate</CardTitle>
              <CardDescription>Percentage of successful pitches by category</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Successful', value: 65 },
                      { name: 'Pending', value: 15 },
                      { name: 'Rejected', value: 20 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#4CAF50" />
                    <Cell fill="#FFC107" />
                    <Cell fill="#F44336" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}