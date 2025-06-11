/**
 * Opportunity Matcher for Email Templates
 * Fetches real live opportunities based on user industry with smart fallbacks
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { opportunities, publications, pitches } from '../../shared/schema';

export interface EmailOpportunityData {
  id: number;
  title: string;
  description: string;
  outlet: string;
  logo: string;
  bgColor: string;
  tier: string;
  category: string;
  price: string;
  trend: string;
  timeLeft: string;
  industry: string;
  publicationId: number;
}

/**
 * Get live opportunity matching user's industry for email templates
 */
export async function getOpportunityForEmail(userIndustry?: string): Promise<EmailOpportunityData | null> {
  try {
    console.log(`🎯 Fetching opportunity for industry: ${userIndustry}`);
    
    // Define industry priority order for fallbacks
    const industryFallbacks = [
      userIndustry,
      'Finance', 
      'Technology', 
      'Capital Markets',
      'Real Estate',
      'Healthcare'
    ].filter(Boolean); // Remove undefined values
    
    // Try each industry in priority order
    for (const industry of industryFallbacks) {
      console.log(`🔍 Searching for opportunities in: ${industry}`);
      
      const opportunity = await getDb()
        .select({
          id: opportunities.id,
          title: opportunities.title,
          description: opportunities.description,
          tier: opportunities.tier,
          industry: opportunities.industry,
          current_price: opportunities.current_price,
          minimumBid: opportunities.minimumBid,
          deadline: opportunities.deadline,
          createdAt: opportunities.createdAt,
          publicationId: opportunities.publicationId,
          publication: {
            name: publications.name,
            logo: publications.logo,
          },
          pitchCount: sql<number>`count(${pitches.id})`
        })
        .from(opportunities)
        .leftJoin(publications, eq(opportunities.publicationId, publications.id))
        .leftJoin(pitches, and(
          eq(pitches.opportunityId, opportunities.id),
          eq(pitches.isDraft, false)
        ))
        .where(and(
          eq(opportunities.status, "open"),
          industry ? eq(opportunities.industry, industry) : sql`1=1`
        ))
        .groupBy(opportunities.id, publications.id, publications.name, publications.logo)
        .orderBy(desc(opportunities.createdAt))
        .limit(1);
      
      if (opportunity.length > 0) {
        const opp = opportunity[0];
        console.log(`✅ Found opportunity: ${opp.title} in ${industry}`);
        
        return formatOpportunityForEmail(opp);
      }
    }
    
    // Last resort: get any open opportunity
    console.log(`🔄 No industry match found, getting any open opportunity`);
    
    const anyOpportunity = await getDb()
      .select({
        id: opportunities.id,
        title: opportunities.title,
        description: opportunities.description,
        tier: opportunities.tier,
        industry: opportunities.industry,
        current_price: opportunities.current_price,
        minimumBid: opportunities.minimumBid,
        deadline: opportunities.deadline,
        createdAt: opportunities.createdAt,
        publicationId: opportunities.publicationId,
        publication: {
          name: publications.name,
          logo: publications.logo,
        },
        pitchCount: sql<number>`count(${pitches.id})`
      })
      .from(opportunities)
      .leftJoin(publications, eq(opportunities.publicationId, publications.id))
      .leftJoin(pitches, and(
        eq(pitches.opportunityId, opportunities.id),
        eq(pitches.isDraft, false)
      ))
      .where(eq(opportunities.status, "open"))
      .groupBy(opportunities.id, publications.id, publications.name, publications.logo)
      .orderBy(desc(opportunities.createdAt))
      .limit(1);
    
    if (anyOpportunity.length > 0) {
      console.log(`✅ Found fallback opportunity: ${anyOpportunity[0].title}`);
      return formatOpportunityForEmail(anyOpportunity[0]);
    }
    
    console.log(`❌ No opportunities found`);
    return null;
    
  } catch (error) {
    console.error('Error fetching opportunity for email:', error);
    return null;
  }
}

/**
 * Format opportunity data for email template
 */
function formatOpportunityForEmail(opp: any): EmailOpportunityData {
  // Calculate price and trend
  const basePrice = Number(opp.minimumBid) || 100;
  const currentPrice = Number(opp.current_price) || basePrice;
  const priceString = `$${currentPrice}`;
  const trendValue = Math.floor(Math.random() * 50) + 10; // Simulate trend for now
  const trend = `+$${trendValue} past hour`;
  
  // Calculate time left
  const timeLeft = calculateTimeLeft(opp.deadline);
  
  // Get industry-specific styling
  const styling = getIndustryStying(opp.industry);
  
  // Generate category tag
  const category = generateCategoryTag(opp.industry, opp.title);
  
  return {
    id: opp.id,
    title: opp.title,
    description: truncateDescription(opp.description),
    outlet: opp.publication?.name || 'Media Outlet',
    logo: getPublicationLogo(opp.publication?.name),
    bgColor: styling.bgColor,
    tier: opp.tier || 'Tier 1',
    category,
    price: priceString,
    trend,
    timeLeft,
    industry: opp.industry || 'Business',
    publicationId: opp.publicationId
  };
}

/**
 * Get industry-specific styling
 */
function getIndustryStying(industry: string) {
  const styles = {
    'Technology': { bgColor: '#1f2937' },
    'Finance': { bgColor: '#000000' },
    'Capital Markets': { bgColor: '#000000' },
    'Healthcare': { bgColor: '#dc2626' },
    'Real Estate': { bgColor: '#059669' },
    'Energy': { bgColor: '#7c3aed' },
    'Crypto': { bgColor: '#ea580c' },
    'Law': { bgColor: '#4f46e5' },
    'Politics': { bgColor: '#991b1b' },
    default: { bgColor: '#374151' }
  };
  
  return styles[industry as keyof typeof styles] || styles.default;
}

/**
 * Get publication logo letter
 */
function getPublicationLogo(publicationName?: string): string {
  if (!publicationName) return 'M';
  
  const logoMap = {
    'Bloomberg': 'B',
    'TechCrunch': 'T',
    'Wall Street Journal': 'W',
    'Reuters': 'R',
    'STAT News': 'S',
    'CoinDesk': 'C',
    'Yahoo Finance': 'Y',
    'CNBC': 'C',
    'Forbes': 'F'
  };
  
  return logoMap[publicationName as keyof typeof logoMap] || publicationName.charAt(0).toUpperCase();
}

/**
 * Generate category tag based on industry and title
 */
function generateCategoryTag(industry: string, title: string): string {
  // Smart category generation based on content
  if (title.toLowerCase().includes('ai') || title.toLowerCase().includes('artificial intelligence')) {
    return '• AI & Tech';
  }
  if (title.toLowerCase().includes('crypto') || title.toLowerCase().includes('bitcoin')) {
    return '• Digital Assets';
  }
  if (title.toLowerCase().includes('market') || title.toLowerCase().includes('trading')) {
    return '• Capital Markets';
  }
  if (title.toLowerCase().includes('real estate') || title.toLowerCase().includes('property')) {
    return '• Real Estate';
  }
  if (title.toLowerCase().includes('healthcare') || title.toLowerCase().includes('medical')) {
    return '• Healthcare';
  }
  if (title.toLowerCase().includes('energy') || title.toLowerCase().includes('renewable')) {
    return '• Energy Markets';
  }
  
  // Fallback to industry-based categories
  const categoryMap = {
    'Technology': '• Tech & Innovation',
    'Finance': '• Capital Markets', 
    'Capital Markets': '• Capital Markets',
    'Healthcare': '• Healthcare',
    'Real Estate': '• Real Estate',
    'Energy': '• Energy Markets',
    'Crypto': '• Digital Assets',
    'Law': '• Legal Affairs',
    'Politics': '• Policy & Politics'
  };
  
  return categoryMap[industry as keyof typeof categoryMap] || '• Expert Commentary';
}

/**
 * Calculate time left until deadline
 */
function calculateTimeLeft(deadline?: string | Date): string {
  if (!deadline) return '3 days left';
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const timeDiff = deadlineDate.getTime() - now.getTime();
  
  if (timeDiff <= 0) return 'Deadline passed';
  
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  if (days === 1) return '1 day left';
  if (days <= 7) return `${days} days left`;
  
  return 'Over a week left';
}

/**
 * Truncate description for email display
 */
function truncateDescription(description: string): string {
  if (!description) return 'Expert commentary needed for breaking story...';
  
  const maxLength = 120;
  if (description.length <= maxLength) return description;
  
  return description.substring(0, maxLength).trim() + '...';
}

/**
 * Get static fallback opportunity if no database opportunities exist
 */
export function getStaticFallbackOpportunity(industry?: string): EmailOpportunityData {
  const opportunities = {
    'Technology': {
      id: 0,
      title: 'AI Startup Experts Needed for Series A Funding Story',
      description: 'Looking for AI startup founders and VCs to comment on the current Series A market dynamics and emerging AI technologies...',
      outlet: 'TechCrunch',
      logo: 'T',
      bgColor: '#1f2937',
      tier: 'Tier 1',
      category: '• AI & Startups',
      price: '$342',
      trend: '+$45 past hour',
      timeLeft: '2 days left',
      industry: 'Technology',
      publicationId: 0
    },
    'Finance': {
      id: 0,
      title: 'Banking Experts for FOMC Meeting Analysis',
      description: 'Banking Experts: Do you think the next FOMC meeting will result in a rate hike or cut? Market analysis needed...',
      outlet: 'Bloomberg',
      logo: 'B',
      bgColor: '#000000',
      tier: 'Tier 1',
      category: '• Capital Markets',
      price: '$285',
      trend: '+$32 past hour',
      timeLeft: '3 days left',
      industry: 'Finance',
      publicationId: 0
    }
  };

  return opportunities[industry as keyof typeof opportunities] || opportunities['Finance'];
} 