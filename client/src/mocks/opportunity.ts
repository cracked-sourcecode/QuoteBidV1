import { Opportunity } from "@shared/types/opportunity";

export const mockOpportunity: Opportunity = {
  id: 10,
  title: "Crypto Experts Needed For A Story on Agentic AI in Crypto",
  outlet: "Bloomberg",
  outletLogo: "https://logos-world.net/wp-content/uploads/2021/02/Bloomberg-Logo.png",
  tier: 1,
  status: "open",
  summary: "Looking for Crypto Experts to give insight on the following:\n\n1. Is the Crypto Market good for AI?\n\n2. Will Crypto use Agentic AI?\n\n3. How does this help companies in the Crypto space?",
  topicTags: ["Crypto", "Capital Markets"],
  slotsTotal: 3,
  slotsRemaining: 1,
  basePrice: 199,
  currentPrice: 249,
  increment: 50,
  floorPrice: 199,
  cutoffPrice: 499,
  deadline: new Date("2025-05-25").toISOString(),
  postedAt: new Date("2025-05-01").toISOString(),
  createdAt: new Date("2025-05-01").toISOString(),
  updatedAt: new Date().toISOString(),
  publicationId: 104
}; 