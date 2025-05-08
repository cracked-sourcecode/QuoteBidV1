import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, ExternalLink, FileText, Send, Clock, X, Check, AlertCircle, Edit, Filter } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

// Map pitch statuses to appropriate UI components
type StatusConfig = {
  [key: string]: {
    label: string;
    icon: React.ComponentType<any>;
    color: string;
  };
};

const statusConfig: StatusConfig = {
  pending: {
    label: "Pending (Editable)",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800",
  },
  sent: {
    label: "Sent to Reporter",
    icon: Send,
    color: "bg-blue-100 text-blue-800",
  },
  sent_to_reporter: {
    label: "Sent to Reporter",
    icon: Send,
    color: "bg-blue-100 text-blue-800",
  },
  interested: {
    label: "Interested",
    icon: Check,
    color: "bg-green-100 text-green-800",
  },
  not_interested: {
    label: "Not Interested",
    icon: X,
    color: "bg-gray-100 text-gray-800",
  },
  successful: {
    label: "Successful Placement",
    icon: Check,
    color: "bg-green-100 text-green-800",
  },
};

// Types for pitches
interface Publication {
  id: number;
  name: string;
  logo?: string;
}

interface Opportunity {
  id: number;
  title: string;
  publicationId: number;
  outlet?: string;
  publication?: Publication;
}

interface Pitch {
  id: number;
  userId: number;
  opportunityId: number;
  content: string;
  bidAmount: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string;
  article?: {
    title?: string;
    url: string;
  };
  opportunity?: Opportunity;
  publication?: Publication;
}

// Format date helper
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch (e) {
    return "Invalid date";
  }
};

export default function PitchHistory() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch user's pitches
  const { data: pitches, isLoading, error } = useQuery({
    queryKey: [`/api/users/${user?.id}/pitches`],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/users/${user.id}/pitches`);
      const data = await res.json();
      console.log("User pitches:", data);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Helper to check if pitch is editable (only pending status)
  const isPitchEditable = (pitch: Pitch) => pitch.status === "pending";
  
  // Filter pitches based on selected status
  const filteredPitches = statusFilter === "all" 
    ? pitches as Pitch[] 
    : (pitches as Pitch[])?.filter(pitch => pitch.status === statusFilter);
  
  // Group pitches by month for display
  const groupedPitches: Record<string, Pitch[]> = {};
  (filteredPitches || [])?.forEach((pitch: Pitch) => {
    const date = new Date(pitch.createdAt);
    const monthYear = format(date, "MMMM yyyy");
    if (!groupedPitches[monthYear]) {
      groupedPitches[monthYear] = [];
    }
    groupedPitches[monthYear].push(pitch);
  });
  
  // Get status counts for badges
  const getStatusCounts = (): Record<string, number> => {
    if (!pitches) return {};
    return (pitches as Pitch[]).reduce((acc: Record<string, number>, pitch: Pitch) => {
      acc[pitch.status] = (acc[pitch.status] || 0) + 1;
      return acc;
    }, {});
  };
  
  const statusCounts = getStatusCounts();

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-gray-800">Detailed Pitch History</h1>
          <Button variant="outline" asChild className="text-sm">
            <Link href="/my-pitches">Back to My Pitches</Link>
          </Button>
        </div>
        <p className="text-gray-600">
          Track all your pitches, their statuses, and communications with publications.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading your pitches...</span>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center text-red-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>Error loading pitches. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : !(pitches as Pitch[])?.length ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No pitches found</h3>
            <p className="text-sm text-gray-600 mt-2">
              You haven't submitted any pitches yet. Browse opportunities and start pitching to get featured in top publications.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/opportunities">Browse Opportunities</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mb-6">
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div className="font-medium text-gray-700 flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Status Summary</span>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pitches</SelectItem>
                    {Object.entries(statusConfig).map(([key, config]) => {
                      const count = statusCounts[key] || 0;
                      if (count === 0) return null;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center">
                            <config.icon className="h-3 w-3 mr-2" />
                            <span>{config.label} ({count})</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const count = statusCounts[key] || 0;
                  if (count === 0) return null;
                  return (
                    <Badge 
                      key={key} 
                      className={`${config.color} py-1 px-2 cursor-pointer ${statusFilter === key ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                      onClick={() => setStatusFilter(key === statusFilter ? 'all' : key)}
                    >
                      <config.icon className="h-3 w-3 mr-1" />
                      <span>{count} {config.label}</span>
                    </Badge>
                  );
                })}
                {statusFilter !== "all" && (
                  <Badge 
                    variant="outline" 
                    className="py-1 px-2 cursor-pointer bg-white"
                    onClick={() => setStatusFilter("all")}
                  >
                    <X className="h-3 w-3 mr-1" />
                    <span>Clear Filter</span>
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-8">
            {Object.keys(groupedPitches).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">No pitches found</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    {statusFilter !== "all" 
                      ? `You don't have any pitches with '${statusConfig[statusFilter]?.label || statusFilter}' status.`
                      : "No pitches match your current filters."}
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <Button variant="outline" onClick={() => setStatusFilter("all")}>
                      Show All Pitches
                    </Button>
                    <Button asChild>
                      <Link href="/opportunities">Browse Opportunities</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              Object.keys(groupedPitches).map(monthYear => (
                <div key={monthYear}>
                  <h3 className="text-md font-bold text-gray-600 mb-4">{monthYear}</h3>
                  <div className="space-y-4">
                    {groupedPitches[monthYear].map(pitch => {
                      const status = statusConfig[pitch.status] || {
                        label: pitch.status,
                        icon: AlertCircle,
                        color: "bg-gray-100 text-gray-800"
                      };
                      const StatusIcon = status.icon;
                      
                      return (
                        <Card key={pitch.id} className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">
                                  {pitch.opportunity?.title || "Pitch #" + pitch.id}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  <span className="font-medium">{pitch.opportunity?.outlet || "Unknown Outlet"}</span>
                                  <span className="mx-2">•</span>
                                  <span>Pitched on {formatDate(pitch.createdAt)}</span>
                                </CardDescription>
                              </div>
                              <Badge className={`${status.color} flex items-center space-x-1`}>
                                <StatusIcon className="h-3 w-3" />
                                <span>{status.label}</span>
                              </Badge>
                            </div>
                          </CardHeader>
                          <Separator />
                          <CardContent className="pt-4">
                            <div className="prose prose-sm max-w-none">
                              <h4 className="text-sm font-medium text-gray-500">Your Pitch:</h4>
                              <div className="bg-gray-50 p-3 rounded-md mt-2 text-gray-700 whitespace-pre-line">
                                {pitch.content}
                              </div>
                            </div>
                            
                            {pitch.adminNotes && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-500">Notes from Publication:</h4>
                                <div className="bg-blue-50 p-3 rounded-md mt-2 text-gray-700">
                                  {pitch.adminNotes}
                                </div>
                              </div>
                            )}
                            
                            {pitch.status === "successful" && pitch.article && (
                              <div className="mt-4 bg-green-50 p-3 rounded-md">
                                <h4 className="text-sm font-medium text-green-700">Published Article:</h4>
                                <div className="flex items-center mt-2">
                                  <a 
                                    href={pitch.article.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 flex items-center"
                                  >
                                    {pitch.article.title || "View Published Article"}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </div>
                              </div>
                            )}
                          </CardContent>
                          <CardFooter className="bg-gray-50 flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              Bid Amount: ${pitch.bidAmount}
                            </div>
                            <div className="flex space-x-2">
                              {isPitchEditable(pitch) && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  asChild
                                  className="text-sm"
                                >
                                  <Link href={`/opportunities/${pitch.opportunityId}`}>
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit Pitch
                                  </Link>
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                asChild
                                className="text-sm"
                              >
                                <Link href={`/opportunities/${pitch.opportunityId}`}>View Opportunity</Link>
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}