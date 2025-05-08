import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin-header";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Interface for User data
interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  agreementPdfUrl?: string;
  agreementSignedAt?: string;
}

export default function AgreementsViewer() {
  const { adminUser } = useAdminAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.fullName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  // Users with agreements
  const usersWithAgreements = filteredUsers.filter(user => user.agreementPdfUrl);
  
  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!adminUser) {
    return (
      <div className="flex justify-center items-center h-96">
        <p>Please log in as an admin to view this page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">User Agreements</h1>
            <p className="text-muted-foreground">
              View and manage signed user agreements
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, username, or email..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : usersWithAgreements.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Signed Agreements</CardTitle>
              <CardDescription>
                Viewing {usersWithAgreements.length} user{usersWithAgreements.length !== 1 ? 's' : ''} with signed agreements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Signed At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersWithAgreements.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback>{getInitials(user.fullName || user.username)}</AvatarFallback>
                          </Avatar>
                          <span>{user.fullName || user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {formatDate(user.agreementSignedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsPreviewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            asChild
                          >
                            <a href={user.agreementPdfUrl} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4 mr-1" />
                              Open PDF
                            </a>
                          </Button>
                        </div>
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
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-xl font-semibold mb-2">No agreements found</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? "No users with agreements match your search criteria." 
                  : "No users have signed agreements yet."}
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
      </div>
      
      {/* Agreement Preview Dialog */}
      {selectedUser && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Agreement Preview - {selectedUser.fullName || selectedUser.username}</DialogTitle>
              <DialogDescription>
                PDF signed on {formatDate(selectedUser.agreementSignedAt)}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 h-[70vh] w-full">
              {selectedUser.agreementPdfUrl && (
                <div className="w-full h-full flex flex-col">
                  <div className="relative w-full h-full border border-gray-200 rounded-md overflow-hidden">
                    <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-0">
                      <div className="animate-pulse flex flex-col items-center">
                        <FileText className="h-12 w-12 text-gray-300 mb-2" />
                        <span className="text-gray-400 text-sm">Loading document...</span>
                      </div>
                    </div>
                    <iframe 
                      src={selectedUser.agreementPdfUrl}
                      className="w-full h-full relative z-10 bg-white"
                      title="Agreement PDF Preview"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    <span>Agreement signed on {formatDate(selectedUser.agreementSignedAt)}</span>
                    <span className="mx-2">•</span>
                    <span>Document ID: {selectedUser.agreementPdfUrl.split('/').pop()?.replace('.pdf', '') || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button asChild variant="outline">
                <a 
                  href={selectedUser.agreementPdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Open in New Tab
                </a>
              </Button>
              <Button onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}