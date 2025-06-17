import { z } from 'zod';

/**
 * Zod schemas for opportunities and bidding
 */

// Outlet tier schema
export const outletTierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3)
]);

// Opportunity status schema
export const opportunityStatusSchema = z.union([
  z.literal('open'),
  z.literal('closed'),
  z.literal('expired')
]);

// Base opportunity schema
export const opportunitySchema = z.object({
  id: z.number(),
  title: z.string(),
  outlet: z.string(),
  outletLogo: z.string().optional(),
  tier: outletTierSchema,
  status: opportunityStatusSchema,
  summary: z.string(),
  topicTags: z.array(z.string()),
  slotsTotal: z.number().int().positive(),
  slotsRemaining: z.number().int().min(0),
  basePrice: z.number().positive(),
  currentPrice: z.number().positive(),
  increment: z.number().positive(),
  floorPrice: z.number().positive(),
  cutoffPrice: z.number().positive(),
  deadline: z.string().datetime(),
  postedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publicationId: z.number()
});

// Price tick schema
export const priceTickSchema = z.object({
  timestamp: z.string().datetime(),
  price: z.number().positive(),
  slotsRemaining: z.number().int().min(0)
});

// Bid info schema
export const bidInfoSchema = z.object({
  opportunityId: z.number(), 
  currentPrice: z.number().positive(),
  minBid: z.number().positive(),
  deadline: z.string().datetime(),
  slotsRemaining: z.number().int().min(0),
  slotsTotal: z.number().int().positive()
});

// Bid submission schema
export const bidSubmissionSchema = z.object({
  opportunityId: z.number(),
  bidAmount: z.number().positive(),
  pitch: z.string().max(400) // Limiting pitch to 400 characters
});

// Price range schema
export const priceRangeSchema = z.object({
  low: z.number().positive(),
  typical: z.object({
    min: z.number().positive(),
    max: z.number().positive()
  }),
  high: z.number().positive()
});

// Types inferred from schemas
export type OutletTier = z.infer<typeof outletTierSchema>;
export type OpportunityStatus = z.infer<typeof opportunityStatusSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type PriceTick = z.infer<typeof priceTickSchema>;
export type BidInfo = z.infer<typeof bidInfoSchema>;
export type BidSubmission = z.infer<typeof bidSubmissionSchema>;
export type PriceRange = z.infer<typeof priceRangeSchema>;