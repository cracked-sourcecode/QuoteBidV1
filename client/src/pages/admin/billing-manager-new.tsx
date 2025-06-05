/* ──────────────────────────────────────────────────────────
   BillingManager – v2
   All ui components are shadcn/ui. Tailwind config unchanged.
   ────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Clock, Users, CreditCard, AlertCircle, MoreHorizontal, Search, ArrowUpRight, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


// Helper function for subscription status badges
function subscriptionStatusBadge(status: string | undefined) {
  if (!status) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-500">None</span>
      </div>
    );
  }

  const badges = {
    active: "bg-green-600 text-white",
    past_due: "bg-orange-500 text-white", 
    canceled: "bg-gray-400 text-white"
  };

  return (
    <Badge className={badges[status as keyof typeof badges] || "bg-gray-400 text-white"}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export default function BillingManagerNew() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // New invoice fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [servicePeriod, setServicePeriod] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [publicationLink, setPublicationLink] = useState("");
  
  // Success state
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch accounts receivable data (successful pitches ready to bill)
  const { data: arData, isLoading: arLoading, refetch: refetchAR } = useQuery({
    queryKey: ["accounts-receivable"],
    queryFn: async () => {
      const response = await fetch("/api/admin/pitches");
      if (!response.ok) throw new Error("Failed to fetch AR data");
      const pitches = await response.json();
      
      // Filter successful pitches that haven't been billed yet
      const successfulPitches = pitches.filter((pitch: any) => 
        (pitch.status === "successful" || 
         pitch.status === "completed" || 
         pitch.status === "placed" ||
         pitch.status === "delivered") && 
        !pitch.billedAt && // Not yet billed
        !pitch.stripeChargeId && // No charge ID means not billed
        pitch.bidAmount > 0 // Has an amount to bill
      );
      
      return successfulPitches;
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes  
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch successful placements (already billed)
  const { data: successfulData, isLoading: successfulLoading } = useQuery({
    queryKey: ["successful-placements"],
    queryFn: async () => {
      const response = await fetch("/api/admin/pitches");
      if (!response.ok) throw new Error("Failed to fetch successful placements");
      const pitches = await response.json();
      
      // Filter successfully billed pitches
      const billedPitches = pitches.filter((pitch: any) => 
        (pitch.status === "successful" || 
         pitch.status === "completed" || 
         pitch.status === "placed" ||
         pitch.status === "delivered") && 
        pitch.billedAt && // Has been billed
        pitch.stripeChargeId && // Has charge ID
        pitch.bidAmount > 0 // Has an amount
      );
      
      // Sort by billing date (newest first)
      return billedPitches.sort((a: any, b: any) => 
        new Date(b.billedAt).getTime() - new Date(a.billedAt).getTime()
      );
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch customers directory with Stripe data (for billing purposes)
  const { data: customersData } = useQuery({
    queryKey: ["customers-directory"],
    queryFn: async () => {
      const response = await fetch("/api/admin/customers-directory");
      if (!response.ok) throw new Error("Failed to fetch customers directory");
      return response.json();
    },
  });





  // Fetch customer's Stripe details
  const { data: customerDetails, isLoading: customerDetailsLoading } = useQuery({
    queryKey: ["customer-stripe-details", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return null;
      const response = await fetch(`/api/admin/customers/${selectedCustomer.id}/stripe-details`);
      if (!response.ok) throw new Error("Failed to fetch customer details");
      return response.json();
    },
    enabled: !!selectedCustomer?.id,
  });

  // Auto-select first payment method when customer details load
  useEffect(() => {
    if (customerDetails?.paymentMethods?.length > 0 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(customerDetails.paymentMethods[0].id);
    }
  }, [customerDetails, selectedPaymentMethod]);



  // Charge customer mutation
  const chargeMutation = useMutation({
    mutationFn: async ({ userId, amount, description, paymentMethodId, placementId, invoiceData }: {
      userId: number;
      amount: number;
      description: string;
      paymentMethodId: string;
      placementId?: number;
      invoiceData?: any;
    }) => {
      const response = await fetch(`/api/admin/customers/${userId}/charge-placement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, paymentMethodId, placementId, invoiceData })
      });
      if (!response.ok) throw new Error("Failed to charge customer");
      return response.json();
    },
    onSuccess: (data) => {
      console.log("✅ PAYMENT SUCCESS! Backend response:", data);
      console.log("🔄 About to refresh queries...");
      
      toast({
        title: "Payment Successful!",
        description: data.message,
      });
      
      // Immediately refresh data - pitch should now be marked as paid in database
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["successful-placements"] });
      
      // Add a small delay to ensure database write is complete, then invalidate user queries
      setTimeout(() => {
        if (selectedCustomer?.id) {
          console.log(`🔄 Invalidating user ${selectedCustomer.id} pitch data...`);
          queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedCustomer.id}/pitches`] });
          queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedCustomer.id}/billing/placement-charges`] });
          console.log("🔄 User pitch queries invalidated - data should refresh now");
        }
      }, 1000); // 1 second delay
      
      console.log("🔄 Admin queries invalidated - user queries will refresh in 1 second");
      
      // Set success state instead of closing immediately
      setPaymentSuccess({
        amount: parseFloat(paymentAmount),
        receiptUrl: data.invoice?.invoice_pdf || data.receiptUrl
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const handleChargeCustomer = (customer: any, pitch?: any) => {
    setSelectedCustomer(customer);
    setSelectedPlacement(pitch);
    setPaymentAmount(pitch?.bidAmount?.toString() || "");
    
    // Set product description: QuoteBid - Publication Name - Opportunity Title
    // Try multiple ways to get the publication name
    const publicationName = pitch?.opportunity?.publication?.name || 
                           pitch?.publication?.name || 
                           'Media Outlet';
    const productDescription = `QuoteBid - ${publicationName} - ${pitch?.opportunity?.title || 'Article Coverage'}`;
    setPaymentDescription(productDescription);
    
    // Set default invoice notes
    setInvoiceNotes(`Thank you for using QuoteBid.
We connect vetted experts with journalists—bringing transparency to pricing and clarity to the pitch process. You see the value before you commit.

Note: QuoteBid is an independent platform. We are not affiliated with any media outlet, and we do not pay reporters or influence editorial decisions. All coverage is earned at the sole discretion of the journalist.`);
    
    setPaymentSuccess(null); // Reset success state
    setSelectedPaymentMethod(""); // Reset payment method selection
    setPublicationLink(""); // Reset publication link
    setShowPaymentModal(true);
  };

  const processPayment = () => {
    if (!selectedCustomer || !paymentAmount || !paymentDescription || !selectedPaymentMethod) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);

    const invoiceData = {
      amount,
      description: paymentDescription,
      invoiceNotes,
      publicationLink
    };

    console.log("🚀 BILLING ATTEMPT - Data being sent:", {
      userId: selectedCustomer.id,
      amount: amount,
      placementId: selectedPlacement?.id,
      paymentMethodId: selectedPaymentMethod,
      hasInvoiceData: !!invoiceData
    });

    chargeMutation.mutate({
      userId: selectedCustomer.id,
      amount: amount,
      description: paymentDescription,
      paymentMethodId: selectedPaymentMethod,
      placementId: selectedPlacement?.id, // This is actually a pitch ID
      invoiceData,
    });
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setPaymentSuccess(null);
    setPublicationLink("");
  };





  const filteredAR = arData?.filter((pitch: any) => 
    pitch.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pitch.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pitch.opportunity?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredSuccessful = successfulData?.filter((pitch: any) => 
    pitch.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pitch.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pitch.opportunity?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate past-due subscriptions count
  const pastDueCount = customersData?.filter((c: any) => c.subscription?.status === 'past_due').length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Section - Always Visible */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="px-6 py-6">
          {/* Revenue Analytics Header */}
          <div className="mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Revenue Analytics</h2>
              <p className="text-sm text-gray-600">Track your revenue performance and key metrics</p>
            </div>
          </div>

          {/* MRR, A/R and Revenue Cards */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Monthly Recurring Revenue</p>
                  <p className="text-3xl font-bold mt-1">
                    ${customersData?.filter((c: any) => c.subscription?.status === 'active')
                      .reduce((sum: number, sub: any) => 
                        sum + ((sub.subscription?.items?.data[0]?.price?.unit_amount / 100) || 99), 0)
                      .toLocaleString() || '0'}
                  </p>
                  <p className="text-purple-200 text-xs mt-1">
                    from {customersData?.filter((c: any) => c.subscription?.status === 'active').length || 0} active subscriptions
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Accounts Receivable</p>
                  <p className="text-3xl font-bold mt-1">
                    ${arData?.reduce((sum: number, pitch: any) => sum + (pitch.bidAmount || 0), 0).toLocaleString() || '0'}
                  </p>
                  <p className="text-orange-200 text-xs mt-1">
                    {arData?.length || 0} pitches ready to bill
                  </p>
                </div>
                <Clock className="w-12 h-12 text-orange-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Revenue Generated</p>
                  <p className="text-3xl font-bold mt-1">
                    ${successfulData?.reduce((sum: number, pitch: any) => sum + (pitch.bidAmount || 0), 0).toLocaleString() || '0'}
                  </p>
                  <p className="text-green-200 text-xs mt-1">
                    from {successfulData?.length || 0} successful placements
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-200" />
              </div>
            </div>
          </div>



          {/* Additional KPIs */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-2xl font-semibold text-gray-900">{customersData?.length || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Subscriptions</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {customersData?.filter((c: any) => c.subscription?.status === 'active').length || 0}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Past-due Subscriptions</p>
                    <p className="text-2xl font-semibold text-gray-900">{pastDueCount}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. A/R per Item</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ${arData?.length ? 
                        Math.round((arData.reduce((sum: number, pitch: any) => sum + (pitch.bidAmount || 0), 0) || 0) / arData.length)
                        .toLocaleString() : '0'}
                    </p>
                  </div>
                  <ArrowUpRight className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Billing Manager</h1>
              <p className="text-sm text-gray-600">Manage billing for successful placements and track revenue</p>
            </div>

          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              placeholder="Search customers, emails, or placements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Billing Management Tabs */}
        <Tabs defaultValue="ready-to-bill" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ready-to-bill" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ready to Bill ({arData?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="successful" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Successful Placements ({successfulData?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Ready to Bill Tab */}
          <TabsContent value="ready-to-bill" className="space-y-6">
            {/* AR Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ready to Bill</h2>
                <p className="text-sm text-gray-600">Successful pitches ready to be billed</p>
                <p className="text-xs text-gray-500 mt-1">
                  Found {arData?.length || 0} pitches ready for billing
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total amount to bill</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${arData?.reduce((sum: number, pitch: any) => sum + (pitch.bidAmount || 0), 0).toLocaleString() || '0'}
                </p>
              </div>
            </div>

            {/* AR Cards */}
            <div className="space-y-3">
              {arLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading accounts receivable...</p>
                </div>
              ) : filteredAR.length > 0 ? (
                filteredAR.map((pitch: any) => (
                  <div key={pitch.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Status Icon */}
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white">
                          <Clock className="w-5 h-5" />
                        </div>
                        
                        {/* Pitch Info */}
                        <div>
                          <h3 className="font-semibold text-gray-900">{pitch.opportunity?.title || 'Article Coverage'}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">{pitch.user?.fullName}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{pitch.user?.email}</span>
                            {pitch.user?.company_name && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-600">{pitch.user.company_name}</span>
                              </>
                            )}
                          </div>
                          {pitch.opportunity?.publication?.name && (
                            <p className="text-xs text-gray-500 mt-1">
                              Published in {pitch.opportunity.publication.name}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                              {pitch.status} ✓
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Amount & Actions */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">AMOUNT TO BILL</p>
                          <p className="text-lg font-semibold text-orange-600">
                            ${pitch.bidAmount?.toLocaleString() || '0'}
                          </p>
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200 mt-1">
                            Ready to bill
                          </Badge>
                        </div>
                        
                        <div className="flex items-center">
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleChargeCustomer(pitch.user, pitch)}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Bill Customer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No successful pitches ready to bill</p>
                  <p className="text-sm">Successful pitches will appear here when ready for billing</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Successful Placements Tab */}
          <TabsContent value="successful" className="space-y-6">
            {/* Successful Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Successful Placements</h2>
                <p className="text-sm text-gray-600">Pitches that have been successfully billed</p>
                <p className="text-xs text-gray-500 mt-1">
                  Found {successfulData?.length || 0} successful placements
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total revenue generated</p>
                <p className="text-xl font-semibold text-green-600">
                  ${successfulData?.reduce((sum: number, pitch: any) => sum + (pitch.bidAmount || 0), 0).toLocaleString() || '0'}
                </p>
              </div>
            </div>

            {/* Successful Placement Cards */}
            <div className="space-y-3">
              {successfulLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading successful placements...</p>
                </div>
              ) : filteredSuccessful.length > 0 ? (
                filteredSuccessful.map((pitch: any) => (
                  <div key={pitch.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Status Icon */}
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        
                        {/* Pitch Info */}
                        <div>
                          <h3 className="font-semibold text-gray-900">{pitch.opportunity?.title || 'Article Coverage'}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">{pitch.user?.fullName}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{pitch.user?.email}</span>
                            {pitch.user?.company_name && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-600">{pitch.user.company_name}</span>
                              </>
                            )}
                          </div>
                          {pitch.opportunity?.publication?.name && (
                            <p className="text-xs text-gray-500 mt-1">
                              Published in {pitch.opportunity.publication.name}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                              Billed on {new Date(pitch.billedAt).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                                            {/* Amount */}
                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">AMOUNT BILLED</p>
                        <p className="text-lg font-semibold text-green-600">
                          ${pitch.bidAmount?.toLocaleString() || '0'}
                        </p>
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200 mt-1">
                          Paid
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No successful placements yet</p>
                  <p className="text-sm">Billed placements will appear here after payment is processed</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
                  
      </div>

      {/* Enhanced Invoice Modal */}
      <Dialog open={showPaymentModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader className="border-b pb-2 bg-blue-50 px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">Process Payment</DialogTitle>
                <p className="text-xs text-gray-600">Charge customer for completed work</p>
              </div>
            </div>
          </DialogHeader>
          
          {/* Success State */}
          {paymentSuccess ? (
            <div className="text-center space-y-6 py-8 px-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600"/>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
                <p className="text-base text-gray-600">
                  Charged <span className="font-semibold text-green-600">${paymentSuccess.amount.toFixed(2)}</span>
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                {paymentSuccess.receiptUrl && (
                  <Button 
                    onClick={() => window.open(paymentSuccess.receiptUrl, '_blank')} 
                    variant="outline"
                    className="h-11"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Receipt
                  </Button>
                )}
                <Button 
                  onClick={closeModal} 
                  className="h-11 bg-green-600 hover:bg-green-700 text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-4 py-3">
              {/* Customer & Amount - Combined */}
              <div className="grid grid-cols-2 gap-3">
                {/* Customer Info */}
                {selectedCustomer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {selectedCustomer.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{selectedCustomer.fullName}</p>
                        <p className="text-blue-600 text-xs">{selectedCustomer.email}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Payment Amount */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-800">${paymentAmount}</p>
                  <p className="text-green-600 text-xs">Final Amount</p>
                </div>
              </div>
              
                              {/* Service & Payment Method - Combined */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                {/* Service */}
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-1 text-xs">Service</h4>
                  <Textarea 
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="resize-none text-xs"
                    rows={2}
                  />
                </div>
                
                {/* Payment Method */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-1 text-xs">Payment Method</h4>
                  {customerDetailsLoading ? (
                    <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">Loading...</div>
                  ) : customerDetails?.paymentMethods?.length > 0 ? (
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerDetails.paymentMethods.map((pm: any) => (
                          <SelectItem key={pm.id} value={pm.id}>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-3 h-3 text-blue-600" />
                              <span className="font-medium text-xs">{pm.card.brand.toUpperCase()}</span>
                              <span className="text-gray-500 text-xs">••••{pm.card.last4}</span>
                              <span className="text-xs text-gray-400">{pm.card.exp_month}/{pm.card.exp_year}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-xs text-red-600 p-2 bg-red-50 rounded">❌ No payment methods found</div>
                  )}
                </div>
              </div>
              
              {/* Publication Link (Deliverable) */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-1 text-xs">Publication Link (Deliverable)</h4>
                <Input 
                  value={publicationLink}
                  onChange={(e) => setPublicationLink(e.target.value)}
                  placeholder="https://example.com/article-link"
                  className="text-xs h-7"
                />
                <p className="text-xs text-gray-500 mt-1">Link to the published article or content deliverable</p>
              </div>
              
              {/* Invoice Notes */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-1 text-xs">Invoice Footer</h4>
                <Textarea 
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="resize-none text-xs"
                  rows={2}
                  placeholder="Invoice terms and conditions..."
                />
              </div>
            </div>
          )}
          
          {!paymentSuccess && (
            <DialogFooter className="border-t pt-2 bg-gray-50 px-4 py-2">
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  onClick={closeModal} 
                  className="flex-1 h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={processPayment}
                  disabled={chargeMutation.isPending || !selectedPaymentMethod}
                  className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white text-xs"
                >
                  {chargeMutation.isPending ? (
                    <>
                      <AlertCircle className="w-3 h-3 mr-1 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-3 h-3 mr-1" />
                      Charge ${paymentAmount}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
} 