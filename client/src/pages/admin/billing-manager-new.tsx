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
import { DollarSign, Clock, Users, CreditCard, Check, AlertCircle, MoreHorizontal, Search, Plus, ArrowUpRight } from "lucide-react";
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
  const { toast } = useToast();

  // Fetch accounts receivable data (successful placements ready to bill)
  const { data: arData, isLoading: arLoading, refetch: refetchAR } = useQuery({
    queryKey: ["accounts-receivable", Math.floor(Date.now() / 5000)],
    queryFn: async () => {
      const timestamp = Date.now();
      const response = await fetch(`/api/admin/pitches?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
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
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true
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
    mutationFn: async ({ userId, amount, description, paymentMethodId, placementId }: {
      userId: number;
      amount: number;
      description: string;
      paymentMethodId: string;
      placementId?: number;
    }) => {
      const response = await fetch(`/api/admin/customers/${userId}/charge-placement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, paymentMethodId, placementId })
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

    chargeMutation.mutate({
      userId: selectedCustomer.id,
      amount: parseFloat(paymentAmount),
      description: paymentDescription,
      paymentMethodId: selectedPaymentMethod,
      placementId: selectedPlacement?.id,
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
                <button 
                  onClick={() => setActiveTab("invoices")}
                  className={`text-sm font-medium transition-colors ${
                    activeTab === "invoices" 
                      ? "text-blue-600 border-b-2 border-blue-600 pb-2" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Invoices
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
                    <p className="text-sm text-gray-600">Revenue this month</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ${((customersData?.filter((c: any) => c.subscription).length || 0) * 99).toLocaleString()}
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

        {/* Payments Tab - Outstanding Charges */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            {/* Outstanding Charges Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Outstanding charges</h2>
                <p className="text-sm text-gray-600">Successful placements ready to charge</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total amount</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${arData?.reduce((sum: number, item: any) => sum + (item.bidAmount || 0), 0).toLocaleString() || '0'}
                </p>
              </div>
            </div>

            {/* Payment Cards */}
            <div className="space-y-3">
              {arLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading payment data...</p>
                </div>
              ) : filteredAR.length > 0 ? (
                filteredAR.map((item: any) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Publication Icon */}
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                          {item.opportunity?.publication?.name?.charAt(0) || 'P'}
                        </div>
                        
                        {/* Placement Info */}
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.opportunity?.title || 'Media Coverage'}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">{item.user?.fullName}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{item.opportunity?.publication?.name}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Successful on {item.successfulAt ? 
                              new Date(item.successfulAt).toLocaleDateString() : 
                              new Date(item.updatedAt).toLocaleDateString()
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Charge Amount & Action */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">CHARGE AMOUNT</p>
                          <p className="text-lg font-semibold text-gray-900">
                            ${item.bidAmount?.toLocaleString() || '0'}
                          </p>
                        </div>
                        
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleChargeCustomer(item.user, item)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Charge now
                          <ArrowUpRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No outstanding charges</p>
                  <p className="text-sm">Successful placements will appear here when ready to bill</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Invoice history coming soon</p>
            <p className="text-sm">All processed payments and invoices will appear here</p>
          </div>
        )}
      </div>

      {/* Stripe-style Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-lg font-semibold">Create a new payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Customer Info */}
            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {selectedCustomer.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedCustomer.fullName}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>
              </div>
            )}
            
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
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
            
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment method</label>
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
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <Textarea 
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                placeholder="Yahoo Finance Article Coverage"
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
                  Create payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 