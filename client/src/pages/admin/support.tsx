import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail, RefreshCw, Search, ArrowRight, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export default function Support() {
  const { toast } = useToast();
  const { adminUser } = useAdminAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isPasswordResetting, setIsPasswordResetting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  
  // Fetch all users for searching
  const { data: users = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
  });
  
  // Search users
  const handleUserSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    const query = searchQuery.toLowerCase();
    const filteredUsers = users.filter((user: any) => {
      return (
        (user.fullName && user.fullName.toLowerCase().includes(query)) ||
        (user.username && user.username.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query))
      );
    });
    
    if (filteredUsers.length === 0) {
      toast({
        title: "No users found",
        description: "No users match your search criteria",
        variant: "destructive"
      });
    } else if (filteredUsers.length === 1) {
      setSelectedUser(filteredUsers[0]);
      setShowUserDetails(true);
    } else {
      // If multiple users match, show the first one
      setSelectedUser(filteredUsers[0]);
      setShowUserDetails(true);
      toast({
        title: "Multiple users found",
        description: `Found ${filteredUsers.length} users. Showing the first match.`,
      });
    }
    setIsSearching(false);
  };
  
  // Send a password reset email
  const handlePasswordReset = async () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user first",
        variant: "destructive"
      });
      return;
    }
    
    setIsPasswordResetting(true);
    try {
      const res = await apiRequest("POST", "/api/admin/reset-password", {
        userId: selectedUser.id,
        email: selectedUser.email
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send password reset");
      }
      
      toast({
        title: "Password reset email sent",
        description: `A password reset link has been sent to ${selectedUser.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to send password reset",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsPasswordResetting(false);
    }
  };
  
  // Clear the selected user
  const clearSelectedUser = () => {
    setSelectedUser(null);
    setShowUserDetails(false);
  };
  
  if (!adminUser) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Admin access required</h2>
          <p className="text-muted-foreground">Please log in as an admin to access this page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Customer Support</h2>
      </div>
      
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium">User Lookup</h3>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Find User</CardTitle>
          <CardDescription>
            Search for a user by name, username, or email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 mb-4">
            <div className="flex-1">
              <Label htmlFor="search-query">Search Query</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-query"
                  placeholder="Enter name, username, or email"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
                />
              </div>
            </div>
            <Button 
              onClick={handleUserSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </div>
          
          {showUserDetails && selectedUser && (
            <div className="bg-muted/40 p-4 rounded-lg mt-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{selectedUser.fullName || selectedUser.username}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={clearSelectedUser}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-medium">{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">{selectedUser.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subscription Status</p>
                  <div className="mt-1">
                    {selectedUser.premiumStatus === 'premium' ? (
                      <Badge className="bg-green-500 hover:bg-green-600">PREMIUM</Badge>
                    ) : (
                      <Badge variant="outline">FREE</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Industry</p>
                  <p className="font-medium">{selectedUser.industry || "Not specified"}</p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    window.location.href = `mailto:${selectedUser.email}`;
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact User
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handlePasswordReset}
                  disabled={isPasswordResetting}
                >
                  {isPasswordResetting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}