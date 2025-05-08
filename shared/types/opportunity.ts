/**
 * Opportunity types for the bidding system
 */

// Outlet tier classification
export type OutletTier = 1 | 2 | 3;

// Opportunity status
export type OpportunityStatus = 'open' | 'closed';

// Base Opportunity interface
export interface Opportunity {
  id: number;
  title: string;
  outlet: string;
  outletLogo?: string;
  tier: OutletTier;
  status: OpportunityStatus;
  summary: string;
  topicTags: string[];
  slotsTotal: number;
  slotsRemaining: number;
  basePrice: number;
  currentPrice: number;
  increment: number;
  floorPrice: number;
  cutoffPrice: number;
  deadline: string;
  postedAt: string;
  createdAt: string;
  updatedAt: string;
  publicationId: number;
}

// Price tick for price history chart
export interface PriceTick {
  timestamp: string;
  price: number;
  slotsRemaining: number;
}

// Bidding information
export interface BidInfo {
  opportunityId: number; 
  currentPrice: number;
  minBid: number;
  deadline: string;
  slotsRemaining: number;
  slotsTotal: number;
}

// For submitting a bid
export interface BidSubmission {
  opportunityId: number;
  bidAmount: number;
  pitch: string;
}

// Price ranges for the price badge
export interface PriceRange {
  low: number;
  typical: {
    min: number;
    max: number;
  };
  high: number;
}