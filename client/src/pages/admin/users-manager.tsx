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
  Phone
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-600 mt-1">View and manage user accounts and subscriptions</p>
          </div>
        </div>
      </div>
      
      {/* Search and Filter Bar */}
      <div className="px-8 py-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, username, email, or industry..."
                  className="pl-10 h-10 text-sm border-gray-300 focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-10 text-sm border-gray-300">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Results summary */}
            <div className="mt-4 text-sm text-gray-600 flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Showing {paginatedUsers.length} of {filteredUsers.length} users
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* User Cards */}
      <div className="px-8 pb-8">
        {loadingUsers ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Loading users...</p>
            </div>
          </div>
        ) : paginatedUsers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedUsers.map((user: any) => {
                const isPremium = getBillingStatus(user);
                
                return (
                  <Card key={user.id} className="bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                    <CardContent className="p-0">
                      {/* User Header */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <Avatar className="h-16 w-16 ring-4 ring-white shadow-xl">
                            <AvatarImage src={user.avatar || undefined} alt={user.fullName || user.username} />
                            <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {getInitials(user.fullName || user.username)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex flex-col gap-2">
                            {user.isAdmin && (
                              <Badge className="bg-purple-500 hover:bg-purple-600 text-xs px-2 py-1">ADMIN</Badge>
                            )}
                            {isPremium ? (
                              <Badge className="bg-green-500 hover:bg-green-600 text-xs px-2 py-1">ACTIVE</Badge>
                            ) : (
                              <Badge className="bg-red-500 hover:bg-red-600 text-xs px-2 py-1">PAST DUE</Badge>
                            )}
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                          {user.fullName || user.username}
                        </h3>
                        {user.title && (
                          <p className="text-blue-600 font-medium text-sm mb-2 truncate">{user.title}</p>
                        )}
                        <p className="text-gray-600 text-sm truncate">{user.email}</p>
                      </div>
                      
                      {/* User Details - Fixed height content area */}
                      <div className="p-6 h-[240px]">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <UserIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="font-mono truncate text-xs">{user.username}</span>
                          </div>
                          
                          {user.industry && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Briefcase className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{user.industry}</span>
                            </div>
                          )}
                          
                          {user.location && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{user.location}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {/* Action Button - Absolutely positioned at bottom */}
                        <div className="absolute bottom-6 left-6 right-6">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full border-gray-300 hover:bg-gray-50 h-10 text-sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsAccountInfoModalOpen(true);
                            }}
                          >
                            <UserIcon className="h-4 w-4 mr-2" />
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
              <div className="flex items-center justify-between mt-8">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-300"
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
                          className={`w-8 h-8 p-0 ${currentPage !== pageNum ? 'border-gray-300' : ''}`}
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
                    className="border-gray-300"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="bg-gray-100 rounded-full p-6 mb-6">
                <UserIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">No users found</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                {searchQuery ? "No users match your search criteria. Try adjusting your filters." : "There are no users registered yet."}
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="border-gray-300"
                >
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
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 flex flex-col border-0 shadow-none bg-transparent overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white px-8 py-6 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAccountInfoModalOpen(false)}
                className="absolute top-4 right-4 z-10 h-10 w-10 p-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </Button>
              
              <div className="flex items-start justify-between pr-16">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <Avatar className="h-20 w-20 ring-4 ring-white/30 shadow-2xl flex-shrink-0">
                    <AvatarImage src={selectedUser.avatar || undefined} alt={selectedUser.fullName || selectedUser.username} />
                    <AvatarFallback className="text-2xl bg-white/20 text-white font-bold">
                      {getInitials(selectedUser.fullName || selectedUser.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {selectedUser.fullName || selectedUser.username}
                    </h1>
                    <div className="flex items-center gap-4 text-white/90 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>Joined {new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  {selectedUser.isAdmin && (
                    <Badge className="bg-purple-500 hover:bg-purple-600">ADMIN</Badge>
                  )}
                  {getBillingStatus(selectedUser) ? (
                    <Badge className="bg-green-500 hover:bg-green-600">ACTIVE</Badge>
                  ) : (
                    <Badge className="bg-red-500 hover:bg-red-600">PAST DUE</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 space-y-6">
              
              {/* Professional Profile Card */}
              <Card className="bg-white border border-gray-200 shadow-xl overflow-hidden mx-6 mt-6">
                <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-100">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                    <div className="p-2 bg-blue-500 rounded-xl">
                      <UserIcon className="h-6 w-6 text-white" />
                    </div>
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Details */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        Personal Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">Username</p>
                            <p className="font-mono font-medium">{selectedUser.username}</p>
                          </div>
                        </div>
                        {selectedUser.title && (
                          <div className="flex items-center gap-3">
                            <Briefcase className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-600">Title</p>
                              <p className="font-medium text-blue-600">{selectedUser.title}</p>
                            </div>
                          </div>
                        )}
                        {selectedUser.industry && (
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-600">Industry</p>
                              <p className="font-medium">{selectedUser.industry}</p>
                            </div>
                          </div>
                        )}
                        {selectedUser.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-600">Location</p>
                              <p className="font-medium">{selectedUser.location}</p>
                            </div>
                          </div>
                        )}
                        {selectedUser.company_name && (
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-600">Company</p>
                              <p className="font-medium">{selectedUser.company_name}</p>
                            </div>
                          </div>
                        )}
                        {selectedUser.phone_number && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm text-gray-600">Phone</p>
                              <p className="font-medium">{selectedUser.phone_number}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Account Status */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        Account Status
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">Subscription Status</p>
                            <div className="flex items-center gap-2">
                              {getBillingStatus(selectedUser) ? (
                                <Badge className="bg-green-500 hover:bg-green-600 text-xs">ACTIVE SUBSCRIBER</Badge>
                              ) : (
                                <Badge className="bg-red-500 hover:bg-red-600 text-xs">NOT SUBSCRIBED</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">Plan</p>
                            <p className="font-medium">$99.99/month Premium</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">Member Since</p>
                            <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {selectedUser.isAdmin && (
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-4 w-4 text-purple-500" />
                            <div>
                              <p className="text-sm text-gray-600">Role</p>
                              <Badge className="bg-purple-500 hover:bg-purple-600">ADMIN USER</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Bio Section */}
                  {selectedUser.bio && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        About This User
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-gray-700 leading-relaxed">{selectedUser.bio}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {(selectedUser.linkedIn || selectedUser.twitter || selectedUser.instagram || selectedUser.website) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        Social Profiles
                      </h4>
                      <div className="flex gap-3 flex-wrap">
                        {selectedUser.linkedIn && (
                          <a 
                            href={selectedUser.linkedIn} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            <Linkedin className="h-4 w-4" />
                            <span className="font-medium">LinkedIn</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {selectedUser.twitter && (
                          <a 
                            href={selectedUser.twitter} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            <Twitter className="h-4 w-4" />
                            <span className="font-medium">Twitter</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {selectedUser.instagram && (
                          <a 
                            href={selectedUser.instagram} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            <Instagram className="h-4 w-4" />
                            <span className="font-medium">Instagram</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {selectedUser.website && (
                          <a 
                            href={selectedUser.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            <Globe className="h-4 w-4" />
                            <span className="font-medium">Website</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Actions Card */}
              <Card className="bg-white border border-gray-200 shadow-xl overflow-hidden mx-6 mb-6">
                <CardHeader className="bg-gradient-to-br from-amber-50 to-orange-50 border-b border-gray-100">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                    <div className="p-2 bg-amber-500 rounded-xl">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    Account Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Button
                    variant="outline"
                    className="w-full bg-white border-gray-300 hover:bg-gray-50"
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
                  >
                    {isResetPasswordLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending Reset Email...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Password Reset Email
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}