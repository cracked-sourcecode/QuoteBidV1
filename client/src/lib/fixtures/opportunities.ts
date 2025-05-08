import { Opportunity, PriceTick } from "@shared/types/opportunity";

/**
 * Sample opportunity data for development
 */
export const sampleOpportunities: Opportunity[] = [
  {
    id: 1,
    title: "Expert commentary on cryptocurrency market trends",
    outlet: "CoinDesk",
    outletLogo: "https://cryptologos.cc/logos/coindesk-logo.png",
    tier: 1,
    status: "open",
    summary: "Seeking expert commentary on recent cryptocurrency market trends. Looking for insights on Bitcoin's price movements and regulatory impacts.",
    topicTags: ["Crypto", "Bitcoin", "Market Analysis", "Regulation"],
    slotsTotal: 3,
    slotsRemaining: 1,
    basePrice: 250,
    currentPrice: 350,
    increment: 50,
    floorPrice: 250,
    cutoffPrice: 500,
    deadline: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    postedAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    publicationId: 101
  },
  {
    id: 2,
    title: "Real Estate market outlook for 2025",
    outlet: "The Wall Street Journal",
    outletLogo: "https://www.dowjones.com/wp-content/uploads/sites/43/2020/08/WSJ_logo.png",
    tier: 1,
    status: "open",
    summary: "Looking for real estate experts to comment on the market outlook for 2025. Focus on commercial real estate trends, interest rates impact, and regional market differences.",
    topicTags: ["Real Estate", "Commercial Property", "Market Trends", "Interest Rates"],
    slotsTotal: 2,
    slotsRemaining: 2,
    basePrice: 300,
    currentPrice: 300,
    increment: 75,
    floorPrice: 300,
    cutoffPrice: 600,
    deadline: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
    postedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    publicationId: 102
  },
  {
    id: 3,
    title: "The future of mortgage rates in an uncertain economy",
    outlet: "Bloomberg",
    outletLogo: "https://assets.bbhub.io/company/sites/70/2020/03/logo-bloomberg-black.svg",
    tier: 1,
    status: "open",
    summary: "Seeking mortgage experts to provide insights on the future direction of rates. Looking for commentary on Fed policy impacts, industry trends, and advice for prospective homebuyers.",
    topicTags: ["Mortgage", "Interest Rates", "Federal Reserve", "Housing Market"],
    slotsTotal: 4,
    slotsRemaining: 1,
    basePrice: 275,
    currentPrice: 425,
    increment: 50,
    floorPrice: 275,
    cutoffPrice: 550,
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    postedAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    publicationId: 103
  }
];

/**
 * Generate price history for an opportunity
 */
export function generatePriceHistory(opportunity: Opportunity): PriceTick[] {
  const { basePrice, currentPrice, increment, postedAt, slotsTotal, slotsRemaining } = opportunity;
  
  // Calculate how many price increments have occurred
  const priceSteps = (currentPrice - basePrice) / increment;
  
  // Generate time points between posted date and now
  const startTime = new Date(postedAt).getTime();
  const endTime = Date.now();
  const timeRange = endTime - startTime;
  
  const ticks: PriceTick[] = [];
  
  // Always start with the base price
  ticks.push({
    timestamp: new Date(postedAt).toISOString(),
    price: basePrice,
    slotsRemaining: slotsTotal
  });
  
  // Add price increases over time
  for (let i = 1; i <= priceSteps; i++) {
    const timePoint = startTime + (timeRange * (i / priceSteps));
    const slotsFilled = Math.min(slotsTotal - slotsRemaining, Math.floor((i / priceSteps) * (slotsTotal - slotsRemaining) + 1));
    
    ticks.push({
      timestamp: new Date(timePoint).toISOString(),
      price: basePrice + (increment * i),
      slotsRemaining: slotsTotal - slotsFilled
    });
  }
  
  return ticks;
}