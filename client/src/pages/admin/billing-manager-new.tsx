import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Loader2, 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Search,
  User,
  Building2,
  Calendar,
  TrendingUp,
  Target
} from "lucide-react";

/**
 * -----------------------------------------
 * BillingManager (Admin) - New Version
 *
 * Post-Delivery Billing Flow
 * -----------------------------------------
 * 1. Fetch successful pitches (not yet billed)
 * 2. Admin opens charge drawer → sees user's default + backup cards
 * 3. Select card → Charge exact winning bid (single click)
 * 4. Stripe off-session charge → update status
 * -----------------------------------------
 */

interface Pitch {
  id: string;
  publication: {
    id: number;
    name: string;
    logo?: string;
  };
  title: string;
  customerName: string;
  customerAvatarUrl?: string;
  userId: string;
  bidAmount: number;
  billed: boolean;
  createdAt: string;
  updatedAt?: string;
  status: 'successful' | 'sent' | 'pending';
  user?: {
    id: number;
    fullName: string;
    email: string;
    avatar?: string;
    company_name?: string;
  };
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  isDefault: boolean;
}

export default function BillingManagerNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(false);

  /** ---------------- Fetch Successful Pitches Ready for Billing --------------- */
  const { data: pitches = [], isLoading: loading, error } = useQuery({
    queryKey: ["/api/admin/billing/ready"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/billing/ready");
      if (!res.ok) {
        throw new Error(`Failed to fetch billing data: ${res.status}`);
      }
      return res.json();
    },
    retry: 2,
  });

  /** ---------------- Charge Mutation --------------- */
  const chargeMutation = useMutation({
    mutationFn: async ({ placementId, paymentMethodId }: { placementId: string; paymentMethodId: string }) => {
      const response = await fetch("/api/admin/billing/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ placementId, paymentMethodId }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/ready"] });
      setSelectedPitch(null);
      setSelectedMethod(null);
      toast({
        title: "✅ Payment Successful",
        description: "Customer has been charged successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Payment Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  /** ---------------- Derived Statistics ------------------ */
  const stats = useMemo(() => {
    const pending = pitches.filter((p: Pitch) => !p.billed);
    const completed = pitches.filter((p: Pitch) => p.billed);
    const sum = (arr: Pitch[]) => arr.reduce((acc, p) => acc + p.bidAmount, 0);
    return {
      pendingCount: pending.length,
      pendingTotal: sum(pending),
      completedCount: completed.length,
      completedTotal: sum(completed),
      totalRevenue: sum(pitches),
    };
  }, [pitches]);

  /** ---------------- Filtered Pitches ------------------ */
  const filteredPitches = useMemo(() => {
    const term = search.toLowerCase();
    return pitches.filter((p: Pitch) =>
      [
        p.publication?.name,
        p.title,
        p.customerName || p.user?.fullName,
        p.user?.email,
        p.user?.company_name
      ].some((field) => field?.toLowerCase().includes(term))
    );
  }, [pitches, search]);

  /** ---------------- Load Payment Methods -------------- */
  async function openBillingDrawer(pitch: Pitch) {
    setSelectedPitch(pitch);
    setMethods([]);
    setSelectedMethod(null);
    setLoadingMethods(true);
    
    try {
      const res = await apiRequest("GET", `/api/admin/billing/payment-methods?userId=${pitch.userId}`);
      if (!res.ok) {
        throw new Error(`Failed to load payment methods: ${res.status}`);
      }
      const paymentMethods: PaymentMethod[] = await res.json();
      setMethods(paymentMethods);
      
      // Auto-select default card or first available
      if (paymentMethods.length > 0) {
        const defaultCard = paymentMethods.find((m) => m.isDefault);
        setSelectedMethod(defaultCard?.id || paymentMethods[0].id);
      }
    } catch (error: any) {
      toast({ 
        title: "Failed to load payment methods", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoadingMethods(false);
    }
  }

  /** ---------------- Handle Charge --------------- */
  const handleCharge = () => {
    if (!selectedPitch || !selectedMethod) return;
    
    chargeMutation.mutate({
      placementId: selectedPitch.id,
      paymentMethodId: selectedMethod,
    });
  };

  /** ---------------- Loading State ------------------- */
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="text-lg font-medium text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  /** ---------------- Error State ------------------- */
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center py-12">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Target className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Billing Data</h3>
              <p className="text-sm text-gray-600 mb-4">{error.message}</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/ready"] })}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /** ---------------- Main Render ------------------- */
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">💳 Billing Manager</h1>
        <p className="text-lg text-gray-600">
          Process payments for successful media placements and manage client billing
        </p>
      </div>

      {/* ---------- Metrics Cards ---------- */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Pending Charges" 
          value={stats.pendingCount} 
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          trend="pending"
        />
        <StatCard 
          label="Pending Revenue" 
          value={`$${stats.pendingTotal.toLocaleString()}`} 
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          trend="pending"
        />
        <StatCard 
          label="Charges Processed" 
          value={stats.completedCount} 
          icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
          trend="completed"
        />
        <StatCard 
          label="Revenue Processed" 
          value={`$${stats.completedTotal.toLocaleString()}`} 
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          trend="completed"
        />
      </div>

      {/* ---------- Search and Actions ---------- */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search by customer, article, publication..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {filteredPitches.length} {filteredPitches.length === 1 ? 'pitch' : 'pitches'}
          </Badge>
        </div>
      </div>

      {/* ---------- Billing Table ---------- */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Successful Pitches Ready for Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPitches.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {search ? 'No matching results' : 'All caught up!'}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {search 
                  ? 'Try adjusting your search terms or clear the filter to see all pitches.'
                  : 'No successful pitches are currently waiting for billing. New placements will appear here automatically.'
                }
              </p>
              {search && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearch('')}
                  className="mt-4"
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Customer</TableHead>
                  <TableHead>Publication</TableHead>
                  <TableHead className="max-w-xs">Article Title</TableHead>
                  <TableHead className="text-right w-[120px]">Winning Bid</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPitches.map((pitch: Pitch) => (
                  <TableRow key={pitch.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {pitch.user?.avatar ? (
                          <img 
                            src={pitch.user.avatar} 
                            alt={pitch.customerName || pitch.user.fullName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {pitch.customerName || pitch.user?.fullName || 'Unknown'}
                          </p>
                          {pitch.user?.company_name && (
                            <p className="text-xs text-gray-500 truncate">
                              {pitch.user.company_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{pitch.publication?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate font-medium" title={pitch.title}>
                        {pitch.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {new Date(pitch.createdAt).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-lg font-bold text-green-600">
                        ${pitch.bidAmount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {pitch.billed ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Billed
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!pitch.billed && (
                        <Button 
                          size="sm" 
                          onClick={() => openBillingDrawer(pitch)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Bill Now
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ---------- Charge Drawer ---------- */}
      <Drawer open={!!selectedPitch} onOpenChange={() => setSelectedPitch(null)}>
        <DrawerContent className="max-w-2xl mx-auto">
          <DrawerHeader className="text-center pb-6">
            <DrawerTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <CreditCard className="h-6 w-6 text-blue-600" />
              Charge {selectedPitch?.customerName || selectedPitch?.user?.fullName}
            </DrawerTitle>
            <DrawerDescription className="text-lg mt-2">
              Process payment of{" "}
              <span className="font-bold text-green-600">${selectedPitch?.bidAmount}</span>{" "}
              for successful placement: <span className="font-medium">"{selectedPitch?.title}"</span>
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 py-4 space-y-6">
            {/* Pitch Summary */}
            <Card className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600">Publication</Label>
                    <p className="font-medium">{selectedPitch?.publication?.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Winning Bid</Label>
                    <p className="font-bold text-lg text-green-600">${selectedPitch?.bidAmount}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-gray-600">Article Title</Label>
                    <p className="font-medium">{selectedPitch?.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Select Payment Method</Label>
              
              {loadingMethods ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading payment methods...</span>
                </div>
              ) : methods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No payment methods on file</p>
                  <p className="text-sm text-gray-500 mt-1">
                    User needs to add a payment method before billing
                  </p>
                </div>
              ) : (
                <RadioGroup value={selectedMethod ?? undefined} onValueChange={setSelectedMethod}>
                  <div className="space-y-3">
                    {methods.map((method) => (
                      <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5 text-gray-500" />
                              <div>
                                <span className="font-medium capitalize">
                                  {method.brand} •••• {method.last4}
                                </span>
                                <span className="text-sm text-gray-500 ml-2">
                                  Expires {method.exp_month}/{method.exp_year}
                                </span>
                              </div>
                            </div>
                            {method.isDefault && (
                              <Badge variant="outline" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>
          </div>

          <DrawerFooter className="pt-6 border-t">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPitch(null)} 
                disabled={chargeMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCharge} 
                disabled={!selectedMethod || chargeMutation.isPending || methods.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {chargeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Charge ${selectedPitch?.bidAmount}
                  </>
                )}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/** Enhanced Stat Card with Icons and Trends */
function StatCard({ 
  label, 
  value, 
  icon, 
  trend 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: React.ReactNode;
  trend?: 'pending' | 'completed';
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && (
          <div className="mt-2">
            <Badge 
              variant="outline" 
              className={
                trend === 'pending' 
                  ? "text-amber-700 border-amber-200 bg-amber-50" 
                  : "text-green-700 border-green-200 bg-green-50"
              }
            >
              {trend === 'pending' ? 'Awaiting Payment' : 'Successfully Processed'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 