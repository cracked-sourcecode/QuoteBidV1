import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  Shield, 
  Search, 
  Briefcase, 
  CreditCard,
  FileText,
  Clock,
  CheckCircle
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function UsersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [isAccountInfoModalOpen, setIsAccountInfoModalOpen] = useState(false);
  const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);
  
  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
  });
  
  // Update user admin status
  const updateAdminStatusMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}/admin`, { isAdmin });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update admin status');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User updated",
        description: "The user's admin status has been updated successfully.",
      });
      setIsAdminDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    },
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
  
  // Filter users based on search query
  const filteredUsers = users ? users.filter((user: any) => {
    // Debug log for juanchica user
    if (user.username === 'juanchica') {
      console.log('Found juanchica user:', user);
      console.log('Premium status:', user.premiumStatus);
    }
    
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (user.fullName && user.fullName.toLowerCase().includes(query)) ||
      (user.username && user.username.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      (user.industry && user.industry.toLowerCase().includes(query))
    );
  }) : [];
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Users</h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9 w-60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {loadingUsers ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredUsers.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agreement</TableHead>
                  <TableHead className="text-right">Account Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(user.fullName || user.username)}</AvatarFallback>
                        </Avatar>
                        <div className="truncate max-w-[120px]">
                          <div className="font-medium">{user.fullName || user.username}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {['premium', 'active'].includes(user.premiumStatus?.toLowerCase()) ? (
                        <Badge className="bg-green-500 hover:bg-green-600">ACTIVE</Badge>
                      ) : (
                        <Badge className="bg-red-500 hover:bg-red-600">PAST DUE</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {(user.agreementSigned || (user.agreementPdfUrl && user.agreementSignedAt)) ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700 hover:border-green-300"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsAgreementModalOpen(true);
                          }}
                        >
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            View
                          </span>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                          Pending
                        </Badge>
                      )}
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
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          View Info
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-xl font-semibold mb-2">No users found</p>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No users match your search criteria." : "There are no users registered yet."}
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Admin status dialog */}
      {selectedUser && (
        <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage User</DialogTitle>
              <DialogDescription>
                Update user settings and permissions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Avatar className="h-24 w-24 rounded-md border">
                    <AvatarImage src={selectedUser.avatar || undefined} alt={selectedUser.fullName || selectedUser.username} className="object-cover" />
                    <AvatarFallback className="text-3xl font-medium">
                      {getInitials(selectedUser.fullName || selectedUser.username)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-lg font-bold">
                      {selectedUser.fullName || selectedUser.username}
                    </h3>
                    {selectedUser.title && (
                      <p className="text-gray-600 mt-1 text-sm">{selectedUser.title}</p>
                    )}
                    <p className="text-muted-foreground flex items-center mt-1">
                      <Mail className="h-3 w-3 mr-1" /> {selectedUser.email}
                    </p>
                    {selectedUser.location && (
                      <p className="text-gray-500 text-xs mt-1">{selectedUser.location}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <h4 className="font-medium flex items-center mb-1">
                    <UserIcon className="h-4 w-4 mr-1" /> Account
                  </h4>
                  <p className="text-sm text-muted-foreground">Username: {selectedUser.username}</p>
                </div>
                
                <div>
                  <h4 className="font-medium flex items-center mb-1">
                    <Calendar className="h-4 w-4 mr-1" /> Joined
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                {selectedUser.industry && (
                  <div>
                    <h4 className="font-medium flex items-center mb-1">
                      <Briefcase className="h-4 w-4 mr-1" /> Industry
                    </h4>
                    <Badge variant="outline">{selectedUser.industry}</Badge>
                  </div>
                )}
                
                <div className="col-span-2">
                  <h4 className="font-medium flex items-center mb-1">
                    <CreditCard className="h-4 w-4 mr-1" /> Subscription
                  </h4>
                  <div className="flex items-center space-x-2 mb-1">
                    {['premium', 'active'].includes(selectedUser.premiumStatus?.toLowerCase()) ? (
                      <Badge className="bg-green-500 hover:bg-green-600">PREMIUM</Badge>
                    ) : (
                      <Badge variant="outline">FREE</Badge>
                    )}
                    {['premium', 'active'].includes(selectedUser.premiumStatus?.toLowerCase()) && (
                      <span className="text-sm text-muted-foreground">
                        {selectedUser.premiumExpiry ? 
                          `Renews on ${new Date(selectedUser.premiumExpiry).toLocaleDateString()}` : 
                          `Monthly subscription at $99.99/month`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {['premium', 'active'].includes(selectedUser.premiumStatus?.toLowerCase()) ? 'Premium subscription is active' : 'No active subscription'}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium flex items-center mb-3">
                  <Shield className="h-4 w-4 mr-1" /> Administrative Access
                </h4>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={selectedUser.isAdmin}
                    onCheckedChange={(checked) => {
                      updateAdminStatusMutation.mutate({
                        userId: selectedUser.id,
                        isAdmin: checked
                      });
                    }}
                    disabled={updateAdminStatusMutation.isPending}
                  />
                  <Label>Admin privileges</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Grant this user full administrative access to manage all content and users.
                </p>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium flex items-center mb-3">
                  <Mail className="h-4 w-4 mr-1" /> Password Reset
                </h4>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Send a password reset link to this user's email. The user will receive instructions to create a new password.
                </p>
                
                <Button
                  variant="outline"
                  size="sm"
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
                        description: `A password reset link has been sent to ${selectedUser.email}`,
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
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      Sending...
                    </>
                  ) : (
                    "Send Password Reset Link"
                  )}
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsAdminDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant={selectedUser.isAdmin ? "destructive" : "default"}
                onClick={() => {
                  updateAdminStatusMutation.mutate({
                    userId: selectedUser.id,
                    isAdmin: !selectedUser.isAdmin
                  });
                }}
                disabled={updateAdminStatusMutation.isPending}
              >
                {updateAdminStatusMutation.isPending 
                  ? "Updating..." 
                  : selectedUser.isAdmin 
                    ? "Remove Admin Access" 
                    : "Grant Admin Access"
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Agreement Modal */}
      {selectedUser && (
        <Dialog open={isAgreementModalOpen} onOpenChange={setIsAgreementModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>User Agreement</DialogTitle>
              <DialogDescription>
                Agreement details for {selectedUser.fullName || selectedUser.username}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-2">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-lg">Agreement Signed</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border bg-gray-50 rounded-md p-4">
                <div>
                  <h4 className="font-medium flex items-center mb-1">
                    <Clock className="h-4 w-4 mr-1 text-gray-600" /> Signed Date
                  </h4>
                  <p className="text-sm">
                    {selectedUser.agreementSignedAt ? 
                      new Date(selectedUser.agreementSignedAt).toLocaleString() : 
                      "Not available"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium flex items-center mb-1">
                    <UserIcon className="h-4 w-4 mr-1 text-gray-600" /> IP Address
                  </h4>
                  <p className="text-sm">
                    {selectedUser.agreementIpAddress || "Not recorded"}
                  </p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4 bg-white">
                <h4 className="font-medium flex items-center mb-3">
                  <FileText className="h-4 w-4 mr-1 text-gray-600" /> Platform Access Agreement
                </h4>
                
                <div className="h-80 overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                  <div className="prose prose-sm max-w-none">
                    <h2 className="text-center">PLATFORM ACCESS AGREEMENT</h2>
                    <p className="text-center text-sm text-gray-600 mb-4">Effective Date: Upon Acceptance by User</p>
                    
                    <p>This Platform Access Agreement ("Agreement") is entered into between Rubicon PR Group, LLC ("Provider"), and the individual or entity accepting this Agreement ("User").</p>
                    
                    <h3>1. PLATFORM DESCRIPTION</h3>
                    <p>The Provider offers a proprietary platform (the "Platform") that connects media professionals, journalists, and PR specialists for the purpose of facilitating media opportunities, story pitches, and media coverage (the "Services").</p>
                    
                    <h3>2. ACCESS AND USAGE RIGHTS</h3>
                    <p>Subject to compliance with this Agreement, Provider grants User a limited, non-exclusive, non-transferable right to access and use the Platform solely for User's internal business purposes.</p>
                    
                    <h3>3. USER OBLIGATIONS</h3>
                    <p>User agrees to:</p>
                    <ul>
                      <li>Provide accurate information during registration and keep such information updated</li>
                      <li>Maintain the confidentiality of User's account credentials</li>
                      <li>Use the Platform in compliance with all applicable laws and regulations</li>
                      <li>Refrain from any activity that could harm, disable, or impair the Platform</li>
                      <li>Not use the Platform to distribute harmful content, spam, or illegal materials</li>
                    </ul>
                    
                    <h3>4. FEES AND PAYMENT</h3>
                    <p>User agrees to pay all applicable fees for access to and use of the Platform as specified during the registration process. All fees are non-refundable except as otherwise expressly set forth in this Agreement.</p>
                    
                    <h3>5. INTELLECTUAL PROPERTY</h3>
                    <p>All content, features, and functionality of the Platform, including but not limited to text, graphics, logos, and software, are owned by or licensed to Provider and are protected by copyright, trademark, and other intellectual property laws.</p>
                    
                    <h3>6. TERM AND TERMINATION</h3>
                    <p>This Agreement shall remain in effect until terminated by either party. Provider may terminate User's access to the Platform immediately if User breaches any provision of this Agreement.</p>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center"
                      onClick={() => selectedUser?.agreementPdfUrl ? window.open(selectedUser.agreementPdfUrl, '_blank') : toast({
                        title: "Agreement PDF Not Found",
                        description: "This user does not have a signed agreement PDF on file.",
                        variant: "destructive"
                      })}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Open PDF Version
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center"
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/admin/regenerate-agreements?userId=${selectedUser.id}`, {
                            method: 'POST',
                          });
                          
                          if (!response.ok) {
                            throw new Error('Failed to regenerate agreement');
                          }
                          
                          const result = await response.json();
                          
                          if (result.success) {
                            toast({
                              title: "Agreement Regenerated",
                              description: "The agreement PDF has been regenerated successfully.",
                            });
                            // Refresh the page to show updated data
                            window.location.reload();
                          } else {
                            throw new Error(result.message || 'Unknown error');
                          }
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message || "Failed to regenerate agreement PDF",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsAgreementModalOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Account Information Modal */}
      {selectedUser && (
        <Dialog open={isAccountInfoModalOpen} onOpenChange={setIsAccountInfoModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Account Information</DialogTitle>
              <DialogDescription>
                User details for {selectedUser.fullName || selectedUser.username}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-2">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0">
                  <Avatar className="h-32 w-32 rounded-md border">
                    <AvatarImage src={selectedUser.avatar || undefined} alt={selectedUser.fullName || selectedUser.username} className="object-cover" />
                    <AvatarFallback className="text-4xl font-medium">
                      {getInitials(selectedUser.fullName || selectedUser.username)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedUser.fullName || selectedUser.username}
                    </h3>
                    {selectedUser.title && (
                      <p className="text-gray-600 mt-1">{selectedUser.title}</p>
                    )}
                    <p className="text-muted-foreground flex items-center mt-1">
                      <Mail className="h-3.5 w-3.5 mr-1.5" /> {selectedUser.email}
                    </p>
                    {selectedUser.location && (
                      <p className="text-gray-500 text-sm mt-1">{selectedUser.location}</p>
                    )}
                  </div>
                  {selectedUser.bio && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1 text-sm">Bio</h4>
                      <p className="text-gray-600 text-sm">{selectedUser.bio}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mt-4">
                <div className="space-y-3 border rounded-md p-4 bg-gray-50">
                  <h4 className="font-medium flex items-center text-gray-700">
                    <UserIcon className="h-4 w-4 mr-2" /> Account Details
                  </h4>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium">Username</div>
                      <div className="text-sm text-gray-600">{selectedUser.username}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium">Full Name</div>
                      <div className="text-sm text-gray-600">{selectedUser.fullName || 'Not provided'}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium">Email Address</div>
                      <div className="text-sm text-gray-600">{selectedUser.email}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium">Account Created</div>
                      <div className="text-sm text-gray-600">{new Date(selectedUser.createdAt).toLocaleString()}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium">Admin Status</div>
                      <div className="flex items-center mt-1">
                        {selectedUser.isAdmin ? (
                          <Badge className="bg-purple-500 hover:bg-purple-600">ADMIN</Badge>
                        ) : (
                          <Badge variant="outline">Regular User</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 border rounded-md p-4 bg-gray-50">
                  <h4 className="font-medium flex items-center text-gray-700">
                    <CreditCard className="h-4 w-4 mr-2" /> Subscription
                  </h4>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium">Subscription Status</div>
                      <div className="flex items-center mt-1">
                        {['premium', 'active'].includes(selectedUser.premiumStatus?.toLowerCase()) ? (
                          <Badge className="bg-green-500 hover:bg-green-600">ACTIVE</Badge>
                        ) : (
                          <Badge className="bg-red-500 hover:bg-red-600">PAST DUE</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium">Plan</div>
                      <div className="text-sm text-gray-600">Media Platform Access ($99.99/month)</div>
                    </div>
                    
                    {['premium', 'active'].includes(selectedUser.premiumStatus?.toLowerCase()) && selectedUser.premiumExpiry && (
                      <div>
                        <div className="text-sm font-medium">Next Billing Date</div>
                        <div className="text-sm text-gray-600">{new Date(selectedUser.premiumExpiry).toLocaleDateString()}</div>
                      </div>
                    )}
                    
                    {!['premium', 'active'].includes(selectedUser.premiumStatus?.toLowerCase()) && (
                      <div>
                        <div className="text-sm font-medium">Payment Required</div>
                        <div className="text-sm text-red-600 font-medium">Subscription payment needed to restore access</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedUser.industry && (
                <div className="border rounded-md p-4 bg-gray-50">
                  <h4 className="font-medium flex items-center text-gray-700 mb-2">
                    <Briefcase className="h-4 w-4 mr-2" /> Professional Information
                  </h4>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium">Industry</div>
                      <div className="text-sm text-gray-600">{selectedUser.industry}</div>
                    </div>
                    
                    {selectedUser.company && (
                      <div>
                        <div className="text-sm font-medium">Company</div>
                        <div className="text-sm text-gray-600">{selectedUser.company}</div>
                      </div>
                    )}
                    
                    {selectedUser.jobTitle && (
                      <div>
                        <div className="text-sm font-medium">Job Title</div>
                        <div className="text-sm text-gray-600">{selectedUser.jobTitle}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="border rounded-md p-4">
                <h4 className="font-medium flex items-center text-gray-700 mb-3">
                  <Mail className="h-4 w-4 mr-2" /> Password Management
                </h4>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Send a password reset link to this user's email. The user will receive instructions to create a new password.
                </p>
                
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
                        description: `A password reset link has been sent to ${selectedUser.email}`,
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
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      Sending...
                    </>
                  ) : (
                    "Send Password Reset Link"
                  )}
                </Button>
              </div>
              
              {/* Administrator section removed as requested */}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsAccountInfoModalOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}