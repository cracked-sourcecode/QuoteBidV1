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

export default function SavedOpportunitiesPage() {
  const [, setLocation] = useLocation();
  const [savedOpportunities, setSavedOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  
  // Handle opportunity click
  const handleOpportunityClick = (opportunityId: number) => {
    setLocation(`/opportunities/${opportunityId}`);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="w-full bg-gradient-to-br from-[#1a1b3d] via-[#2d1b69] to-[#1a1b3d] min-h-screen">
        <div className="container max-w-7xl py-10 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-white mb-4" />
            <p className="text-lg text-slate-300">Loading saved opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-[#1a1b3d] via-[#2d1b69] to-[#1a1b3d] min-h-screen">
      {/* Header with brand-matching gradient */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 border-b border-[#3d2b7a]/40 bg-gradient-to-r from-[#1a1b3d] via-[#2d1b69] to-[#1a1b3d]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-[#2d1b69]/60 p-2 rounded-lg backdrop-blur-sm border border-[#3d2b7a]/30">
                <Bookmark className="h-6 w-6 text-white fill-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">
                Saved Opportunities
              </h1>
            </div>
            <p className="text-slate-300 text-base">
              Your bookmarked media opportunities. Keep track of the opportunities you're most interested in and return to them later.
            </p>
          </div>
        </div>
      </div>
      
      {/* Search and filters - only show if there are saved opportunities */}
      {savedOpportunities.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-700/50 bg-slate-800/60 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-auto sm:flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search saved opportunities..."
                className="pl-9 bg-gradient-to-r from-slate-900/90 to-purple-900/50 border border-purple-500/40 text-purple-100 placeholder:text-purple-300/70 focus:border-purple-400 focus:ring-purple-500/30 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-purple-500/20 hover:from-slate-800/90 hover:to-purple-800/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <Select
                value={tierFilter}
                onValueChange={setTierFilter}
              >
                <SelectTrigger className="w-full sm:w-[140px] bg-gradient-to-r from-purple-900/50 to-indigo-900/40 border border-purple-500/40 text-purple-100 hover:from-purple-800/60 hover:to-indigo-800/50 focus:border-purple-400 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-purple-500/20">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900/95 border border-purple-500/40 backdrop-blur-lg shadow-2xl shadow-purple-500/20">
                  <SelectGroup>
                    <SelectItem value="all" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">All Tiers</SelectItem>
                    <SelectItem value="1" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">Tier 1</SelectItem>
                    <SelectItem value="2" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">Tier 2</SelectItem>
                    <SelectItem value="3" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">Tier 3</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[140px] bg-gradient-to-r from-purple-900/50 to-indigo-900/40 border border-purple-500/40 text-purple-100 hover:from-purple-800/60 hover:to-indigo-800/50 focus:border-purple-400 backdrop-blur-sm transition-all duration-300 shadow-lg hover:shadow-purple-500/20">
                  <SelectValue placeholder="Open" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900/95 border border-purple-500/40 backdrop-blur-lg shadow-2xl shadow-purple-500/20">
                  <SelectGroup>
                    <SelectItem value="all" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">All Status</SelectItem>
                    <SelectItem value="open" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">Open</SelectItem>
                    <SelectItem value="closed" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">Closed</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
      
      {/* Results count and sort - only show if there are saved opportunities */}
      {savedOpportunities.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 py-3 bg-slate-800/40 border-b border-slate-700/50 flex justify-between items-center backdrop-blur-sm">
          <p className="text-xs text-slate-300">
            {filteredOpportunities.length} saved {filteredOpportunities.length === 1 ? 'opportunity' : 'opportunities'} found
          </p>
          
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-300 mr-1">Sort by:</span>
            <Select
              value={sortBy}
              onValueChange={setSortBy}
            >
              <SelectTrigger className="w-[170px] h-7 text-xs border-none shadow-none px-1 bg-transparent text-purple-200 hover:text-purple-100 transition-colors duration-200">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900/95 border border-purple-500/40 backdrop-blur-lg shadow-2xl shadow-purple-500/20">
                <SelectGroup>
                  <SelectItem value="deadline" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">Deadline (Soonest)</SelectItem>
                  <SelectItem value="posted" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">Recently Posted</SelectItem>
                  <SelectItem value="price-low" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">Price (Low to High)</SelectItem>
                  <SelectItem value="price-high" className="text-purple-100 hover:bg-gradient-to-r hover:from-purple-800/40 hover:to-indigo-800/30 focus:bg-gradient-to-r focus:from-purple-800/40 focus:to-indigo-800/30 transition-all duration-200">Price (High to Low)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      {/* Opportunities grid with dark gradient background */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-slate-800/20 to-transparent">
        {savedOpportunities.length > 0 ? (
          filteredOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                />
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-700/50 p-8 text-center my-6">
              <h3 className="text-lg font-semibold mb-2 text-white">No saved opportunities match your filters</h3>
              <p className="text-slate-300 mb-4">
                Try adjusting your search criteria to find more saved opportunities.
              </p>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-purple-500/30 transition-all duration-300 transform hover:scale-105"
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
          )
        ) : (
          // Empty state when no saved opportunities
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-12 text-center my-6">
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 p-8 rounded-full backdrop-blur-sm border border-purple-500/30">
                <Bookmark className="h-16 w-16 text-purple-400" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold bg-gradient-to-r from-purple-200 to-indigo-200 bg-clip-text text-transparent">No saved opportunities yet</h3>
                <p className="text-slate-300 max-w-md leading-relaxed">
                  Start browsing opportunities and click the save button to bookmark the ones you're interested in. They'll appear here for easy access later.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button 
                  onClick={() => setLocation('/opportunities')}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-purple-500/30 transition-all duration-300 transform hover:scale-105"
                >
                  <Search className="h-4 w-4" />
                  Browse Opportunities
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 