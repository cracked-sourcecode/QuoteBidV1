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

    if (!publicationLink.trim()) {
      toast({
        title: "Publication Link Required",
        description: "Please provide the published article link before processing payment",
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
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">Revenue Management</span>
              </h1>
              <p className="text-slate-300 text-lg">Track performance and manage billing for successful placements</p>
            </div>
          </div>

          {/* Revenue Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">
                    ${customersData?.filter((c: any) => c.subscription?.status === 'active')
                      .reduce((sum: number, sub: any) => 
                        sum + ((sub.subscription?.items?.data[0]?.price?.unit_amount / 100) || 99), 0)
                      .toLocaleString() || '0'}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Monthly Recurring Revenue</h3>
                  <p className="text-purple-100 text-sm">
                    from {customersData?.filter((c: any) => c.subscription?.status === 'active').length || 0} active subscriptions
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">
                      ${arData?.reduce((sum: number, pitch: any) => sum + (pitch.bidAmount || 0), 0).toLocaleString() || '0'}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Accounts Receivable</h3>
                  <p className="text-orange-100 text-sm">{arData?.length || 0} pitches ready to bill</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">
                      ${successfulData?.reduce((sum: number, pitch: any) => sum + (pitch.bidAmount || 0), 0).toLocaleString() || '0'}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Total Revenue Generated</h3>
                  <p className="text-green-100 text-sm">from {successfulData?.length || 0} successful placements</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                  <p className="text-slate-400 text-sm">Total Customers</p>
                  <p className="text-2xl font-bold text-white">{customersData?.length || 0}</p>
                  </div>
                <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                  <p className="text-slate-400 text-sm">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-white">
                      {customersData?.filter((c: any) => c.subscription?.status === 'active').length || 0}
                    </p>
                  </div>
                <CreditCard className="h-8 w-8 text-green-400" />
                </div>
              </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                  <p className="text-slate-400 text-sm">Past-due Subscriptions</p>
                  <p className="text-2xl font-bold text-white">{pastDueCount}</p>
                  </div>
                <AlertCircle className="h-8 w-8 text-orange-400" />
                </div>
              </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                  <p className="text-slate-400 text-sm">Avg. A/R per Item</p>
                  <p className="text-2xl font-bold text-white">
                      ${arData?.length ? 
                        Math.round((arData.reduce((sum: number, pitch: any) => sum + (pitch.bidAmount || 0), 0) || 0) / arData.length)
                        .toLocaleString() : '0'}
                    </p>
                  </div>
                <ArrowUpRight className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

        {/* Main Content */}
        <div className="bg-slate-800/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-slate-700/50 p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Billing Management</h2>
                <p className="text-slate-300">Process payments and track successful placements</p>
      </div>

        {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
                  className="pl-10 bg-slate-800/50 border-white/20 text-white placeholder-slate-400 w-full max-w-md"
                  placeholder="Search customers, emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
              </div>
          </div>
        </div>

          <div className="p-6">
        {/* Billing Management Tabs */}
        <Tabs defaultValue="ready-to-bill" className="space-y-6">
              <TabsList className="bg-slate-800/50 border border-white/20">
                <TabsTrigger value="ready-to-bill" className="flex items-center gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <Clock className="w-4 h-4" />
              Ready to Bill ({arData?.length || 0})
            </TabsTrigger>
                <TabsTrigger value="successful" className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <CheckCircle className="w-4 h-4" />
              Successful Placements ({successfulData?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Ready to Bill Tab */}
              <TabsContent value="ready-to-bill" className="space-y-4">
              {arLoading ? (
                  <div className="text-center py-12 text-slate-400">
                    <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading accounts receivable...</p>
                </div>
              ) : filteredAR.length > 0 ? (
                filteredAR.map((pitch: any) => (
                    <div key={pitch.id} className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-white/10 p-5 hover:border-amber-500/50 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Clock className="w-6 h-6" />
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-white text-lg mb-1">{pitch.opportunity?.title || 'Article Coverage'}</h3>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                              <span className="font-medium">{pitch.user?.fullName}</span>
                              <span className="text-slate-500">•</span>
                              <span>{pitch.user?.email}</span>
                              {pitch.opportunity?.publication?.name && (
                              <>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-amber-400">{pitch.opportunity.publication.name}</span>
                              </>
                            )}
                          </div>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mt-2 text-xs">
                              {pitch.status} ✓
                            </Badge>
                        </div>
                      </div>
                      
                        <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Amount to Bill</p>
                            <p className="text-2xl font-bold text-amber-400">
                            ${pitch.bidAmount?.toLocaleString() || '0'}
                          </p>
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs mt-1">
                            Ready to bill
                          </Badge>
                        </div>
                        
                          <Button 
                            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium px-6"
                            onClick={() => handleChargeCustomer(pitch.user, pitch)}
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Bill Customer
                          </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Clock className="w-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No pitches ready to bill</p>
                  <p className="text-sm">Successful pitches will appear here when ready for billing</p>
                </div>
              )}
          </TabsContent>

          {/* Successful Placements Tab */}
              <TabsContent value="successful" className="space-y-4">
              {successfulLoading ? (
                  <div className="text-center py-12 text-slate-400">
                  <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading successful placements...</p>
                </div>
              ) : filteredSuccessful.length > 0 ? (
                filteredSuccessful.map((pitch: any) => (
                    <div key={pitch.id} className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-white/10 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-white text-lg mb-1">{pitch.opportunity?.title || 'Article Coverage'}</h3>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                              <span className="font-medium">{pitch.user?.fullName}</span>
                              <span className="text-slate-500">•</span>
                              <span>{pitch.user?.email}</span>
                              {pitch.opportunity?.publication?.name && (
                              <>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-green-400">{pitch.opportunity.publication.name}</span>
                              </>
                            )}
                          </div>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mt-2 text-xs">
                              Billed on {new Date(pitch.billedAt).toLocaleDateString()}
                            </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right">
                          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Amount Billed</p>
                          <p className="text-2xl font-bold text-green-400">
                          ${pitch.bidAmount?.toLocaleString() || '0'}
                        </p>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs mt-1">
                          Paid
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No successful placements yet</p>
                  <p className="text-sm">Billed placements will appear here after payment is processed</p>
                </div>
              )}
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </div>

      {/* Enhanced Invoice Modal */}
      <Dialog open={showPaymentModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-lg bg-slate-900 border border-white/20">
          <DialogHeader className="border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Process Payment</DialogTitle>
                <p className="text-xs text-slate-400">Charge customer for completed work</p>
              </div>
            </div>
          </DialogHeader>
          
          {/* Success State */}
          {paymentSuccess ? (
            <div className="text-center space-y-4 py-6 px-4">
              <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400"/>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Payment Successful!</h3>
                <p className="text-sm text-slate-300">
                  Charged <span className="font-semibold text-green-400">${paymentSuccess.amount.toFixed(2)}</span>
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                {paymentSuccess.receiptUrl && (
                  <Button 
                    onClick={() => window.open(paymentSuccess.receiptUrl, '_blank')} 
                    variant="outline"
                    size="sm"
                    className="bg-slate-800 border-white/20 text-white hover:bg-slate-700"
                  >
                    <FileText className="w-3 w-3 mr-1" />
                    Receipt
                  </Button>
                )}
                <Button 
                  onClick={closeModal} 
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-4 py-3">
              {/* Customer & Amount */}
              <div className="grid grid-cols-2 gap-3">
                {selectedCustomer && (
                  <div className="bg-slate-800/50 border border-white/10 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {selectedCustomer.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-white text-xs">{selectedCustomer.fullName}</p>
                        <p className="text-amber-400 text-xs">{selectedCustomer.email}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-slate-800/50 border border-white/10 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-400">${paymentAmount}</p>
                  <p className="text-slate-400 text-xs">Final Amount</p>
                </div>
              </div>
              
              {/* Service Description */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-3">
                <h4 className="font-medium text-white mb-2 text-xs">Service Description</h4>
                  <Textarea 
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                  className="bg-slate-900/50 border-white/20 text-white placeholder-slate-400 resize-none text-xs h-12"
                  placeholder="QuoteBid - Publication - Article Title"
                  />
                </div>
                
                {/* Payment Method */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-3">
                <h4 className="font-medium text-white mb-2 text-xs">Payment Method</h4>
                  {customerDetailsLoading ? (
                  <div className="text-xs text-slate-400 p-2 bg-slate-900/50 border border-white/10 rounded">Loading...</div>
                  ) : customerDetails?.paymentMethods?.length > 0 ? (
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger className="bg-slate-900/50 border-white/20 text-white h-8 text-xs">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                        {customerDetails.paymentMethods.map((pm: any) => (
                        <SelectItem key={pm.id} value={pm.id} className="text-white hover:bg-slate-700 text-xs">
                            <div className="flex items-center gap-2">
                            <CreditCard className="w-3 h-3 text-amber-400" />
                            <span className="font-medium">{pm.card.brand.toUpperCase()}</span>
                            <span className="text-slate-400">••••{pm.card.last4}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                  <div className="text-xs text-red-400 p-2 bg-red-500/10 border border-red-500/20 rounded">❌ No payment methods found</div>
                  )}
              </div>
              
              {/* Publication Link - Required */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-3">
                <h4 className="font-medium text-white mb-2 text-xs flex items-center gap-1">
                  Publication Link <span className="text-red-400">*</span>
                </h4>
                <Input 
                  value={publicationLink}
                  onChange={(e) => setPublicationLink(e.target.value)}
                  placeholder="https://example.com/published-article"
                  className="bg-slate-900/50 border-white/20 text-white placeholder-slate-400 h-8 text-xs"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Required: Link to published article</p>
              </div>
              
              {/* Invoice Notes - Collapsed */}
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-3">
                <h4 className="font-medium text-white mb-2 text-xs">Invoice Footer</h4>
                <Textarea 
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="bg-slate-900/50 border-white/20 text-white placeholder-slate-400 resize-none text-xs h-16"
                  placeholder="Invoice terms and conditions..."
                />
              </div>
            </div>
          )}
          
          {!paymentSuccess && (
            <DialogFooter className="border-t border-white/10 pt-3 pb-2">
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  onClick={closeModal} 
                  size="sm"
                  className="flex-1 bg-slate-800 border-white/20 text-white hover:bg-slate-700 text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={processPayment}
                  disabled={chargeMutation.isPending || !selectedPaymentMethod || !publicationLink.trim()}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs"
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