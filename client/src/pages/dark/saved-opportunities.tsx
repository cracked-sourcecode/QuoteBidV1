import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import { useLocation } from 'wouter';
import { Search, Filter, SlidersHorizontal, Loader2, Bookmark, Heart } from 'lucide-react';
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
import { sampleOpportunities } from '@/lib/fixtures/opportunities';
import { Opportunity } from '@shared/types/opportunity';
import { useAuth } from '@/hooks/use-auth';
import { INDUSTRY_OPTIONS } from '@/lib/constants';

const OPPORTUNITIES_PER_BATCH = 9; // 3 rows of 3 opportunities each

export default function SavedOpportunitiesPage() {
  const [, setLocation] = useLocation();
  const [savedOpportunities, setSavedOpportunities] = useState<Opportunity[]>([]);
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
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  
  // Function to refresh saved opportunities data
  const refreshSavedOpportunities = () => {
    console.log('🔄 Refreshing saved opportunities...');
    setRefreshKey(prev => prev + 1);
  };
  
  // Fetch saved opportunities from the API
  useEffect(() => {
    const fetchSavedOpportunities = async () => {
      try {
        if (!user?.id) {
          setSavedOpportunities([]);
          return;
        }
        
        console.log('🔍 Fetching saved opportunities for user:', user.id);
        
        const response = await apiFetch(`/api/users/${user.id}/saved`);
        if (response.ok) {
          const savedData = await response.json();
          console.log('📥 Raw saved data from API:', savedData);
          
          // Transform saved data to opportunities format
          const opportunities = savedData
            .filter((saved: any) => {
              console.log('🔍 Checking saved item:', saved);
              return saved.opportunity; // Only include ones where opportunity still exists
            })
            .map((saved: any) => {
              const opp = saved.opportunity;
              return {
                id: opp.id,
                title: opp.title || '',
                outlet: opp.publication?.name || opp.outlet || '',
                outletLogo: opp.publication?.logo || opp.outletLogo || '',
                tier: opp.tier ? (typeof opp.tier === 'string' && opp.tier.startsWith('Tier ') ? parseInt(opp.tier.split('Tier ')[1]) : Number(opp.tier)) : 1,
                status: opp.status || 'open',
                summary: opp.description || opp.summary || '',
                topicTags: Array.isArray(opp.tags) ? opp.tags : 
                         (opp.topicTags || []).map((tag: any) => 
                           typeof tag === 'string' ? tag : (tag.name || '')),
                slotsTotal: opp.slotsTotal || 1,
                slotsRemaining: opp.slotsRemaining || 1,
                basePrice: opp.minimumBid || opp.basePrice || 0,
                currentPrice: opp.current_price || opp.currentPrice || opp.minimumBid || 0,
                increment: opp.increment || 50,
                floorPrice: opp.floorPrice || opp.minimumBid || 0,
                cutoffPrice: opp.cutoffPrice || (opp.minimumBid ? opp.minimumBid * 2 : 0),
                deadline: opp.deadline || new Date().toISOString(),
                postedAt: opp.createdAt || new Date().toISOString(),
                createdAt: opp.createdAt || new Date().toISOString(),
                updatedAt: opp.updatedAt || new Date().toISOString(),
                publicationId: opp.publicationId || opp.publication?.id || 0,
                industry: opp.industry || ''
              };
            });
          
          console.log('🔄 Transformed saved opportunities:', opportunities);
          console.log(`📊 Total opportunities after transformation: ${opportunities.length}`);
          setSavedOpportunities(opportunities);
          
          // Force refresh of opportunity card states
          if (opportunities.length > 0) {
            console.log('🔄 Triggering opportunity card refresh...');
            // Trigger a custom event that opportunity cards can listen to
            window.dispatchEvent(new CustomEvent('refreshSavedStatus'));
          }
        } else {
          console.error('Failed to fetch saved opportunities:', response.status);
          setSavedOpportunities([]);
        }
      } catch (error) {
        console.error('Error fetching saved opportunities:', error);
        setSavedOpportunities([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchSavedOpportunities();
    } else {
      setIsLoading(false);
    }
  }, [user, refreshKey]);

  // Apply filters
  useEffect(() => {
    let filtered = [...savedOpportunities];
    
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
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    
    setFilteredOpportunities(filtered);
  }, [savedOpportunities, searchQuery, tierFilter, statusFilter, industryFilter, sortBy]);

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
        threshold: 0.1
      }
    );

    const scrollTrigger = document.getElementById('scroll-trigger');
    if (scrollTrigger) {
      observer.observe(scrollTrigger);
    }

    return () => {
      if (scrollTrigger) {
        observer.unobserve(scrollTrigger);
      }
    };
  }, [isLoadingMore, displayedOpportunities.length, filteredOpportunities.length]);
  
  // Handle opportunity click
  const handleOpportunityClick = (opportunityId: number) => {
    setLocation(`/opportunities/${opportunityId}`);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Premium dark gradient backdrop - matching opportunities page */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900" />
        {/* Additional depth layers */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        
        <div className="relative z-10 container max-w-7xl py-10 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-white mb-4" />
            <p className="text-lg text-blue-300">Loading saved opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium dark gradient backdrop - matching opportunities page */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900" />
      {/* Additional depth layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-8 border-b border-blue-500/30">
        <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-600/20 p-2 rounded-lg backdrop-blur-sm border border-blue-500/30">
                <Bookmark className="h-6 w-6 text-blue-300 fill-blue-300" />
              </div>
              <h1 className="text-3xl font-bold text-white">Saved Opportunities</h1>
            </div>
            <p className="text-gray-300 text-base">
            Your bookmarked media opportunities. Keep track of the opportunities you're most interested in and return to them later.
          </p>
        </div>
      </div>
      
      {/* Search and filters - Premium dark theme matching opportunities page */}
      {savedOpportunities.length > 0 && (
        <div className="relative">
          {/* Matching home page gradient effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20"></div>
          
          <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8 border-b border-blue-500/30">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Search with better visibility */}
            <div className="relative w-full sm:w-auto sm:flex-grow">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-400/30">
                  <Search className="h-3 w-3 text-blue-300" />
                </div>
                <Input
                  placeholder="Search saved opportunities..."
                  className="pl-12 pr-4 h-12 bg-slate-800/80 border border-slate-600/60 text-white placeholder:text-slate-300 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0 focus:outline-none ring-0 outline-none [&:focus]:ring-blue-500/30 [&:focus]:border-blue-400/70 [&:focus]:outline-none [&:focus]:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] rounded-xl font-medium transition-all duration-300 hover:bg-slate-800/90"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ outline: 'none', boxShadow: 'none' }}
                />
              </div>
            </div>
        
            {/* Filters with better visibility */}
            <div className="flex flex-wrap gap-4 w-full sm:w-auto">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-full sm:w-[160px] h-12 bg-slate-800/80 border border-slate-600/60 text-white hover:border-blue-400/70 focus:border-blue-400/70 focus:ring-0 focus:ring-offset-0 focus:outline-none ring-0 outline-none [&:focus]:ring-blue-500/30 [&:focus]:border-blue-400/70 [&:focus]:outline-none [&:focus]:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] rounded-xl font-medium transition-all duration-300" style={{ outline: 'none', boxShadow: 'none' }}>
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
                <SelectTrigger className="w-full sm:w-[160px] h-12 bg-slate-800/80 border border-slate-600/60 text-white hover:border-blue-400/70 focus:border-blue-400/70 focus:ring-0 focus:ring-offset-0 focus:outline-none ring-0 outline-none [&:focus]:ring-blue-500/30 [&:focus]:border-blue-400/70 [&:focus]:outline-none [&:focus]:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] rounded-xl font-medium transition-all duration-300" style={{ outline: 'none', boxShadow: 'none' }}>
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
            </div>
          </div>
          
          {/* Active filters - original style but better visibility */}
          {(tierFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <div className="mt-4 relative">
              <div className="relative bg-slate-800/80 backdrop-blur-2xl rounded-xl border border-slate-600/60 py-3 px-4 shadow-xl">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center">
                    <div className="p-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg mr-2 border border-blue-400/30">
                      <Filter className="h-3 w-3 text-blue-300" />
                    </div>
                    <span className="text-white font-medium text-sm">Active Filters</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {tierFilter !== 'all' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2 text-xs bg-slate-700/80 border-slate-500/50 text-blue-200 hover:bg-blue-500/20 hover:border-blue-400/50 hover:text-white rounded-lg font-medium transition-all duration-300" 
                        onClick={() => setTierFilter('all')}
                      >
                        Tier: {tierFilter}
                        <span className="ml-1 text-sm">×</span>
                      </Button>
                    )}
                    
                    {statusFilter !== 'all' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2 text-xs bg-slate-700/80 border-slate-500/50 text-blue-200 hover:bg-blue-500/20 hover:border-blue-400/50 hover:text-white rounded-lg font-medium transition-all duration-300" 
                        onClick={() => setStatusFilter('all')}
                      >
                        Status: {statusFilter}
                        <span className="ml-1 text-sm">×</span>
                      </Button>
                    )}
                    
                    {searchQuery && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 px-2 text-xs bg-slate-700/80 border-slate-500/50 text-blue-200 hover:bg-blue-500/20 hover:border-blue-400/50 hover:text-white rounded-lg font-medium transition-all duration-300" 
                        onClick={() => setSearchQuery('')}
                      >
                        Search: "{searchQuery}"
                        <span className="ml-1 text-sm">×</span>
                      </Button>
                    )}
                  </div>
          
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg font-medium transition-all duration-300"
                    onClick={() => {
                      setTierFilter('all');
                      setStatusFilter('open');
                      setSearchQuery('');
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Results count and sort controls - original layout */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <p className="text-white font-medium">
                Showing {displayedOpportunities.length} of {filteredOpportunities.length} saved {filteredOpportunities.length === 1 ? 'opportunity' : 'opportunities'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-400/30">
                  <SlidersHorizontal className="h-3 w-3 text-blue-300" />
                </div>
                <span className="text-white font-medium">Sort by:</span>
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px] h-10 bg-slate-800/80 border border-slate-600/60 text-white hover:border-blue-400/70 focus:border-blue-400/70 focus:ring-0 focus:ring-offset-0 focus:outline-none ring-0 outline-none [&:focus]:ring-blue-500/30 [&:focus]:border-blue-400/70 [&:focus]:outline-none [&:focus]:shadow-[0_0_0_2px_rgba(59,130,246,0.3)] rounded-xl font-medium transition-all duration-300" style={{ outline: 'none', boxShadow: 'none' }}>
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
      )}
      
      {/* Opportunities grid */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {savedOpportunities.length > 0 ? (
          filteredOpportunities.length > 0 ? (
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

              {/* Infinite scroll trigger */}
              <div id="scroll-trigger" className="h-10 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading more saved opportunities...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center my-6">
              <h3 className="text-lg font-semibold mb-2 text-white">No saved opportunities match your filters</h3>
              <p className="text-slate-300 mb-4">
                Try adjusting your search criteria to find more saved opportunities.
              </p>
              <Button 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 transition-all duration-300"
                onClick={() => {
                  setTierFilter('all');
                  setStatusFilter('open');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )
        ) : (
          // Empty state when no saved opportunities
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-12 text-center my-6">
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 p-8 rounded-full backdrop-blur-sm border border-blue-500/30">
                <Bookmark className="h-16 w-16 text-blue-400" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">No saved opportunities yet</h3>
                <p className="text-slate-300 max-w-md leading-relaxed">
                  Start browsing opportunities and click the save button to bookmark the ones you're interested in. They'll appear here for easy access later.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button 
                  onClick={() => setLocation('/opportunities')}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 transition-all duration-300"
                >
                  <Search className="h-4 w-4" />
                  Browse Opportunities
                </Button>
              </div>
            </div>
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
          
          <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
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
                The world's first live marketplace for earned media
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
                Built for experts, not PR agencies.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 