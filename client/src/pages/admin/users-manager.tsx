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
  AlertCircle
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

const USERS_PER_PAGE = 25;

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
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
    refetchInterval: 30000, // Refetch every 30 seconds for billing status updates
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Users</h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchUsers()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      {/* Enhanced Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, username, email, or industry..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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
        <div className="mt-3 text-sm text-muted-foreground">
          Showing {paginatedUsers.length} of {filteredUsers.length} users
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>
      
      {loadingUsers ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : paginatedUsers.length > 0 ? (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Account Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user: any) => {
                    const isPremium = getBillingStatus(user);
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar || undefined} alt={user.fullName || user.username} />
                              <AvatarFallback>{getInitials(user.fullName || user.username)}</AvatarFallback>
                            </Avatar>
                            <div className="truncate max-w-[180px]">
                              <div className="font-medium">{user.fullName || user.username}</div>
                              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">{user.username}</span>
                            {user.isAdmin && (
                              <Badge variant="outline" className="text-xs">Admin</Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isPremium ? (
                              <Badge className="bg-green-500 hover:bg-green-600">ACTIVE</Badge>
                            ) : (
                              <Badge className="bg-red-500 hover:bg-red-600">PAST DUE</Badge>
                            )}
                            {!isPremium && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsAccountInfoModalOpen(true);
                            }}
                          >
                            <span className="flex items-center">
                              <UserIcon className="h-4 w-4 mr-1" />
                              View Info
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
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
                        className="w-8 h-8 p-0"
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
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-xl font-semibold mb-2">No users found</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No users match your search criteria." : "There are no users registered yet."}
            </p>
            {(searchQuery || statusFilter !== "all") && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Account Information Modal */}
      {selectedUser && (
        <Dialog open={isAccountInfoModalOpen} onOpenChange={setIsAccountInfoModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Account information for {selectedUser.fullName || selectedUser.username}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              {/* User Header Section */}
              <div className="flex items-start gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar || undefined} alt={selectedUser.fullName || selectedUser.username} />
                  <AvatarFallback className="text-lg font-medium">
                    {getInitials(selectedUser.fullName || selectedUser.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {selectedUser.fullName || selectedUser.username}
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  {selectedUser.title && (
                    <p className="text-sm text-gray-600 mt-1">{selectedUser.title}</p>
                  )}
                  {selectedUser.location && (
                    <p className="text-sm text-gray-500">{selectedUser.location}</p>
                  )}
                </div>
                <div className="text-right">
                  {selectedUser.isAdmin ? (
                    <Badge className="bg-purple-500 hover:bg-purple-600">ADMIN</Badge>
                  ) : (
                    <Badge variant="outline">User</Badge>
                  )}
                </div>
              </div>
              
              {/* Main Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Account Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Account Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Username</span>
                      <span className="font-mono">{selectedUser.username}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Member Since</span>
                      <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>
                    {selectedUser.industry && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Industry</span>
                        <span>{selectedUser.industry}</span>
                      </div>
                    )}
                    {selectedUser.company_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Company</span>
                        <span>{selectedUser.company_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Subscription Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Subscription Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Status</span>
                      {getBillingStatus(selectedUser) ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-xs">ACTIVE</Badge>
                      ) : (
                        <Badge className="bg-red-500 hover:bg-red-600 text-xs">PAST DUE</Badge>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Plan</span>
                      <span>$99.99/month</span>
                    </div>
                    {getBillingStatus(selectedUser) && selectedUser.premiumExpiry && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Next Billing</span>
                        <span>{new Date(selectedUser.premiumExpiry).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Bio Section - Only show if exists */}
              {selectedUser.bio && (
                <div className="pt-2">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Bio</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{selectedUser.bio}</p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
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
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Password Reset
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}