import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useLocation } from 'wouter';
import { Search, Filter, SlidersHorizontal, Loader2, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import OpportunityCard from '@/components/opportunity-card';
import ResubscriptionModal from '@/components/resubscription-modal';
import { sampleOpportunities } from '@/lib/fixtures/opportunities';
import { Opportunity } from '@shared/types/opportunity';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { INDUSTRY_OPTIONS } from '@/lib/constants';

const OPPORTUNITIES_PER_BATCH = 9; // 3 rows of 3 opportunities each

export default function OpportunitiesPage() {
  const [, setLocation] = useLocation();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [displayedOpportunities, setDisplayedOpportunities] = useState<Opportunity[]>([]);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('posted');
  const [showResubscribeModal, setShowResubscribeModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<Date | null>(null);
  const { user } = useAuth();
  
  // Scroll to top when component mounts (for mobile navigation)
  useEffect(() => {
    // Use setTimeout to ensure it happens after the page has fully loaded
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      // Backup scroll for mobile devices
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    
    // Immediate scroll
    scrollToTop();
    
    // Delayed scroll as backup for mobile
    const timer = setTimeout(scrollToTop, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch opportunities from the API
  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const response = await apiFetch('/api/opportunities');
        
        if (!response.ok) {
          throw new Error('Failed to fetch opportunities');
        }
        
        const data = await response.json();
        console.log('Raw API data:', data);
        
        // Map API response to match the Opportunity type format
        const formattedOpportunities = data.map((item: any) => {
          // Handle API response with either OpportunityWithPublication format or direct Opportunity format
          const opp = item.opportunity || item;
          const pub = item.publication || {};
          
          return {
            id: opp.id,
            title: opp.title || '',
            outlet: pub.name || opp.outlet || '',
            outletLogo: pub.logo || opp.outletLogo || '',
            tier: opp.tier ? (typeof opp.tier === 'string' && opp.tier.startsWith('Tier ') ? parseInt(opp.tier.split('Tier ')[1]) : Number(opp.tier)) : 1,
            status: opp.status || 'open',
            summary: opp.description || opp.summary || '',
            topicTags: Array.isArray(opp.tags) ? opp.tags : 
                     (opp.topicTags || []).map((tag: any) => 
                       typeof tag === 'string' ? tag : (tag.name || '')),
            slotsTotal: opp.slotsTotal || 1,
            slotsRemaining: opp.slotsRemaining || 1,
            basePrice: opp.minimumBid || opp.basePrice || 0,
            currentPrice: opp.currentPrice || opp.minimumBid || 0,
            increment: opp.increment || 50,
            floorPrice: opp.floorPrice || opp.minimumBid || 0,
            cutoffPrice: opp.cutoffPrice || (opp.minimumBid ? opp.minimumBid * 2 : 0),
            deadline: opp.deadline || new Date().toISOString(),
            postedAt: opp.createdAt || new Date().toISOString(),
            createdAt: opp.createdAt || new Date().toISOString(),
            updatedAt: opp.updatedAt || new Date().toISOString(),
            publicationId: opp.publicationId || pub.id || 0,
            industry: opp.industry || ''
          } as Opportunity & { industry?: string };
        });
        
        console.log('Formatted opportunities:', formattedOpportunities);
        setOpportunities(formattedOpportunities);
        
        // Smart logo preloading for initial sign-in experience
        // Preload logos for first 6 opportunities (above-the-fold) to prevent lag on initial sign-in
        // while keeping lazy loading for opportunities below the fold
        const preloadCount = Math.min(6, formattedOpportunities.length);
        formattedOpportunities.slice(0, preloadCount).forEach((opp: any) => {
          if (opp.outletLogo && opp.outletLogo.trim() && opp.outletLogo !== 'null' && opp.outletLogo !== 'undefined') {
            const logoUrl = opp.outletLogo.startsWith('http') || opp.outletLogo.startsWith('data:') 
              ? opp.outletLogo 
              : `${window.location.origin}${opp.outletLogo}`;
            
            // Preload the logo image
            const img = new Image();
            img.src = logoUrl;
            // Add high priority for above-the-fold content
            if ('fetchPriority' in img) {
              (img as any).fetchPriority = 'high';
            }
          }
        });
      } catch (error) {
        console.error('Error fetching opportunities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOpportunities();
  }, []);
  
  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;
      
      try {
        const res = await apiRequest("GET", `/api/user/${user.id}/subscription`);
        const data = await res.json();
        
        // Check if subscription is expired or past due
        if (data.status === 'past_due' || data.status === 'canceled' || data.status === 'unpaid') {
          setSubscriptionStatus(data.status);
          setShowResubscribeModal(true);
        }
        
        // Also check expiry date
        if (data.expiresAt) {
          const expiryDate = new Date(data.expiresAt);
          setSubscriptionExpiry(expiryDate);
          
          // If expired, show the modal
          if (expiryDate < new Date()) {
            setShowResubscribeModal(true);
          }
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };
    
    checkSubscription();
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = [...opportunities];
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        opp => 
          opp.title.toLowerCase().includes(query) ||
          opp.outlet.toLowerCase().includes(query) ||
          opp.topicTags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(opp => opp.tier === parseInt(tierFilter));
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(opp => opp.status === statusFilter);
    }
    
    // Apply industry filter
    if (industryFilter !== 'all') {
      filtered = filtered.filter(opp => {
        const oppWithIndustry = opp as Opportunity & { industry?: string };
        return oppWithIndustry.industry === industryFilter;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.currentPrice - b.currentPrice;
        case 'price-high':
          return b.currentPrice - a.currentPrice;
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'posted':
          return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        default:
          // When no specific sort is selected or as a fallback, sort by creation date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    
    setFilteredOpportunities(filtered);
  }, [opportunities, searchQuery, tierFilter, statusFilter, industryFilter, sortBy]);

  // Update displayed opportunities when filtered opportunities change
  useEffect(() => {
    const startIndex = 0;
    const endIndex = currentBatch * OPPORTUNITIES_PER_BATCH;
    const newDisplayed = filteredOpportunities.slice(startIndex, endIndex);
    setDisplayedOpportunities(newDisplayed);
  }, [filteredOpportunities, currentBatch]);

  // Reset to first batch when filters change
  useEffect(() => {
    setCurrentBatch(1);
  }, [searchQuery, tierFilter, statusFilter, industryFilter, sortBy]);
  
  // Handle opportunity click
  const handleOpportunityClick = (opportunityId: number) => {
    setLocation(`/opportunities/${opportunityId}`);
  };

  // Infinite scroll logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoadingMore && displayedOpportunities.length < filteredOpportunities.length) {
          setIsLoadingMore(true);
          
          // Small delay for smooth loading
          setTimeout(() => {
            setCurrentBatch(prev => prev + 1);
            setIsLoadingMore(false);
          }, 300);
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [isLoadingMore, displayedOpportunities.length, filteredOpportunities.length]);

  const hasMoreOpportunities = displayedOpportunities.length < filteredOpportunities.length;
  
  // Loading state - Skip on mobile (pull-to-refresh handles it)
  const isMobile = window.innerWidth <= 768;
  if (isLoading && !isMobile) {
    return (
      <div className="container max-w-7xl py-10 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <p className="text-lg text-gray-600">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white min-h-screen">
      {/* Resubscription Modal */}
      <ResubscriptionModal 
        open={showResubscribeModal} 
        onOpenChange={setShowResubscribeModal}
        subscriptionStatus={subscriptionStatus}
        expiryDate={subscriptionExpiry}
      />
      {/* Header with gradient background */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Media Opportunities</h1>
          <p className="text-gray-700 text-base">
            Browse open opportunities from top publications and lock in your bid before prices increase. Our marketplace connects you with premium media outlets to showcase your expertise.
          </p>
        </div>
      </div>
      

      
      {/* Search and filters */}
      <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-gray-200 bg-white">
        <div className="space-y-3">
          {/* Search - full width on mobile */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title, outlet, or tag"
              className="pl-9 h-10 sm:h-11 text-sm sm:text-base placeholder:text-sm sm:placeholder:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filters - stacked on mobile, inline on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Select
              value={tierFilter}
              onValueChange={setTierFilter}
            >
              <SelectTrigger className="h-10 sm:h-11">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="1">Tier 1</SelectItem>
                  <SelectItem value="2">Tier 2</SelectItem>
                  <SelectItem value="3">Tier 3</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="h-10 sm:h-11">
                <SelectValue placeholder="Open" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Select
              value={industryFilter}
              onValueChange={setIndustryFilter}
            >
              <SelectTrigger className="h-10 sm:h-11">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <SelectItem key={industry.value} value={industry.value}>
                      {industry.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Active filters */}
        {(tierFilter !== 'all' || statusFilter !== 'all' || industryFilter !== 'all' || searchQuery) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center min-w-0 flex-1">
                <Filter className="h-3 w-3 text-gray-500 mr-1 flex-shrink-0" />
                <span className="text-xs text-gray-600 mr-2 flex-shrink-0">Active filters:</span>
                
                <div className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide">
                  {tierFilter !== 'all' && (
                    <Button variant="outline" size="sm" className="h-5 text-xs rounded-md px-1.5 py-0 flex-shrink-0" onClick={() => setTierFilter('all')}>
                      T{tierFilter}
                      <span className="ml-0.5">×</span>
                    </Button>
                  )}
                  
                  {statusFilter !== 'all' && (
                    <Button variant="outline" size="sm" className="h-5 text-xs rounded-md px-1.5 py-0 flex-shrink-0" onClick={() => setStatusFilter('all')}>
                      {statusFilter === 'open' ? 'Open' : statusFilter}
                      <span className="ml-0.5">×</span>
                    </Button>
                  )}
                  
                  {industryFilter !== 'all' && (
                    <Button variant="outline" size="sm" className="h-5 text-xs rounded-md px-1.5 py-0 flex-shrink-0" onClick={() => setIndustryFilter('all')}>
                      {industryFilter.length > 8 ? `${industryFilter.substring(0, 8)}...` : industryFilter}
                      <span className="ml-0.5">×</span>
                    </Button>
                  )}
                  
                  {searchQuery && (
                    <Button variant="outline" size="sm" className="h-5 text-xs rounded-md px-1.5 py-0 flex-shrink-0" onClick={() => setSearchQuery('')}>
                      "{searchQuery.length > 6 ? `${searchQuery.substring(0, 6)}...` : searchQuery}"
                      <span className="ml-0.5">×</span>
                    </Button>
                  )}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-xs px-1.5 py-0 flex-shrink-0"
                onClick={() => {
                  setTierFilter('all');
                  setStatusFilter('open');
                  setIndustryFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Results count and sort - mobile optimized */}
      <div className="px-3 sm:px-6 lg:px-8 py-2 sm:py-3 bg-white border-b border-gray-200">
        <div className="flex flex-row justify-between items-center gap-2">
          <p className="text-xs sm:text-sm text-gray-600">
            Showing {displayedOpportunities.length} of {filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'opportunity' : 'opportunities'}
          </p>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <SlidersHorizontal className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-500" />
            <span className="text-xs sm:text-sm text-gray-600">Sort by:</span>
            <Select
              value={sortBy}
              onValueChange={setSortBy}
            >
                              <SelectTrigger className="w-[120px] sm:w-[140px] lg:w-[170px] h-6 sm:h-7 text-[10px] sm:text-xs border-none shadow-none px-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="deadline">Deadline (Soonest)</SelectItem>
                  <SelectItem value="posted">Recently Posted</SelectItem>
                  <SelectItem value="price-low">Price (Low to High)</SelectItem>
                  <SelectItem value="price-high">Price (High to Low)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Opportunities grid with background gradient */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 bg-white">
        {filteredOpportunities.length > 0 ? (
          <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedOpportunities.map((opportunity, index) => (
                <div 
                  key={opportunity.id}
                  className="opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]"
                  style={{ animationDelay: `${(index % OPPORTUNITIES_PER_BATCH) * 0.1}s` }}
                >
              <OpportunityCard
                opportunity={opportunity}
                    isPriority={index < 6} // First 6 cards are above-the-fold priority
              />
                </div>
            ))}
            </div>

            {/* Infinite Scroll Sentinel - Hide loading indicator on mobile */}
            {hasMoreOpportunities && (
              <div 
                id="scroll-sentinel" 
                className="flex items-center justify-center py-8"
              >
                {isLoadingMore && !isMobile && (
                  <div className="flex items-center space-x-3 text-gray-600 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading more opportunities...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center my-6">
            <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or search criteria to find more opportunities.
            </p>
            <Button onClick={() => {
              setTierFilter('all');
              setStatusFilter('open');
              setIndustryFilter('all');
              setSearchQuery('');
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* ——— FOOTER ——— */}
      <footer className="relative z-20 bg-white py-16 mt-16">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="mb-8">
            <div className="inline-flex items-center group">
              <span className="text-gray-900 font-black text-4xl tracking-tight">
                <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Quote</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Bid</span>
              </span>
              <div className="ml-3 px-2 py-1 bg-blue-100 border border-blue-200 rounded text-blue-700 text-xs font-bold uppercase tracking-wider">
                Beta
              </div>
            </div>
            <p className="text-gray-600 mt-4 text-lg">
              The World's First Live Marketplace for Earned Media
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            <span className="text-gray-500 hover:text-gray-700 transition-colors duration-300 text-lg font-medium cursor-default">
              Terms of Use
            </span>
            <span className="text-gray-500 hover:text-gray-700 transition-colors duration-300 text-lg font-medium cursor-default">
              Privacy
            </span>
            <span className="text-gray-500 hover:text-gray-700 transition-colors duration-300 text-lg font-medium cursor-default">
              Editorial Integrity
            </span>
          </div>
          
          <div className="border-t border-gray-200 pt-8">
            <p className="text-gray-600 text-lg">
              &copy; {new Date().getFullYear()} QuoteBid Inc. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Built For Experts, Not PR Agencies.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}