import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, CheckCircle, Link, Share2, FileText, ExternalLink } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const CoverageManager = () => {
  const { toast } = useToast();
  const [autoFixInProgress, setAutoFixInProgress] = useState(false);
  
  // Fetch placements for coverage management
  const { data: placements, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/placements'],
    queryFn: () => apiRequest('GET', '/api/admin/placements').then(res => res.json()),
  });
  
  // Fetch users for user display
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('GET', '/api/admin/users').then(res => res.json()),
  });
  
  // State for dialogs
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [articleFile, setArticleFile] = useState<File | null>(null);
  const [articleUrl, setArticleUrl] = useState('');
  
  // Handler to open detail dialog
  const handleViewDetails = (placement: any) => {
    setSelectedPlacement(placement);
    setShowDetailDialog(true);
  };

  // Handler to open upload dialog
  const handleUploadClick = (placement: any) => {
    setSelectedPlacement(placement);
    setArticleUrl(placement.articleUrl || '');
    setShowUploadDialog(true);
  };

  // Handler for file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArticleFile(e.target.files[0]);
    }
  };

  // Fix user data for placements
  const fixUserData = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/fix-placement-users', {});
      return res.json();
    },
    onSuccess: (data) => {
      const results = data.results;
      const totalFixed = (
        results.invalidUsers.fixed + 
        results.missingEmails.fixed + 
        results.missingStripeCustomers.fixed
      );
      
      toast({
        title: 'User Data Fixed',
        description: `Fixed ${totalFixed} issues: ${results.invalidUsers.fixed} invalid users, ${results.missingEmails.fixed} missing emails, and ${results.missingStripeCustomers.fixed} Stripe customers.`,
      });
      
      // Refresh the placements list AND user data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Fix failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  // Upload file mutation
  const uploadArticle = useMutation({
    mutationFn: async (data: { placementId: number, articleUrl: string, file?: File }) => {
      // If there's a file to upload, create FormData
      if (data.file) {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('articleUrl', data.articleUrl);
        
        // Upload the file
        const uploadRes = await fetch(`/api/admin/placements/${data.placementId}/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.message || 'Failed to upload article');
        }
        
        return uploadRes.json();
      } else {
        // Just update the URL
        const updateRes = await apiRequest('POST', `/api/admin/placements/${data.placementId}/upload`, {
          articleUrl: data.articleUrl
        });
        
        return updateRes.json();
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Article updated',
        description: 'The article information has been successfully updated.',
      });
      
      // Refresh the placements list
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
      setShowUploadDialog(false);
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Notify client mutation
  const notifyClient = useMutation({
    mutationFn: async (placementId: number) => {
      const res = await apiRequest('POST', `/api/admin/placements/${placementId}/notify`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Client notified',
        description: 'The client has been notified about their successful placement.',
      });
      
      // Refresh the placements list
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
    },
    onError: (error) => {
      toast({
        title: 'Notification failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Auto fix functionality has been removed as requested

  // Function to get user name from id
  const getUserNameById = (userId: number) => {
    if (!users) return 'Unknown User';
    const user = users.find((u: any) => u.id === userId);
    return user ? (user.fullName || user.username) : 'Unknown User';
  };

  // Function to get user email from id
  const getUserEmailById = (userId: number) => {
    if (!users) return '';
    const user = users.find((u: any) => u.id === userId);
    return user ? user.email : '';
  };

  // Sync successful pitches to placements
  const syncPlacements = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/sync-placements', {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Coverage updated',
        description: `Found ${data.totalSuccessfulPitches} successful pitches. Created ${data.newPlacements} new placement${data.newPlacements !== 1 ? 's' : ''}.`,
      });
      
      // Refresh the placements list
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  // Filter placements into groups
  const getPlacementGroups = () => {
    if (!placements) return { delivered: [], pending: [] };
    
    return {
      delivered: placements.filter((p: any) => 
        p.articleUrl && p.status !== 'error' && p.status !== 'ready_for_billing'
      ),
      pending: placements.filter((p: any) => 
        !p.articleUrl || p.status === 'error' || p.status === 'ready_for_billing'
      )
    };
  };

  const placementGroups = getPlacementGroups();

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Coverage Manager</h1>
          <p className="text-gray-600 mt-2">Manage and share successful media placements with clients</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => syncPlacements.mutate()}
            disabled={syncPlacements.isPending}
            className="bg-qpurple hover:bg-purple-700"
          >
            {syncPlacements.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Coverage
              </>
            )}
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-qpurple" />
        </div>
      ) : !placements || placements.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-500 text-center">No successful placements found</p>
          <p className="text-sm text-gray-400 text-center mt-2">
            When pitches are marked as "Successful Coverage," they will appear here for client notification
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Delivered Coverage Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Delivered Coverage
            </h2>
            
            {placementGroups.delivered.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-500 text-center">No delivered coverage found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {placementGroups.delivered.map((placement: any) => (
                  <div key={placement.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-grow">
                          <div className="font-semibold mb-1 truncate">{placement.articleTitle}</div>
                          <div className="text-sm text-gray-600 mb-2">{placement.publication?.name || 'Unknown Publication'}</div>
                        </div>
                        <Badge className={`ml-2 ${placement.notificationSent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {placement.notificationSent ? 'Notified' : 'Ready to Share'}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-500 mb-2">
                        <span className="font-medium">Client:</span> {getUserNameById(placement.userId)}
                      </div>
                      
                      {placement.articleUrl && (
                        <div className="text-sm mb-4 truncate">
                          <a 
                            href={placement.articleUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {placement.articleUrl}
                          </a>
                        </div>
                      )}
                      
                      <div className="mt-4 flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(placement)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        
                        {!placement.notificationSent && (
                          <Button 
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                            onClick={() => notifyClient.mutate(placement.id)}
                            disabled={notifyClient.isPending}
                          >
                            <Share2 className="h-4 w-4 mr-1" />
                            {notifyClient.isPending ? "Sharing..." : "Share with Client"}
                          </Button>
                        )}
                        
                        {placement.notificationSent && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-green-600"
                            disabled
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Shared
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Pending Coverage Section */}
          {placementGroups.pending.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Loader2 className="h-5 w-5 mr-2 text-amber-600" />
                Pending Coverage
              </h2>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publication</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bid Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {placementGroups.pending.map((placement: any) => (
                      <tr key={placement.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{getUserNameById(placement.userId)}</div>
                          <div className="text-xs text-gray-500">{getUserEmailById(placement.userId)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{placement.publication?.name || 'Unknown Publication'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium truncate max-w-xs">{placement.articleTitle || 'Untitled Article'}</div>
                          {placement.articleUrl && (
                            <div className="text-xs text-blue-600 truncate max-w-xs">
                              <a href={placement.articleUrl} target="_blank" rel="noreferrer">{placement.articleUrl}</a>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${placement.amount?.toLocaleString() || '0'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            placement.articleUrl 
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {placement.articleUrl ? 'Needs Review' : 'Missing URL'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button 
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-600"
                            onClick={() => handleUploadClick(placement)}
                          >
                            <Link className="h-4 w-4 mr-1" />
                            {placement.articleUrl ? 'Update URL' : 'Add URL'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Coverage Details</DialogTitle>
            <DialogDescription>
              Review the details of this successful media placement.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlacement && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <div className="text-lg font-medium">
                    {getUserNameById(selectedPlacement.userId)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {getUserEmailById(selectedPlacement.userId)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Publication</Label>
                  <div className="text-lg font-medium">
                    {selectedPlacement.publication?.name || 'Unknown Publication'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Article Title</Label>
                <div className="text-lg font-medium">
                  {selectedPlacement.articleTitle || 'Untitled Article'}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Bid Amount</Label>
                <div className="text-lg font-medium">
                  ${selectedPlacement.amount?.toLocaleString() || '0'}
                </div>
              </div>
              
              {selectedPlacement.articleUrl && (
                <div className="space-y-2">
                  <Label>Published Article URL</Label>
                  <div className="text-blue-600 break-all">
                    <a 
                      href={selectedPlacement.articleUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="hover:underline flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1 flex-shrink-0" />
                      {selectedPlacement.articleUrl}
                    </a>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center">
                  <Badge className={`${
                    selectedPlacement.notificationSent 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedPlacement.notificationSent ? 'Shared with Client' : 'Ready to Share'}
                  </Badge>
                  
                  {selectedPlacement.notificationSent && (
                    <span className="text-sm text-gray-500 ml-2">
                      Shared on {new Date(selectedPlacement.notificationSentAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              {!selectedPlacement.notificationSent && (
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <h4 className="text-yellow-800 font-medium mb-2">Client Notification</h4>
                  <p className="text-yellow-700 text-sm">
                    This coverage has not yet been shared with the client. Use the "Share with Client" button to notify them.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
            >
              Close
            </Button>
            
            {selectedPlacement && !selectedPlacement.notificationSent && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  notifyClient.mutate(selectedPlacement.id);
                  setShowDetailDialog(false);
                }}
                disabled={notifyClient.isPending}
              >
                <Share2 className="h-4 w-4 mr-2" />
                {notifyClient.isPending ? "Sharing..." : "Share with Client"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Coverage URL</DialogTitle>
            <DialogDescription>
              Add or update the URL for this media placement.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlacement && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <div className="text-lg font-medium">
                  {getUserNameById(selectedPlacement.userId)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Publication</Label>
                <div className="text-lg font-medium">
                  {selectedPlacement.publication?.name || 'Unknown Publication'}
                </div>
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="articleUrl">Published Article URL</Label>
                <Input
                  id="articleUrl"
                  type="url"
                  value={articleUrl}
                  onChange={(e) => setArticleUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="articleFile">Upload Article PDF/Screenshot (optional)</Label>
                <Input
                  id="articleFile"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <p className="text-sm text-gray-500">
                  For your records. This file will be attached to the client's account.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setArticleFile(null);
                setArticleUrl('');
                setShowUploadDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedPlacement && uploadArticle.mutate({
                placementId: selectedPlacement.id,
                articleUrl,
                file: articleFile || undefined
              })}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={uploadArticle.isPending || !articleUrl}
            >
              {uploadArticle.isPending ? "Updating..." : "Save Coverage URL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoverageManager;