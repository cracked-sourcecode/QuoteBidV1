import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, CreditCard, Calendar, DollarSign, FileText, ExternalLink, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';

interface BillingTabContentProps {
  user: any;
  subscription: any;
  isLoadingSubscription: boolean;
  onOpenSubscriptionModal: () => void;
}

export function BillingTabContent({ 
  user, 
  subscription, 
  isLoadingSubscription, 
  onOpenSubscriptionModal 
}: BillingTabContentProps) {
  
  // Fetch user's placement charges (successful pitches they've been billed for)
  const { data: placementCharges, isLoading: isLoadingCharges } = useQuery({
    queryKey: [`/api/users/${user?.id}/billing/placement-charges`],
    enabled: !!user?.id,
  });

  // Ensure placementCharges is always an array
  const charges = Array.isArray(placementCharges) ? placementCharges : [];

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const downloadInvoice = (charge: any) => {
    // Open the Stripe receipt URL directly - no async calls, no popup blockers!
    if (charge.receiptUrl) {
      window.open(charge.receiptUrl, '_blank');
    } else {
      console.error('No receipt URL available for this charge');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-slate-100">Billing & Subscription</h2>
        <p className="text-slate-400">Manage your subscription and view your placement charges</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Monthly Subscription */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">Monthly Subscription</h3>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <CreditCard className="h-5 w-5" />
                QuoteBid Platform Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSubscription ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : subscription ? (
                <>
                  {/* Subscription Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Status</span>
                    <Badge 
                      variant={subscription.status === 'active' ? 'default' : 'secondary'}
                      className={subscription.status === 'active' ? 'bg-green-800 text-green-200' : 'bg-slate-700 text-slate-300'}
                    >
                      {subscription.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Plan Type */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Plan</span>
                    <span className="text-sm font-semibold text-slate-200">
                      {subscription.isPremium ? 'Premium' : 'Basic'}
                    </span>
                  </div>

                  {/* Monthly Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-400">Monthly Price</span>
                    <span className="text-lg font-bold text-slate-100">$99.99</span>
                  </div>

                  {/* Next Billing Date */}
                  {subscription.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-400">
                        {subscription.status === 'active' ? 'Next billing' : 'Expires'}
                      </span>
                      <span className="text-sm text-slate-300 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(subscription.expiresAt)}
                      </span>
                    </div>
                  )}

                  <Separator className="bg-slate-700" />

                  {/* Plan Features */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-100 mb-3">Plan Includes:</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-300">Unlimited pitches to media opportunities</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-300">Priority matching with journalists</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-300">Access to premium tier opportunities</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-300">Professional profile with social links</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Action Button */}
                  <Button 
                    variant="outline" 
                    className="w-full !bg-slate-800 !border-slate-600 !text-slate-200 hover:!bg-slate-700 hover:!text-slate-100"
                    onClick={onOpenSubscriptionModal}
                  >
                    Manage Subscription
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 mb-4">No active subscription found</p>
                  <Button className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600">Subscribe Now</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Placement Charges */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">Placement Charges</h3>
            <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
              {charges.length} charges
            </Badge>
          </div>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Successful Media Placements
              </CardTitle>
              <p className="text-sm text-slate-400">
                Charges for successful article placements and media coverage
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingCharges ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : charges.length > 0 ? (
                <div className="space-y-0 max-h-96 overflow-y-auto">
                  {charges.map((charge: any, index: number) => (
                    <div key={charge.id || index} className="relative">
                      {/* Gradient separator line */}
                      {index > 0 && (
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                      )}
                      
                      <div className="py-4 px-4 bg-slate-900 border border-slate-600 hover:border-blue-400 hover:bg-gradient-to-r hover:from-slate-800 hover:to-slate-700 transition-all duration-200 rounded-lg group shadow-sm hover:shadow-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-100 text-sm leading-tight">
                              {charge.opportunity?.title || charge.articleTitle || charge.description || 'Media Coverage'}
                            </h4>
                            {charge.opportunity?.publication?.name && (
                              <p className="text-xs text-slate-300 mt-1 font-medium">
                                {charge.opportunity.publication.name}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(charge.chargedAt || charge.createdAt)}
                              </span>
                              {charge.status && (
                                <Badge 
                                  variant="default"
                                  className="text-xs bg-green-800 text-green-200 border-green-700 font-medium"
                                >
                                  {charge.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="text-base font-semibold text-slate-100 mb-1">
                              {formatCurrency(charge.amount || charge.bidAmount || 0)}
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              {charge.articleUrl && (
                                <a 
                                  href={charge.articleUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 group-hover:text-blue-300 transition-colors"
                                >
                                  View article
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => downloadInvoice(charge)}
                                className="text-xs h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 hover:border-blue-400"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Invoice
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-300 mb-2 font-medium">No placement charges yet</p>
                  <p className="text-sm text-slate-400">
                    Charges for successful media placements will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Spent Summary */}
          {charges.length > 0 && (
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-200">Total placement charges</span>
                    <p className="text-xs text-slate-400 mt-1">All successful placements to date</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-100">
                      {formatCurrency(
                        charges.reduce((sum: number, charge: any) => 
                          sum + (charge.amount || charge.bidAmount || 0), 0
                        )
                      )}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{charges.length} placements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Help Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-slate-700 rounded-full p-2">
              <CreditCard className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-100 mb-1">Questions about billing?</h4>
              <p className="text-sm text-slate-300 mb-3">
                Our support team can help with any billing questions or concerns you may have.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="!bg-slate-800 !border-slate-600 !text-slate-300 hover:!bg-slate-700 hover:!text-slate-100" asChild>
                  <a href="mailto:billing@quotebid.com">
                    Email Support
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="!bg-slate-800 !border-slate-600 !text-slate-300 hover:!bg-slate-700 hover:!text-slate-100" asChild>
                  <a href="https://calendly.com/rubicon-pr-group/quotebid" target="_blank" rel="noopener noreferrer">
                    Schedule Call
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 