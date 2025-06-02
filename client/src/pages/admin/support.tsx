import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail, RefreshCw, Search, ArrowRight, Users, X, User, ChevronLeft, Shield, UserCheck } from "lucide-react";
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
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
      setSearchResults([]);
      setShowSearchResults(false);
    } else {
      setSearchResults(filteredUsers);
      setShowSearchResults(true);
      setShowUserDetails(false);
      setSelectedUser(null);
      toast({
        title: "Search completed",
        description: `Found ${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'} matching your search.`,
      });
    }
    setIsSearching(false);
  };

  // Select a user from search results
  const selectUser = (user: any) => {
    setSelectedUser(user);
    setShowUserDetails(true);
    setShowSearchResults(false);
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
    setShowSearchResults(false);
  };

  // Go back to search results
  const backToResults = () => {
    setShowUserDetails(false);
    setShowSearchResults(true);
    setSelectedUser(null);
  };
  
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="flex justify-center items-center h-96">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground text-center">Please log in as an admin to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Customer Support
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Advanced user management and support tools for administrators
          </p>
        </div>

        {/* User Search Section */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900">User Lookup</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Search and manage user accounts across the platform
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Search Bar */}
            <div className="space-y-3">
              <Label htmlFor="search-query" className="text-base font-medium text-gray-700">
                Search Query
              </Label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="search-query"
                    placeholder="Enter name, username, or email address..."
                    className="pl-12 h-14 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
                  />
                </div>
                <Button 
                  onClick={handleUserSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="h-14 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg transition-all duration-200"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Search Results ({searchResults.length})
                  </h3>
                  <Button 
                    variant="outline" 
                    onClick={clearSelectedUser}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Clear Results
                  </Button>
                </div>
                
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {searchResults.map((user) => (
                    <Card
                      key={user.id}
                      className="hover:shadow-lg cursor-pointer transition-all duration-200 border border-gray-200 hover:border-blue-300 bg-gradient-to-r from-white to-gray-50/50"
                      onClick={() => selectUser(user)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md">
                              {user.avatar ? (
                                <img 
                                  src={user.avatar} 
                                  alt={user.fullName || user.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                  <User className="w-7 h-7 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {user.fullName || user.username}
                              </h4>
                              <p className="text-base text-gray-600">{user.email}</p>
                              <p className="text-sm text-gray-500">@{user.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            {user.subscription_status === 'active' && (
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 text-sm font-medium">
                                PREMIUM
                              </Badge>
                            )}
                            <span className="text-sm text-gray-500 font-medium">ID: {user.id}</span>
                            <ChevronLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* User Details */}
            {showUserDetails && selectedUser && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div className="flex items-center space-x-4">
                    {searchResults.length > 1 && (
                      <Button 
                        variant="outline" 
                        onClick={backToResults}
                        className="text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Results
                      </Button>
                    )}
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedUser.fullName || selectedUser.username}
                    </h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 hover:bg-red-50 hover:text-red-600" 
                    onClick={clearSelectedUser}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">User ID</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedUser.id}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Username</p>
                          <p className="text-lg font-semibold text-gray-900">@{selectedUser.username}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Industry</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedUser.industry || "Not specified"}</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Email Address</p>
                          <p className="text-lg font-semibold text-gray-900">{selectedUser.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Joined Date</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {new Date(selectedUser.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Subscription Status</p>
                          <div className="mt-2">
                            {selectedUser.subscription_status === 'active' && (
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 text-base font-medium">
                                <UserCheck className="h-4 w-4 mr-2" />
                                PREMIUM ACTIVE
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 mt-8 pt-6 border-t border-blue-200">
                      <Button 
                        className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-lg"
                        onClick={() => {
                          window.location.href = `mailto:${selectedUser.email}`;
                        }}
                      >
                        <Mail className="h-5 w-5 mr-2" />
                        Contact User
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex-1 h-12 border-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 font-medium rounded-lg"
                        onClick={handlePasswordReset}
                        disabled={isPasswordResetting}
                      >
                        {isPasswordResetting ? (
                          <>
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                            Sending Reset...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-5 w-5 mr-2" />
                            Reset Password
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}