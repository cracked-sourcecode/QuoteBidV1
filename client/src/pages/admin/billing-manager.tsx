import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, CreditCard } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';

const BillingManager = () => {
  
  // Fetch placements for billing
  const { data: placements, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/placements'],
    queryFn: () => apiRequest('GET', '/api/admin/placements').then(res => res.json()),
  });
  
  // Fetch users for user display
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => apiRequest('GET', '/api/admin/users').then(res => res.json()),
  });
  
  // Billing manager with all auto-fix functionality completely removed as requested
  
  // State for dialogs
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [showBillNowDialog, setShowBillNowDialog] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [articleFile, setArticleFile] = useState<File | null>(null);
  const [articleUrl, setArticleUrl] = useState('');
  const [billingDetails, setBillingDetails] = useState<any>(null);
  const [isFetchingBillingDetails, setIsFetchingBillingDetails] = useState(false);
  
  // Handler to open billing dialog
  const handleBillingClick = (placement: any) => {
    setSelectedPlacement(placement);
    setArticleUrl(placement.articleUrl || '');
    setShowBillingDialog(true);
  };

  // Handler for file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArticleFile(e.target.files[0]);
    }
  };

  // Fix user data functionality has been removed as requested
  // This is now automatically handled by the server

  // Disabling auto-fix process entirely
  // Commenting out useEffect to prevent auto-fixing on load
  /*
  useEffect(() => {
    // This function will not run anymore as it's now commented out
    // So no more fix and no more toast notifications
    if (placements && placements.length > 0) {
      console.log("Auto-fixing user data for placements...");
      fixUserData.mutate();
    }
  }, [placements]);
  */

  // Upload file and process billing mutation - toast notifications removed
  const processBilling = useMutation({
    mutationFn: async (data: { placementId: number, articleUrl: string, file?: File }) => {
      // If there's a file to upload, create FormData
      if (data.file) {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('articleUrl', data.articleUrl);
        
        // Upload the file first
        const uploadRes = await fetch(`/api/admin/placements/${data.placementId}/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.message || 'Failed to upload article');
        }
      }
      
      // Then process the billing
      const billRes = await apiRequest('POST', `/api/admin/placements/${data.placementId}/bill`, {
        articleUrl: data.articleUrl
      });
      
      return billRes.json();
    },
    onSuccess: (data) => {
      // No toast notifications as requested
      
      // Refresh the placements list
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
    },
    onError: (error) => {
      console.error('Billing failed:', error);
    },
  });
  
  // Notify client mutation - toast notifications removed
  const notifyClient = useMutation({
    mutationFn: async (placementId: number) => {
      const res = await apiRequest('POST', `/api/admin/placements/${placementId}/notify`, {});
      return res.json();
    },
    onSuccess: (data) => {
      // Refresh the placements list
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
    },
    onError: (error) => {
      console.error('Notification failed:', error);
    },
  });
  
  // Retry billing mutation for failed payments - toast notifications removed
  const retryBilling = useMutation({
    mutationFn: async (placementId: number) => {
      const res = await apiRequest('POST', `/api/admin/placements/${placementId}/retry-billing`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setShowRetryDialog(false);
      
      // Refresh the placements list
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
    },
    onError: (error) => {
      console.error('Retry failed:', error);
    },
  });
  
  // Handler to open the retry dialog
  const handleRetryBilling = (placement: any) => {
    setSelectedPlacement(placement);
    setShowRetryDialog(true);
  };
  
  // We already fetch users at the top of the component

  // Function to get user name from id
  const getUserNameById = (userId: number) => {
    if (!users) return 'Unknown User';
    const user = users.find((u: any) => u.id === userId);
    return user ? (user.fullName || user.username) : 'Unknown User';
  };
  
  // Handler to open the bill now dialog
  const handleBillNowClick = async (placement: any) => {
    setSelectedPlacement(placement);
    setIsFetchingBillingDetails(true);
    setShowBillNowDialog(true);
    
    try {
      const response = await apiRequest('GET', `/api/admin/billing/${placement.id}`).then(res => res.json());
      setBillingDetails(response);
    } catch (error) {
      console.error('Error fetching billing details:', error);
      if (error instanceof Error) {
        toast({
          title: 'Failed to get billing details',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsFetchingBillingDetails(false);
    }
  };
  
  // Capture payment mutation
  const capturePayment = useMutation({
    mutationFn: async (placementId: number) => {
      const res = await apiRequest('POST', '/api/admin/billing/capture', { placementId });
      return res.json();
    },
    onSuccess: (data) => {
      setShowBillNowDialog(false);
      setBillingDetails(null);
      
      toast({
        title: 'Payment captured successfully',
        description: 'The customer has been billed and receipt sent',
        variant: 'default',
      });
      
      // Refresh the placements list
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/placements'] });
    },
    onError: (error) => {
      console.error('Payment capture failed:', error);
      if (error instanceof Error) {
        toast({
          title: 'Payment capture failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
  });

  // Sync successful pitches to placements - toast notifications removed
  const syncPlacements = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/sync-placements', {});
      return res.json();
    },
    onSuccess: (data) => {
      // Refresh the placements list
      refetch();
    },
    onError: (error) => {
      console.error('Sync failed:', error);
    },
  });
  
  // All references to fixUserData have been removed as requested

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Billing Manager</h1>
          <p className="text-gray-600 mt-2">Process payments for successful media placements and share with clients</p>
        </div>
        {/* Buttons removed as requested */}
      </div>
      
      {/* Analytics cards for billing overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-5">
          <h3 className="text-gray-500 text-sm mb-2">Pending Charges</h3>
          <div className="flex items-center">
            <div className="text-2xl font-bold">
              ${placements?.filter((p: any) => p.status === 'pending' || p.status === 'needs_review').reduce((acc: number, p: any) => acc + (p.amount || 0), 0).toLocaleString() || '0'}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-5">
          <h3 className="text-gray-500 text-sm mb-2">Articles Delivered</h3>
          <div className="flex items-center">
            <div className="text-2xl font-bold">
              {placements?.filter((p: any) => p.articleUrl).length || 0}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-5">
          <h3 className="text-gray-500 text-sm mb-2">Total Processed Revenue</h3>
          <div className="flex items-center">
            <div className="text-2xl font-bold text-green-600">
              ${placements?.filter((p: any) => p.status === 'paid').reduce((acc: number, p: any) => acc + (p.amount || 0), 0).toLocaleString() || '0'}
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div>Loading...</div>
      ) : !placements || placements.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-500 text-center">No placements found in the billing queue</p>
          <p className="text-sm text-gray-400 text-center mt-2">
            When pitches are marked as "Successful Coverage," they will appear here for billing
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publication</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bid Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {placements.map((placement: any) => (
                <tr key={placement.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{getUserNameById(placement.userId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{placement.publication?.name || 'Unknown Publication'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium truncate max-w-xs">{placement.articleTitle}</div>
                    <div className="text-xs text-blue-600 truncate max-w-xs">
                      <a href={placement.articleUrl} target="_blank" rel="noreferrer">{placement.articleUrl}</a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${placement.amount?.toLocaleString() || '0'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      placement.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : placement.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {placement.status === 'paid' ? 'Paid' : 
                        placement.status === 'error' ? 'Error' : 
                        'Ready for Billing'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {placement.status === 'paid' ? (
                      <span className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-50 text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {placement.notificationSent ? 'Complete' : 'Processed'}
                      </span>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="default" 
                        onClick={() => handleBillNowClick(placement)}
                        disabled={placement.status === 'error'}
                        className="ml-2 relative group overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow hover:shadow-md transition-all"
                      >
                        <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out transform translate-x-0 -skew-x-12 bg-gradient-to-r from-blue-500 to-purple-600 group-hover:translate-x-full group-hover:skew-x-12"></span>
                        <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out transform skew-x-12 bg-gradient-to-r from-purple-600 to-blue-500 group-hover:translate-x-full group-hover:-skew-x-12"></span>
                        <span className="absolute bottom-0 left-0 hidden w-10 h-20 transition-all duration-100 ease-out transform translate-y-10 bg-purple-600 group-hover:block"></span>
                        <span className="absolute inset-0 w-full h-full transition-all duration-500 ease-out transform bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 opacity-0 group-hover:opacity-100"></span>
                        <span className="relative flex items-center justify-center">
                          <CreditCard className="h-4 w-4 mr-1" /> Bill Now
                        </span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Billing Dialog */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Process Billing</DialogTitle>
            <DialogDescription>
              Complete the billing process by uploading the published article and confirming details.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlacement && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <div className="font-medium text-lg">{getUserNameById(selectedPlacement.userId)}</div>
                  <div className="text-sm text-gray-500">Account will be billed ${selectedPlacement.amount?.toLocaleString() || '0'}</div>
                </div>
                
                <div className="space-y-2">
                  <Label>Publication</Label>
                  <div className="font-medium text-lg">{selectedPlacement.publication?.name || 'Unknown Publication'}</div>
                  <div className="text-sm text-gray-500">Article: {selectedPlacement.articleTitle}</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Upload Published Article</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Upload a screenshot or PDF of the published article for record-keeping and invoice generation.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="articleFile">Article File (Screenshot/PDF)</Label>
                    <input
                      id="articleFile"
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,application/pdf"
                      className="w-full border p-2 rounded-md"
                    />
                    {articleFile && (
                      <div className="text-sm text-green-600">
                        File selected: {articleFile.name}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="articleUrl">Article URL</Label>
                    <input
                      id="articleUrl"
                      type="url"
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      placeholder="https://publication.com/article"
                      className="w-full border p-2 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Invoice Preview</h3>
                <div className="bg-gray-50 p-4 rounded-md border">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Invoice for:</span>
                    <span>{getUserNameById(selectedPlacement.userId)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Publication:</span>
                    <span>{selectedPlacement.publication?.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Article:</span>
                    <span>{selectedPlacement.articleTitle}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Amount:</span>
                    <span className="font-bold">${selectedPlacement.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Date:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    An invoice will be generated and sent to the client automatically after billing is processed.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBillingDialog(false);
                setArticleFile(null);
                setArticleUrl('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={() => {
                if (selectedPlacement) {
                  processBilling.mutate({
                    placementId: selectedPlacement.id,
                    articleUrl,
                    file: articleFile || undefined
                  });
                  setShowBillingDialog(false);
                }
              }}
              disabled={processBilling.isPending || (!articleUrl && !articleFile)}
              className="bg-qpurple hover:bg-purple-700"
            >
              {processBilling.isPending ? "Processing..." : "Process Billing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bill Now Dialog */}
      <Dialog open={showBillNowDialog} onOpenChange={setShowBillNowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-700 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
            <DialogTitle className="text-white text-xl">Process Payment</DialogTitle>
            <DialogDescription className="text-blue-100">
              Review and capture payment for this media placement.
            </DialogDescription>
          </DialogHeader>
          
          {isFetchingBillingDetails ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2">Fetching payment details...</span>
            </div>
          ) : billingDetails ? (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium">Payment will be captured immediately, but customer will only be charged once the article is delivered.</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Transaction Details
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500">Publication</Label>
                      <div className="font-medium">{billingDetails.placement.publication?.name || 'Unknown'}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Customer</Label>
                      <div className="font-medium">{getUserNameById(billingDetails.placement.userId)}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label className="text-xs text-gray-500">Article</Label>
                    <div className="text-sm font-medium truncate">{billingDetails.placement.articleTitle || 'Untitled'}</div>
                    {billingDetails.placement.articleUrl && (
                      <a href={billingDetails.placement.articleUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{billingDetails.placement.articleUrl}</a>
                    )}
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Payment Information
                  </h3>
                  
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-md border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Amount:</span>
                      <span className="text-base font-bold">${billingDetails.paymentIntent.amount}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2 text-gray-600">
                      <span className="text-sm">Processing Fee:</span>
                      <span className="text-sm">-${billingDetails.paymentIntent.stripeFee}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                      <span className="text-sm font-medium">Net Revenue:</span>
                      <span className="text-base font-bold text-green-600">${billingDetails.paymentIntent.netAmount}</span>
                    </div>
                  </div>
                  
                  {billingDetails.paymentIntent.lastFour && (
                    <div className="flex items-center gap-2 mt-4 p-2 bg-gray-50 rounded-md border border-gray-100">
                      <CreditCard className="h-5 w-5 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium">Card ending in {billingDetails.paymentIntent.lastFour}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 rounded-full capitalize">{billingDetails.paymentIntent.cardBrand}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Apple Pay option */}
                  <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-md border border-gray-100 opacity-40 cursor-not-allowed">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12.5 2c0 1.5-1.5 2-1.5 3.5 0 1.5 1 2 1 3.5s-1.5 2-1.5 3.5c0 1.5 1 2 1 3.5s-1.5 2-1.5 3.5"/>
                      <path d="M8.5 2c0 1.5-1.5 2-1.5 3.5 0 1.5 1 2 1 3.5s-1.5 2-1.5 3.5c0 1.5 1 2 1 3.5s-1.5 2-1.5 3.5"/>
                      <path d="M16.5 2c0 1.5-1.5 2-1.5 3.5 0 1.5 1 2 1 3.5s-1.5 2-1.5 3.5c0 1.5 1 2 1 3.5s-1.5 2-1.5 3.5"/>
                    </svg>
                    <div className="flex-1">
                      <span className="text-sm font-medium">Apple Pay</span>
                      <span className="ml-2 text-xs">Coming soon</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {billingDetails.paymentIntent.isExpired && (
                <div className="text-sm bg-red-50 text-red-600 p-4 rounded-md mb-3 border border-red-100">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <strong>Payment authorization expired.</strong>
                      <p>Please ask customer to place a new bid with updated payment information.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {!billingDetails.paymentIntent.isExpired && (
                <div className="text-sm bg-green-50 text-green-800 p-4 rounded-md mb-3 border border-green-100">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <strong>Payment ready to capture!</strong>
                      <p>The card has been pre-authorized and is ready for billing.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : selectedPlacement ? (
            <div className="py-6">
              <div className="text-center text-gray-500">
                Unable to fetch payment details for this placement.
              </div>
            </div>
          ) : null}
          
          <DialogFooter className="mt-4 pt-2 border-t space-x-2">
            <Button variant="outline" onClick={() => setShowBillNowDialog(false)}>
              Cancel
            </Button>
            {billingDetails && !billingDetails.paymentIntent.isExpired && (
              <Button 
                onClick={() => capturePayment.mutate(selectedPlacement?.id)}
                disabled={capturePayment.isPending || !billingDetails.paymentIntent.isReadyForCapture}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all shadow-md hover:shadow-lg"
              >
                {capturePayment.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Capture & Send Receipt
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Retry Billing Dialog */}
      <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-red-500 to-orange-600 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
            <DialogTitle className="text-white text-xl">Retry Billing</DialogTitle>
            <DialogDescription className="text-red-100">
              The previous billing attempt failed. Verify the details and try again.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlacement && (
            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-100 p-4 rounded-md mb-4">
                <div className="flex items-center gap-2 text-red-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium">The previous payment attempt failed. A new authorization will be requested.</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Customer Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-500">Customer</Label>
                      <div className="font-medium">{getUserNameById(selectedPlacement.userId)}</div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-gray-500">Publication</Label>
                      <div className="font-medium">{selectedPlacement.publication?.name || 'Unknown Publication'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Transaction Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-500">Article</Label>
                      <div className="font-medium">{selectedPlacement.articleTitle}</div>
                      {selectedPlacement.articleUrl && (
                        <a href={selectedPlacement.articleUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{selectedPlacement.articleUrl}</a>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-xs text-gray-500">Amount</Label>
                      <div className="font-medium text-lg">${selectedPlacement.amount?.toLocaleString() || '0'}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedPlacement.errorMessage && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-md">
                  <h3 className="font-medium text-red-800 mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                    </svg>
                    Previous Error Message
                  </h3>
                  <div className="text-sm text-red-600 p-3 bg-red-50 rounded-md border border-red-100">
                    {selectedPlacement.errorMessage}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="mt-4 pt-2 border-t space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowRetryDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={() => selectedPlacement && retryBilling.mutate(selectedPlacement.id)}
              disabled={retryBilling.isPending}
              className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white transition-all shadow-md hover:shadow-lg"
            >
              {retryBilling.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Retry Billing
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingManager;