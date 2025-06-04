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

  const downloadInvoice = async (chargeId: string | number) => {
    try {
      // Open the invoice PDF in a new tab
      const invoiceUrl = `/api/users/${user?.id}/billing/placement-charges/${chargeId}/invoice`;
      
      // Create a temporary link to test if the invoice exists
      const response = await fetch(invoiceUrl, { method: 'HEAD' });
      
      if (response.ok) {
        window.open(invoiceUrl, '_blank');
      } else if (response.status === 404) {
        alert('Invoice not available for this charge. Please contact support if you need a receipt.');
      } else {
        alert('Unable to download invoice. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Error downloading invoice. Please check your connection and try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Billing & Subscription</h2>
        <p className="text-gray-600">Manage your subscription and view your placement charges</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Monthly Subscription */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Subscription</h3>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                QuoteBid Platform Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSubscription ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : subscription ? (
                <>
                  {/* Subscription Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Status</span>
                    <Badge 
                      variant={subscription.status === 'active' ? 'default' : 'secondary'}
                      className={subscription.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {subscription.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Plan Type */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Plan</span>
                    <span className="text-sm font-semibold">
                      {subscription.isPremium ? 'Premium' : 'Basic'}
                    </span>
                  </div>

                  {/* Monthly Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Monthly Price</span>
                    <span className="text-lg font-bold text-gray-900">$99.99</span>
                  </div>

                  {/* Next Billing Date */}
                  {subscription.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        {subscription.status === 'active' ? 'Next billing' : 'Expires'}
                      </span>
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(subscription.expiresAt)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  {/* Plan Features */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Plan Includes:</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">Unlimited pitches to media opportunities</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">Priority matching with journalists</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">Access to premium tier opportunities</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">Professional profile with social links</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Action Button */}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={onOpenSubscriptionModal}
                  >
                    Manage Subscription
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No active subscription found</p>
                  <Button>Subscribe Now</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Placement Charges */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Placement Charges</h3>
            <Badge variant="outline" className="text-xs">
              {charges.length} charges
            </Badge>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>
                Successful Media Placements
              </CardTitle>
              <p className="text-sm text-gray-600">
                Charges for successful article placements and media coverage
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingCharges ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : charges.length > 0 ? (
                <div className="space-y-0 max-h-96 overflow-y-auto">
                  {charges.map((charge: any, index: number) => (
                    <div key={charge.id || index} className="relative">
                      {/* Gradient separator line */}
                      {index > 0 && (
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                      )}
                      
                      <div className="py-4 px-3 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200 rounded-lg group border-l-4 border-l-transparent hover:border-l-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm leading-tight">
                              {charge.opportunity?.title || charge.articleTitle || charge.description || 'Media Coverage'}
                            </h4>
                            {charge.opportunity?.publication?.name && (
                              <p className="text-xs text-gray-600 mt-1 font-medium">
                                {charge.opportunity.publication.name}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(charge.chargedAt || charge.createdAt)}
                              </span>
                              {charge.status && (
                                <Badge 
                                  variant="default"
                                  className="text-xs bg-green-100 text-green-700 border-green-200 font-medium"
                                >
                                  {charge.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="text-base font-semibold text-gray-900 mb-1">
                              {formatCurrency(charge.amount || charge.bidAmount || 0)}
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              {charge.articleUrl && (
                                <a 
                                  href={charge.articleUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 group-hover:text-blue-700 transition-colors"
                                >
                                  View article
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadInvoice(charge.invoiceId || charge.paymentId || charge.id)}
                                className="text-xs h-7 px-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
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
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-2 font-medium">No placement charges yet</p>
                  <p className="text-sm text-gray-500">
                    Charges for successful media placements will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Spent Summary */}
          {charges.length > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Total placement charges</span>
                    <p className="text-xs text-gray-500 mt-1">All successful placements to date</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(
                        charges.reduce((sum: number, charge: any) => 
                          sum + (charge.amount || charge.bidAmount || 0), 0
                        )
                      )}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{charges.length} placements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 rounded-full p-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Questions about billing?</h4>
              <p className="text-sm text-blue-700 mb-3">
                Our support team can help with any billing questions or concerns you may have.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100" asChild>
                  <a href="mailto:billing@quotebid.com">
                    Email Support
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100" asChild>
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