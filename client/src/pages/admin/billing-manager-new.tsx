import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Clock, Users, CreditCard, Check, AlertCircle, MoreHorizontal, Search, Plus, ArrowUpRight, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BillingManagerNew() {
  const [activeTab, setActiveTab] = useState("customers");
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
  
  const { toast } = useToast();

  // Fetch accounts receivable data (successful placements ready to bill)
  const { data: arData, isLoading: arLoading, refetch: refetchAR } = useQuery({
    queryKey: ["accounts-receivable"],
    queryFn: async () => {
      const response = await fetch("/api/admin/pitches");
      if (!response.ok) throw new Error("Failed to fetch AR data");
      const pitches = await response.json();
      
      const successfulPitches = pitches.filter((pitch: any) => 
        (pitch.status === "accepted" || 
         pitch.status === "successful" || 
         pitch.status === "completed" || 
         pitch.status === "placed" ||
         pitch.status === "delivered" ||
         pitch.status === "successfully delivered" ||
         pitch.status === "success") && 
        !pitch.billingStatus
      );
      
      return successfulPitches;
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes  
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch successful Stripe payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["successful-payments"],
    queryFn: async () => {
      const response = await fetch("/api/admin/payments/successful?limit=50");
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
  });

  // Fetch customers directory with Stripe data
  const { data: customersData, isLoading: customersLoading } = useQuery({
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
      toast({
        title: "Payment Successful!",
        description: data.message,
      });
      setShowPaymentModal(false);
      refetchAR();
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChargeCustomer = (customer: any, placement?: any) => {
    setSelectedCustomer(customer);
    setSelectedPlacement(placement);
    setPaymentAmount(placement?.bidAmount?.toString() || "");
    setPaymentDescription(placement ? 
      `${placement.opportunity?.title || 'Article Coverage'}` : 
      "QuoteBid Service Charge"
    );
    
    // Auto-generate invoice number
    const now = new Date();
    const invoiceNum = `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setInvoiceNumber(invoiceNum);
    
    // Set service period to current month
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    setServicePeriod(`${monthNames[now.getMonth()]} ${now.getFullYear()}`);
    
    // Set default notes based on placement
    if (placement) {
      setInvoiceNotes(`Media placement services for "${placement.opportunity?.title || 'article'}" published in ${placement.opportunity?.publication?.name || 'publication'}.`);
    } else {
      setInvoiceNotes("QuoteBid platform services and media placement facilitation.");
    }
    
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

    // Calculate total with tax
    const subtotal = parseFloat(paymentAmount);
    const tax = subtotal * parseFloat(taxRate) / 100;
    const total = subtotal + tax;

    const invoiceData = {
      invoiceNumber,
      servicePeriod,
      invoiceNotes,
      taxRate: parseFloat(taxRate),
      subtotal,
      tax,
      total
    };

    chargeMutation.mutate({
      userId: selectedCustomer.id,
      amount: total, // Use total amount including tax
      description: paymentDescription,
      paymentMethodId: selectedPaymentMethod,
      placementId: selectedPlacement?.id,
      invoiceData,
    });
  };

  const filteredCustomers = customersData?.filter((customer: any) => 
    customer.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredAR = arData?.filter((item: any) => 
    item.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.opportunity?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredPayments = paymentsData?.filter((payment: any) => 
    payment.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header matching admin portal style */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
              <nav className="flex items-center gap-6">
                <button 
                  onClick={() => setActiveTab("customers")}
                  className={`text-sm font-medium transition-colors ${
                    activeTab === "customers" 
                      ? "text-blue-600 border-b-2 border-blue-600 pb-2" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Customers
                </button>
                <button 
                  onClick={() => setActiveTab("payments")}
                  className={`text-sm font-medium transition-colors ${
                    activeTab === "payments" 
                      ? "text-blue-600 border-b-2 border-blue-600 pb-2" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Payments
                </button>

              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create payment
              </Button>
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

        {/* Customers Tab */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total customers</p>
                    <p className="text-2xl font-semibold text-gray-900">{customersData?.length || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active subscriptions</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {customersData?.filter((c: any) => c.subscription).length || 0}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ${paymentsData?.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0).toLocaleString() || '0'}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending charges</p>
                    <p className="text-2xl font-semibold text-gray-900">{arData?.length || 0}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Customer Cards */}
            <div className="space-y-3">
              {customersLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading customers...</p>
                </div>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer: any) => (
                  <div key={customer.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {customer.fullName?.charAt(0) || 'U'}
                        </div>
                        
                        {/* Customer Info */}
                        <div>
                          <h3 className="font-semibold text-gray-900">{customer.fullName}</h3>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                          {customer.company_name && (
                            <p className="text-xs text-gray-500">{customer.company_name}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Customer Stats */}
                      <div className="flex items-center gap-8">
                        {/* Subscription */}
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">SUBSCRIPTION</p>
                          {customer.subscription ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 font-medium">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-sm text-gray-500">None</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Payment Method */}
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">PAYMENT METHOD</p>
                          {customer.primaryPaymentMethod ? (
                            <div className="flex items-center gap-1 text-sm text-gray-900">
                              <CreditCard className="w-3 h-3" />
                              <span>{customer.primaryPaymentMethod.card.brand.toUpperCase()}</span>
                              <span className="text-gray-500">••••{customer.primaryPaymentMethod.card.last4}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">None</span>
                          )}
                        </div>
                        
                        {/* Total Spent */}
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">TOTAL SPENT</p>
                          <p className="text-sm text-gray-900 font-medium">
                            ${customer.subscription ? 
                              ((customer.subscription.items.data[0]?.price?.unit_amount / 100) || 99).toFixed(2) : 
                              '0.00'
                            }
                          </p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            onClick={() => handleChargeCustomer(customer)}
                          >
                            Create charge
                          </Button>
                          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No customers found</p>
                  <p className="text-sm">Customers will appear here when they sign up</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments Tab - Successful Stripe Payments */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            {/* Successful Payments Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Successful payments</h2>
                <p className="text-sm text-gray-600">All completed and paid transactions from Stripe</p>
                <p className="text-xs text-gray-500 mt-1">
                  Found {paymentsData?.length || 0} successful payments
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total revenue</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${paymentsData?.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0).toLocaleString() || '0'}
                </p>
              </div>
            </div>

            {/* Payment Cards */}
            <div className="space-y-3">
              {paymentsLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading payment data...</p>
                </div>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((payment: any) => (
                  <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Success Icon */}
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                          <Check className="w-5 h-5" />
                        </div>
                        
                        {/* Payment Info */}
                        <div>
                          <h3 className="font-semibold text-gray-900">{payment.description}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">{payment.user?.fullName}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{payment.user?.email}</span>
                            {payment.user?.company_name && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-600">{payment.user.company_name}</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Paid on {new Date(payment.created).toLocaleDateString()} at {new Date(payment.created).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Amount & Actions */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">AMOUNT PAID</p>
                          <p className="text-lg font-semibold text-green-600">
                            ${payment.amount?.toLocaleString()} {payment.currency?.toUpperCase()}
                          </p>
                          <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200 mt-1">
                            {payment.status} ✓
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {payment.receiptUrl && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              onClick={() => window.open(payment.receiptUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Receipt
                            </Button>
                          )}
                          {payment.invoiceId && (
                            <Button 
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => window.open(`/api/admin/invoices/${payment.invoiceId}/download`, '_blank')}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Invoice
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No successful payments found</p>
                  <p className="text-sm">Completed payments will appear here when customers are charged</p>
                </div>
              )}
            </div>
          </div>
        )}

        
      </div>

      {/* Stripe-style Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-lg font-semibold">Create Invoice & Process Payment</DialogTitle>
            <p className="text-sm text-gray-600">Generate a professional invoice and charge the customer</p>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {/* Customer Info */}
            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {selectedCustomer.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedCustomer.fullName}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                  {selectedCustomer.company_name && (
                    <p className="text-xs text-gray-500">{selectedCustomer.company_name}</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Invoice Details Section */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Invoice Details
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Invoice Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <Input 
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="INV-2024-001"
                  />
                </div>
                
                {/* Service Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Period</label>
                  <Input 
                    value={servicePeriod}
                    onChange={(e) => setServicePeriod(e.target.value)}
                    className="text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="December 2024"
                  />
                </div>
              </div>
            </div>
            
            {/* Amount & Tax Section */}
            <div className="grid grid-cols-3 gap-4">
              {/* Amount */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtotal Amount</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="pl-7 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="250.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">USD</span>
                  </div>
                </div>
              </div>
              
              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax %</label>
                <Input 
                  type="number" 
                  step="0.1"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            
            {/* Total Display */}
            {paymentAmount && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span>Subtotal:</span>
                  <span>${parseFloat(paymentAmount || "0").toFixed(2)}</span>
                </div>
                {parseFloat(taxRate) > 0 && (
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Tax ({taxRate}%):</span>
                    <span>${(parseFloat(paymentAmount || "0") * parseFloat(taxRate) / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-semibold text-base border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>${(parseFloat(paymentAmount || "0") * (1 + parseFloat(taxRate) / 100)).toFixed(2)}</span>
                </div>
              </div>
            )}
            
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              {customerDetailsLoading ? (
                <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">Loading payment methods...</div>
              ) : customerDetails?.paymentMethods?.length > 0 ? (
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerDetails.paymentMethods.map((pm: any) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span className="font-medium">{pm.card.brand.toUpperCase()}</span>
                          <span className="text-gray-500">••••{pm.card.last4}</span>
                          <span className="text-sm text-gray-400">{pm.card.exp_month}/{pm.card.exp_year}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-red-600 p-3 bg-red-50 rounded">No payment methods found for this customer</div>
              )}
            </div>
            
            {/* Service Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
              <Textarea 
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                placeholder="Yahoo Finance Article Coverage"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                rows={2}
              />
            </div>
            
            {/* Invoice Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Notes</label>
              <Textarea 
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Additional notes or terms for this invoice..."
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="border-gray-300">
              Cancel
            </Button>
            <Button 
              onClick={processPayment}
              disabled={chargeMutation.isPending || !selectedPaymentMethod}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {chargeMutation.isPending ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Invoice & Charge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 