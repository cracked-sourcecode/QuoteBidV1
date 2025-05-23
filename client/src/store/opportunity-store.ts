import { create } from 'zustand';
import { Opportunity, PriceTick, BidInfo } from '@shared/types/opportunity';
import { generatePriceHistory, sampleOpportunities } from '@/lib/fixtures/opportunities';
import { apiFetch } from '@/lib/apiFetch';

interface OpportunityState {
  // Current selected opportunity
  selectedOpportunity: Opportunity | null;
  // Price history for the selected opportunity
  priceHistory: PriceTick[];
  // Bidding information
  bidInfo: BidInfo | null;
  // Loading states
  isLoadingOpportunity: boolean;
  isLoadingPriceHistory: boolean;
  isSubmittingBid: boolean;
  // Error states
  opportunityError: string | null;
  priceHistoryError: string | null;
  bidError: string | null;
  // Actions
  selectOpportunity: (opportunityId: number) => Promise<void>;
  fetchPriceHistory: (opportunityId: number) => Promise<void>;
  fetchBidInfo: (opportunityId: number) => Promise<void>;
  submitBid: (opportunityId: number, bidAmount: number, pitch: string, paymentIntentId?: string) => Promise<boolean>;
  resetBidError: () => void;
}

const useOpportunityStore = create<OpportunityState>((set, get) => ({
  selectedOpportunity: null,
  priceHistory: [],
  bidInfo: null,
  isLoadingOpportunity: false,
  isLoadingPriceHistory: false,
  isSubmittingBid: false,
  opportunityError: null,
  priceHistoryError: null,
  bidError: null,

  selectOpportunity: async (opportunityId: number) => {
    set({ isLoadingOpportunity: true, opportunityError: null });
    
    try {
      // Fetch the opportunity from the API
      const response = await apiFetch(`/api/opportunities/${opportunityId}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load opportunity');
      }
      
      const opportunity = await response.json();
      
      set({ selectedOpportunity: opportunity });
      
      // Also fetch price history and bid info when selecting an opportunity
      get().fetchPriceHistory(opportunityId);
      get().fetchBidInfo(opportunityId);
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      set({ opportunityError: error instanceof Error ? error.message : 'Failed to load opportunity' });
    } finally {
      set({ isLoadingOpportunity: false });
    }
  },

  fetchPriceHistory: async (opportunityId: number) => {
    set({ isLoadingPriceHistory: true, priceHistoryError: null });
    
    try {
      // Try to fetch price history from API
      try {
        const response = await apiFetch(`/api/opportunities/${opportunityId}/price-history`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          set({ priceHistory: data });
          return;
        }
      } catch (apiError) {
        console.log('API price history not available, using generated data', apiError);
      }
      
      // If API fetch fails, generate some reasonable price history
      if (get().selectedOpportunity) {
        const opportunity = get().selectedOpportunity;
        
        // Generate a simple price history with at least two points
        const startDate = new Date(opportunity.createdAt);
        const now = new Date();
        const timeDiff = now.getTime() - startDate.getTime();
        
        // Create an array of price ticks with steadily increasing prices
        const numTicks = Math.max(2, Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1); // At least 1 tick per day
        const priceHistory: PriceTick[] = [];
        
        // Start price and end price
        const startPrice = opportunity.basePrice;
        const endPrice = opportunity.currentPrice;
        
        for (let i = 0; i < numTicks; i++) {
          const tickTime = new Date(startDate.getTime() + (timeDiff * (i / (numTicks - 1))));
          const tickPrice = startPrice + ((endPrice - startPrice) * (i / (numTicks - 1)));
          
          priceHistory.push({
            timestamp: tickTime.toISOString(),
            price: Math.round(tickPrice),
            slotsRemaining: opportunity.slotsTotal - Math.floor((opportunity.slotsTotal - opportunity.slotsRemaining) * (i / (numTicks - 1)))
          });
        }
        
        set({ priceHistory });
      }
    } catch (error) {
      console.error('Error generating price history:', error);
      set({ priceHistoryError: error instanceof Error ? error.message : 'Failed to load price history' });
    } finally {
      set({ isLoadingPriceHistory: false });
    }
  },

  fetchBidInfo: async (opportunityId: number) => {
    try {
      // Try to fetch bid info from API
      try {
        const response = await apiFetch(`/api/opportunities/${opportunityId}/bid-info`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          set({ bidInfo: data });
          return;
        }
      } catch (apiError) {
        console.log('API bid info not available, using generated data', apiError);
      }
      
      // If API fetch fails, generate bid info from opportunity data
      if (get().selectedOpportunity) {
        const opportunity = get().selectedOpportunity;
        
        // Calculate min bid (current price + standard increment)
        const currentPrice = opportunity.currentPrice || 100;
        const increment = opportunity.increment || 50;
        const minBid = currentPrice + increment;
        
        // Create bid info from the selected opportunity
        const bidInfo: BidInfo = {
          opportunityId: opportunity.id,
          currentPrice: currentPrice,
          minBid: minBid,
          deadline: opportunity.deadline,
          slotsRemaining: opportunity.slotsRemaining || 1,
          slotsTotal: opportunity.slotsTotal || 5
        };
        
        set({ bidInfo });
      }
    } catch (error) {
      console.error('Failed to fetch bid info:', error);
      // We don't set an error state here to keep the UI clean
    }
  },

  submitBid: async (opportunityId: number, bidAmount: number, pitch: string, paymentIntentId?: string) => {
    set({ isSubmittingBid: true, bidError: null });
    
    try {
      // Submit the bid to the API
      console.log('Submitting bid:', { opportunityId, bidAmount, pitch, paymentIntentId });
      
      const response = await apiFetch('/api/pitches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          opportunityId,
          bidAmount,
          content: pitch,
          paymentIntentId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit bid');
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting bid:', error);
      set({ bidError: error instanceof Error ? error.message : 'Failed to submit bid' });
      return false;
    } finally {
      set({ isSubmittingBid: false });
    }
  },

  resetBidError: () => {
    set({ bidError: null });
  }
}));

export default useOpportunityStore;