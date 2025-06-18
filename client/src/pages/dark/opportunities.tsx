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
import { LoadingScreen, CompactLoading } from '@/components/ui/loading-screen';

const OPPORTUNITIES_PER_BATCH = 9; // 3 rows of 3 opportunities each

// Function to determine actual opportunity status based on manual closure and deadline
const getOpportunityStatus = (opportunity: any) => {
  // If manually closed, always return closed
  if (opportunity.status === 'closed') {
    return 'closed';
  }
  
  // If no deadline, use the stored status (default to open)
  if (!opportunity.deadline) {
    return opportunity.status || 'open';
  }
  
  const now = new Date();
  const deadlineDate = new Date(opportunity.deadline);
  
  // Set deadline to end of day (23:59:59.999) to allow full day access
  deadlineDate.setHours(23, 59, 59, 999);
  
  // If current time is after end of deadline day, it's closed
  if (now > deadlineDate) {
    return 'closed';
  }
  
  // If deadline is in the future, it should be open
  return 'open';
};

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
            status: getOpportunityStatus(opp),
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
        
        // Remove inefficient bulk logo preloading - let individual cards handle their own logos lazily
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
    
    // Apply status filter - use computed status that considers manual closure and deadline
    if (statusFilter !== 'all') {
      filtered = filtered.filter(opp => getOpportunityStatus(opp) === statusFilter);
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
    return <LoadingScreen message="Loading opportunities..." size="lg" />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium dark gradient backdrop - darker with more blue like home.tsx */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900" />
      {/* Additional depth layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
      
      {/* Resubscription Modal */}
      <ResubscriptionModal 
        open={showResubscribeModal} 
        onOpenChange={setShowResubscribeModal}
        subscriptionStatus={subscriptionStatus}
        expiryDate={subscriptionExpiry}
      />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 border-b border-blue-500/30">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Media Opportunities</h1>
            <p className="text-gray-300 text-base">
            Browse open opportunities from top publications and lock in your bid before prices increase. Our marketplace connects you with premium media outlets to showcase your expertise.
          </p>
        </div>
      </div>
      

      
        {/* Search and filters - Premium dark theme matching home page */}
        <div className="relative">
          {/* Matching home page gradient effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20"></div>
          
          <div className="relative z-10 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-blue-500/30">
            <div className="space-y-4">
              {/* Search with better visibility - full width on mobile */}
              <div className="relative w-full">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-400/30">
                    <Search className="h-3 w-3 text-blue-300" />
                  </div>
                  <Input
                    placeholder="Search by title, outlet, or tag"
                    className="pl-12 pr-4 h-11 sm:h-12 bg-slate-800/80 border border-slate-600/60 text-white placeholder:text-slate-300 placeholder:text-sm sm:placeholder:text-base focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0 focus:outline-none ring-0 outline-none [&:focus]:ring-blue-500/30 [&:focus]:border-blue-400/70 [&:focus]:outline-none [&:focus]:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] rounded-xl font-medium transition-all duration-300 hover:bg-slate-800/90 text-sm sm:text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ outline: 'none', boxShadow: 'none' }}
                  />
                </div>
              </div>
          
              {/* Filters - stacked on mobile, inline on larger screens */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="h-11 sm:h-12 bg-slate-800/80 border border-slate-600/60 text-white hover:border-blue-400/70 focus:border-blue-400/70 focus:ring-0 focus:ring-offset-0 focus:outline-none ring-0 outline-none [&:focus]:ring-blue-500/30 [&:focus]:border-blue-400/70 [&:focus]:outline-none [&:focus]:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] rounded-xl font-medium transition-all duration-300" style={{ outline: 'none', boxShadow: 'none' }}>
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800/95 backdrop-blur-2xl border border-slate-600/60 rounded-xl shadow-2xl">
                    <SelectGroup>
                      <SelectItem value="all" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">All Tiers</SelectItem>
                      <SelectItem value="1" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">Tier 1</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">Tier 2</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">Tier 3</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 sm:h-12 bg-slate-800/80 border border-slate-600/60 text-white hover:border-blue-400/70 focus:border-blue-400/70 focus:ring-0 focus:ring-offset-0 focus:outline-none ring-0 outline-none [&:focus]:ring-blue-500/30 [&:focus]:border-blue-400/70 [&:focus]:outline-none [&:focus]:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] rounded-xl font-medium transition-all duration-300" style={{ outline: 'none', boxShadow: 'none' }}>
                    <SelectValue placeholder="Open" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800/95 backdrop-blur-2xl border border-slate-600/60 rounded-xl shadow-2xl">
                    <SelectGroup>
                      <SelectItem value="all" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">All Status</SelectItem>
                      <SelectItem value="open" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">Open</SelectItem>
                      <SelectItem value="closed" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">Closed</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="h-11 sm:h-12 bg-slate-800/80 border border-slate-600/60 text-white hover:border-blue-400/70 focus:border-blue-400/70 focus:ring-0 focus:ring-offset-0 focus:outline-none ring-0 outline-none [&:focus]:ring-blue-500/30 [&:focus]:border-blue-400/70 [&:focus]:outline-none [&:focus]:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] rounded-xl font-medium transition-all duration-300" style={{ outline: 'none', boxShadow: 'none' }}>
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800/95 backdrop-blur-2xl border border-slate-600/60 rounded-xl shadow-2xl">
                    <SelectGroup>
                      <SelectItem value="all" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">All Industries</SelectItem>
                      {INDUSTRY_OPTIONS.map((industry) => (
                        <SelectItem key={industry.value} value={industry.value} className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">
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
              <div className="mt-4 relative">
                <div className="relative bg-slate-800/80 backdrop-blur-2xl rounded-xl border border-slate-600/60 py-2.5 px-3 shadow-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="p-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg mr-2 border border-blue-400/30 flex-shrink-0">
                        <Filter className="h-3 w-3 text-blue-300" />
                      </div>
                      <span className="text-white font-medium text-sm mr-2 flex-shrink-0">Active Filters</span>
                      
                      <div className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide">
                        {tierFilter !== 'all' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-5 px-1.5 text-xs bg-slate-700/80 border-slate-500/50 text-blue-200 hover:bg-blue-500/20 hover:border-blue-400/50 hover:text-white rounded-md font-medium transition-all duration-300 flex-shrink-0" 
                            onClick={() => setTierFilter('all')}
                          >
                            T{tierFilter}
                            <span className="ml-0.5 text-xs">×</span>
                          </Button>
                        )}
                        
                        {statusFilter !== 'all' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-5 px-1.5 text-xs bg-slate-700/80 border-slate-500/50 text-blue-200 hover:bg-blue-500/20 hover:border-blue-400/50 hover:text-white rounded-md font-medium transition-all duration-300 flex-shrink-0" 
                            onClick={() => setStatusFilter('all')}
                          >
                            {statusFilter === 'open' ? 'Open' : statusFilter}
                            <span className="ml-0.5 text-xs">×</span>
                          </Button>
                        )}
                        
                        {industryFilter !== 'all' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-5 px-1.5 text-xs bg-slate-700/80 border-slate-500/50 text-blue-200 hover:bg-blue-500/20 hover:border-blue-400/50 hover:text-white rounded-md font-medium transition-all duration-300 flex-shrink-0" 
                            onClick={() => setIndustryFilter('all')}
                          >
                            {industryFilter.length > 8 ? `${industryFilter.substring(0, 8)}...` : industryFilter}
                            <span className="ml-0.5 text-xs">×</span>
                          </Button>
                        )}
                        
                        {searchQuery && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-5 px-1.5 text-xs bg-slate-700/80 border-slate-500/50 text-blue-200 hover:bg-blue-500/20 hover:border-blue-400/50 hover:text-white rounded-md font-medium transition-all duration-300 flex-shrink-0" 
                            onClick={() => setSearchQuery('')}
                          >
                            "{searchQuery.length > 6 ? `${searchQuery.substring(0, 6)}...` : searchQuery}"
                            <span className="ml-0.5 text-xs">×</span>
                          </Button>
                        )}
                      </div>
                    </div>
            
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-md font-medium transition-all duration-300 flex-shrink-0"
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
              </div>
            )}
            
            {/* Results count and sort controls - mobile optimized */}
            <div className="mt-4 flex flex-row justify-between items-center gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <p className="text-white font-medium text-xs sm:text-sm">
                  Showing {displayedOpportunities.length} of {filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'opportunity' : 'opportunities'}
                </p>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="p-0.5 sm:p-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-400/30">
                    <SlidersHorizontal className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-300" />
                  </div>
                  <span className="text-white font-medium text-xs sm:text-sm">Sort by:</span>
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px] sm:w-[140px] lg:w-[170px] h-8 sm:h-9 lg:h-10 bg-slate-800/80 border border-slate-600/60 text-white hover:border-blue-400/70 focus:border-blue-400/70 focus:ring-0 focus:ring-offset-0 focus:outline-none ring-0 outline-none [&:focus]:ring-blue-500/30 [&:focus]:border-blue-400/70 [&:focus]:outline-none [&:focus]:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] rounded-xl font-medium transition-all duration-300 text-[10px] sm:text-sm" style={{ outline: 'none', boxShadow: 'none' }}>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800/95 backdrop-blur-2xl border border-slate-600/60 rounded-xl shadow-2xl">
                    <SelectGroup>
                      <SelectItem value="deadline" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">Deadline (Soonest)</SelectItem>
                      <SelectItem value="posted" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">Recently Posted</SelectItem>
                      <SelectItem value="price-low" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">Price (Low to High)</SelectItem>
                      <SelectItem value="price-high" className="text-white hover:bg-blue-500/20 focus:bg-blue-500/20">Price (High to Low)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      

      
        {/* Opportunities grid */}
        <div className="px-4 sm:px-6 lg:px-8 py-8 border-t border-blue-500/20">
        {filteredOpportunities.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedOpportunities.map((opportunity, index) => (
                <div 
                  key={opportunity.id}
                  className="opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]"
                  style={{ animationDelay: `${(index % OPPORTUNITIES_PER_BATCH) * 0.1}s` }}
                >
                  <OpportunityCard opportunity={opportunity} />
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
                  <CompactLoading message="Loading more opportunities..." />
                )}
              </div>
            )}
          </div>
        ) : (
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center my-6">
              <h3 className="text-lg font-semibold mb-2 text-white">No opportunities found</h3>
              <p className="text-slate-300 mb-4">
                Try adjusting your filters or search criteria to find more opportunities.
              </p>
              <Button 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-violet-700 text-white border-0 transition-all duration-300"
                onClick={() => {
                  setTierFilter('all');
                  setStatusFilter('open');
                  setIndustryFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            </div>
        )}
        </div>

        {/* ——— FOOTER ——— */}
        <footer className="relative z-20 bg-gradient-to-b from-transparent via-purple-900/30 to-slate-900/80 py-16 mt-8">
          {/* Background effects */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl animate-blob animation-delay-2000"></div>
          </div>
          
          <div className="max-w-10xl mx-auto px-6 text-center relative z-10">
            <div className="mb-8">
              <div className="inline-flex items-center group">
                <span className="text-white font-black text-4xl tracking-tight">
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
                </span>
                <div className="ml-3 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  Beta
                </div>
              </div>
              <p className="text-gray-400 mt-4 text-lg">
                The World's First Live Marketplace for Earned Media
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <span className="text-gray-300 hover:text-white transition-colors duration-300 text-lg font-medium cursor-default">
                Terms of Use
              </span>
              <span className="text-gray-300 hover:text-white transition-colors duration-300 text-lg font-medium cursor-default">
                Privacy
              </span>
              <span className="text-gray-300 hover:text-white transition-colors duration-300 text-lg font-medium cursor-default">
                Editorial Integrity
              </span>
            </div>
            
            <div className="border-t border-white/20 pt-8">
              <p className="text-gray-400 text-lg">
                &copy; {new Date().getFullYear()} QuoteBid Inc. All rights reserved.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Built For Experts, Not PR Agencies.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}