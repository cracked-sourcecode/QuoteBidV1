import { useEffect } from 'react';
import { useRoute } from 'wouter';
import { Loader2, ChevronLeft, Building, Tag, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import PriceChart from '@/components/price-chart';
import BidTicket from '@/components/bid-ticket';
import useOpportunityStore from '@/store/opportunity-store';
import { OutletTier } from '@shared/types/opportunity';

// Map tier to display label
const tierLabels: Record<OutletTier, string> = {
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3'
};

export default function OpportunityDetail() {
  const { toast } = useToast();
  const [, params] = useRoute('/opportunities/:id');
  const opportunityId = params ? parseInt(params.id) : 0;
  
  const {
    selectedOpportunity,
    priceHistory,
    bidInfo,
    isLoadingOpportunity,
    isLoadingPriceHistory,
    isSubmittingBid,
    opportunityError,
    bidError,
    selectOpportunity,
    submitBid,
    resetBidError
  } = useOpportunityStore();
  
  // Load opportunity data on initial render
  useEffect(() => {
    if (opportunityId) {
      selectOpportunity(opportunityId);
    }
  }, [opportunityId, selectOpportunity]);
  
  // Handle bid submission
  const handleSubmitBid = async (amount: number, pitch: string, paymentIntentId?: string) => {
    resetBidError();
    
    const success = await submitBid(opportunityId, amount, pitch, paymentIntentId);
    
    if (success) {
      toast({
        title: "Bid Submitted",
        description: "Your bid has been successfully submitted.",
      });
    }
  };
  
  // Loading state
  if (isLoadingOpportunity) {
    return (
      <div className="container max-w-7xl py-10 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <p className="text-lg text-gray-600">Loading opportunity...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (opportunityError || !selectedOpportunity) {
    return (
      <div className="container max-w-7xl py-10">
        <div className="bg-red-50 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-red-800 mb-2">Failed to load opportunity</h2>
          <p className="text-red-600 mb-4">{opportunityError || "Opportunity not found"}</p>
          <Button asChild variant="outline">
            <a href="/opportunities">Back to Opportunities</a>
          </Button>
        </div>
      </div>
    );
  }
  
  // Format dates
  const deadlineDate = new Date(selectedOpportunity.deadline);
  const formattedDeadline = format(deadlineDate, 'MMM d, yyyy');
  const postedDate = new Date(selectedOpportunity.postedAt);
  const formattedPostedDate = format(postedDate, 'MMM d, yyyy');
  
  // Check if deadline has passed
  const deadlinePassed = deadlineDate.getTime() < Date.now();
  const daysAgo = deadlinePassed ? Math.abs(Math.floor((Date.now() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  
  return (
    <div className="container max-w-7xl py-6 space-y-6">
      {/* Back button */}
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <a href="/opportunities">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Opportunities
        </a>
      </Button>
      
      {/* Expired opportunity warning */}
      {deadlinePassed && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
          <h3 className="text-amber-800 font-semibold text-base mb-2">
            QuoteBid Pitch Opportunity
          </h3>
          <div className="bg-amber-100/50 border border-amber-200 rounded-md p-3 mb-3 text-amber-800">
            <p>QuoteBid has been notified that the reporter indicated they have enough pitches at {format(deadlineDate, 'dd MMMM yyyy h:mm a')}.</p>
          </div>
          <div className="text-amber-800 mb-2">
            <p className="font-medium">This request expired {daysAgo} days ago.</p> 
            <p>QuoteBid still allows you to submit a pitch, as sometimes reporters consider late submissions for their stories.</p>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Opportunity details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="mb-2 bg-blue-100 text-blue-800 hover:bg-blue-200">
                  {tierLabels[selectedOpportunity.tier]}
                </Badge>
                <h1 className="text-2xl font-bold">{selectedOpportunity.title}</h1>
                <div className="flex items-center mt-2 text-gray-600">
                  <Building className="h-4 w-4 mr-1" />
                  <span>{selectedOpportunity.outlet}</span>
                </div>
              </div>
              
              {selectedOpportunity.outletLogo && (
                <div className="flex-shrink-0">
                  <img
                    src={selectedOpportunity.outletLogo}
                    alt={`${selectedOpportunity.outlet} logo`}
                    className="h-12 w-12 object-contain rounded bg-white border border-gray-100"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      // Show fallback initials
                      const fallback = document.createElement('div');
                      fallback.className = 'h-12 w-12 bg-gray-100 rounded flex items-center justify-center border border-gray-200';
                      fallback.innerHTML = `<span class="text-gray-600 font-bold text-lg">${selectedOpportunity.outlet.charAt(0).toUpperCase()}</span>`;
                      target.parentNode?.appendChild(fallback);
                    }}
                  />
                </div>
              )}
            </div>
            
            <Separator className="my-4" />
            
            <p className="text-gray-700">{selectedOpportunity.summary}</p>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedOpportunity.topicTags.map((tag) => (
                <Badge key={tag} variant="outline" className="flex items-center">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <div>
                  <p className="text-gray-500">Posted</p>
                  <p className="font-medium">{formattedPostedDate}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <div>
                  <p className="text-gray-500">Deadline</p>
                  <p className="font-medium">{formattedDeadline}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Price Chart */}
          <PriceChart
            priceHistory={priceHistory}
            basePrice={selectedOpportunity.basePrice}
            currentPrice={selectedOpportunity.currentPrice}
            isLoading={isLoadingPriceHistory}
          />
        </div>
        
        {/* Right column - Bid ticket */}
        <div>
          {bidInfo ? (
            <BidTicket
              bidInfo={bidInfo}
              onSubmitBid={handleSubmitBid}
              isSubmitting={isSubmittingBid}
              error={bidError}
              publicationName={selectedOpportunity.outlet || 'Publication'}
              opportunityId={selectedOpportunity.id}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center h-[200px]">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}