import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiFetch } from "@/lib/apiFetch";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User as UserIcon,
  Mail, 
  Calendar, 
  Search, 
  Briefcase, 
  CreditCard,
  FileText,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  MapPin,
  Building2,
  ExternalLink,
  Linkedin,
  Twitter,
  Instagram,
  Globe,
  XCircle,
  Phone,
  X
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const USERS_PER_PAGE = 21; // Changed from 20 to 21 for even grid fill

export default function UsersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isAccountInfoModalOpen, setIsAccountInfoModalOpen] = useState(false);
  const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Fetch all users with refetch interval for billing status sync
  const { data: users = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
    refetchInterval: 60000, // Reduced frequency for security
  });
  
  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Get billing status with proper sync
  const getBillingStatus = (user: any) => {
    // Check multiple fields for billing status
    const isPremium = user.premiumStatus === 'premium' || 
                     user.premiumStatus === 'active' ||
                     user.subscription_status === 'active' ||
                     user.isPaid === true;
    
    return isPremium;
  };
  
  // Filter users based on search query and filters
  const filteredUsers = users ? users.filter((user: any) => {
    // Search filter
    const matchesSearch = !searchQuery || 
      (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.industry && user.industry.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && getBillingStatus(user)) ||
      (statusFilter === "past_due" && !getBillingStatus(user));
    
    return matchesSearch && matchesStatus;
  }) : [];
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);
  
  return (
    <div className="min-h-screen p-4">
      <div className="min-h-[calc(100vh-32px)] bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 rounded-3xl border border-white/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
                  <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">
                  Manage Users
                </span>
              </h1>
              <p className="text-slate-300 text-lg">View and manage user accounts and subscriptions</p>
            </div>
          </div>
      </div>
      
        {/* Search and Filter Bar */}
        <div className="mb-6">
        <Card className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Search className="h-5 w-5 mr-2 text-amber-400" />
              Search & Filter Users
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, username, email, or industry..."
                  className="pl-10 h-11 text-sm bg-slate-700/50 border border-white/20 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white placeholder:text-slate-400 rounded-lg transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-11 text-sm bg-slate-700/50 border border-white/20 hover:border-amber-400/30 focus:border-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:outline-none text-white rounded-lg transition-colors">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border border-white/20 text-white rounded-xl">
                  <SelectItem value="all" className="focus:bg-slate-700 focus:text-white">All Status</SelectItem>
                  <SelectItem value="active" className="focus:bg-slate-700 focus:text-white">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="past_due" className="focus:bg-slate-700 focus:text-white">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      Past Due
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Results summary */}
            <div className="mt-4 text-sm text-slate-300 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-slate-400" />
              Showing {paginatedUsers.length} of {filteredUsers.length} users
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </CardContent>
        </Card>
      </div>
      
        {/* User Cards */}
        <div>
        {loadingUsers ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-300">Loading users...</p>
            </div>
          </div>
        ) : paginatedUsers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {paginatedUsers.map((user: any) => {
                const isPremium = getBillingStatus(user);
                
                return (
                  <Card key={user.id} className="bg-slate-800/40 backdrop-blur-lg border border-white/10 hover:border-white/30 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden flex flex-col h-full rounded-2xl">
                    <CardContent className="p-0 flex flex-col h-full">
                                              {/* User Header */}
                        <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 p-4 border-b border-white/10">
                        <div className="flex items-start justify-between mb-3">
                                                      <Avatar className="h-12 w-12 ring-2 ring-amber-400/30 shadow-lg">
                              <AvatarImage 
                                src={user.avatar || undefined} 
                                alt={user.fullName || user.username}
                                className="object-cover"
                              />
                              <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                {getInitials(user.fullName || user.username)}
                              </AvatarFallback>
                            </Avatar>
                          
                                                      <div className="flex gap-1.5">
                              {user.isAdmin && (
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs px-2 py-0.5">ADMIN</Badge>
                              )}
                              {isPremium ? (
                                <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs px-2 py-0.5">ACTIVE</Badge>
                              ) : (
                                <Badge className="bg-red-500/20 text-red-300 border-red-400/30 text-xs px-2 py-0.5">PAST DUE</Badge>
                              )}
                            </div>
                        </div>
                        
                        <div>
                          <h3 className="text-base font-semibold text-white truncate">
                            {user.fullName || user.username}
                          </h3>
                          <p className="text-sm text-amber-400 truncate h-5">
                            {user.title || <span className="text-slate-400">No title</span>}
                          </p>
                          <p className="text-sm text-slate-300 truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      {/* User Details - Fixed height */}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono text-xs truncate">{user.username}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-slate-300 h-5">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs truncate">
                              {user.industry || <span className="text-slate-400">No industry</span>}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-slate-300 h-5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs truncate">
                              {user.location || <span className="text-slate-400">No location</span>}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {/* Action Button - Always at bottom */}
                        <div className="pt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full bg-slate-700/50 border border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 text-sm h-9 font-semibold transition-all duration-200"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsAccountInfoModalOpen(true);
                            }}
                          >
                            <UserIcon className="h-3.5 w-3.5 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Card className="mt-8 bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-300">
                      Page {currentPage} of {totalPages}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="bg-slate-700/50 border border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 transition-all duration-200"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className={`w-8 h-8 p-0 ${
                                currentPage === pageNum 
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg' 
                                  : 'bg-slate-700/50 border border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 transition-all duration-200'
                              }`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-slate-700/50 border border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 transition-all duration-200"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 border border-white/10">
                <UserIcon className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">No users found</h3>
              <p className="text-slate-300 mb-6 text-center max-w-md">
                {searchQuery ? "No users match your search criteria. Try adjusting your filters." : "There are no users registered yet."}
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="bg-slate-800/50 border-2 border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 text-white hover:text-amber-400 font-semibold transition-all duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Enhanced Account Information Modal */}
      {selectedUser && (
        <Dialog open={isAccountInfoModalOpen} onOpenChange={setIsAccountInfoModalOpen}>
          <DialogContent className="max-w-4xl bg-slate-900 text-white">
            <DialogHeader>
              <DialogTitle>
                User Account Details: {selectedUser.fullName || selectedUser.username}
              </DialogTitle>
              <DialogDescription>
                Detailed information about {selectedUser.fullName || selectedUser.username}, including account status, contact information, and administrative actions.
              </DialogDescription>
            </DialogHeader>
                        
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar || undefined} alt={selectedUser.fullName || selectedUser.username} />
                  <AvatarFallback className="bg-amber-500 text-white font-bold">
                    {getInitials(selectedUser.fullName || selectedUser.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{selectedUser.fullName || selectedUser.username}</h2>
                    {selectedUser.isAdmin && (
                      <Badge className="bg-purple-500">ADMIN</Badge>
                    )}
                    {getBillingStatus(selectedUser) ? (
                      <Badge className="bg-green-500">ACTIVE</Badge>
                    ) : (
                      <Badge className="bg-red-500">PAST DUE</Badge>
                    )}
                  </div>
                  <p className="text-slate-300">{selectedUser.email}</p>
                </div>
              </div>
              
                            <div className="grid grid-cols-2 gap-10">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="text-base"><span className="font-semibold text-slate-300">Username:</span> <span className="ml-2">{selectedUser.username}</span></div>
                  <div className="text-base"><span className="font-semibold text-slate-300">Industry:</span> <span className="ml-2">{selectedUser.industry || 'Not specified'}</span></div>
                  <div className="text-base"><span className="font-semibold text-slate-300">Location:</span> <span className="ml-2">{selectedUser.location || 'Not specified'}</span></div>
                  <div className="text-base"><span className="font-semibold text-slate-300">Joined:</span> <span className="ml-2">{new Date(selectedUser.createdAt).toLocaleDateString()}</span></div>
                  <div className="text-base"><span className="font-semibold text-slate-300">Subscription:</span> <span className="ml-2">{getBillingStatus(selectedUser) ? 'Active Subscriber ($99.99/month Premium)' : 'Not Subscribed'}</span></div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-5">
                  {selectedUser.bio && (
                    <div>
                      <h4 className="font-semibold text-slate-300 text-base mb-3">Bio:</h4>
                      <p className="text-slate-300 bg-slate-800 p-4 rounded-lg text-base leading-relaxed">{selectedUser.bio}</p>
                    </div>
                  )}
                  
                  {(selectedUser.linkedIn || selectedUser.twitter || selectedUser.instagram || selectedUser.website) && (
                    <div>
                      <h4 className="font-semibold text-slate-300 text-base mb-3">Social Links:</h4>
                      <div className="flex gap-3 flex-wrap">
                        {selectedUser.linkedIn && (
                          <a href={selectedUser.linkedIn} target="_blank" rel="noopener noreferrer" 
                             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                            LinkedIn
                          </a>
                        )}
                        {selectedUser.twitter && (
                          <a href={selectedUser.twitter} target="_blank" rel="noopener noreferrer" 
                             className="bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                            X
                          </a>
                        )}
                        {selectedUser.instagram && (
                          <a href={selectedUser.instagram} target="_blank" rel="noopener noreferrer" 
                             className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                            Instagram
                          </a>
                        )}
                        {selectedUser.website && (
                          <a href={selectedUser.website} target="_blank" rel="noopener noreferrer" 
                             className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-700">
                <Button
                  onClick={async () => {
                    setIsResetPasswordLoading(true);
                    try {
                      const res = await apiRequest('POST', '/api/admin/reset-password', {
                        userId: selectedUser.id,
                        email: selectedUser.email
                      });
                      
                      if (!res.ok) {
                        const error = await res.json();
                        throw new Error(error.message || 'Failed to send password reset');
                      }
                      
                      toast({
                        title: "Password reset email sent",
                        description: `Reset link sent to ${selectedUser.email}`,
                      });
                    } catch (error: any) {
                      toast({
                        title: "Failed to send password reset",
                        description: error.message,
                        variant: "destructive",
                      });
                    } finally {
                      setIsResetPasswordLoading(false);
                    }
                  }}
                  disabled={isResetPasswordLoading}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-3 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  {isResetPasswordLoading ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                      Sending Reset Email...
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-3" />
                      Reset Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
              )}
        </div>
      </div>
    </div>
  );
}