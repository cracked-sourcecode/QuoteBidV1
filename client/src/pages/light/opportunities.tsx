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

export default function OpportunitiesPage() {
  const [, setLocation] = useLocation();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('posted');
  const [showResubscribeModal, setShowResubscribeModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<Date | null>(null);
  const { user } = useAuth();
  
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
  
  // Handle opportunity click
  const handleOpportunityClick = (opportunityId: number) => {
    setLocation(`/opportunities/${opportunityId}`);
  };
  
  // Loading state
  if (isLoading) {
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
    <div className="w-full bg-gray-50 min-h-screen">
      {/* Resubscription Modal */}
      <ResubscriptionModal 
        open={showResubscribeModal} 
        onOpenChange={setShowResubscribeModal}
        subscriptionStatus={subscriptionStatus}
        expiryDate={subscriptionExpiry}
      />
      {/* Header with gradient background */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Media Opportunities</h1>
          <p className="text-gray-700 text-base">
            Browse open opportunities from top publications and lock in your bid before prices increase. Our marketplace connects you with premium media outlets to showcase your expertise.
          </p>
        </div>
      </div>
      

      
      {/* Search and filters */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-white">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title, outlet, or tag"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Select
              value={tierFilter}
              onValueChange={setTierFilter}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
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
              <SelectTrigger className="w-full sm:w-[140px]">
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
              <SelectTrigger className="w-full sm:w-[170px]">
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
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-gray-500 mr-1" />
              <span className="text-xs text-gray-600">Active filters:</span>
            </div>
            
            {tierFilter !== 'all' && (
              <Button variant="outline" size="sm" className="h-6 text-xs rounded-full px-2 py-0" onClick={() => setTierFilter('all')}>
                Tier: {tierFilter}
                <span className="ml-1">×</span>
              </Button>
            )}
            
            {statusFilter !== 'all' && (
              <Button variant="outline" size="sm" className="h-6 text-xs rounded-full px-2 py-0" onClick={() => setStatusFilter('all')}>
                Status: {statusFilter}
                <span className="ml-1">×</span>
              </Button>
            )}
            
            {industryFilter !== 'all' && (
              <Button variant="outline" size="sm" className="h-6 text-xs rounded-full px-2 py-0" onClick={() => setIndustryFilter('all')}>
                Industry: {industryFilter}
                <span className="ml-1">×</span>
              </Button>
            )}
            
            {searchQuery && (
              <Button variant="outline" size="sm" className="h-6 text-xs rounded-full px-2 py-0" onClick={() => setSearchQuery('')}>
                Search: "{searchQuery}"
                <span className="ml-1">×</span>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2 py-0 ml-auto"
              onClick={() => {
                setTierFilter('all');
                setStatusFilter('open');
                setIndustryFilter('all');
                setSearchQuery('');
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>
      
      {/* Results count */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 bg-white border-b border-gray-200 flex justify-between items-center">
        <p className="text-xs text-gray-600">
          {filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'opportunity' : 'opportunities'} found
        </p>
        
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3 w-3 text-gray-500" />
          <span className="text-xs text-gray-600 mr-1">Sort by:</span>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-[170px] h-7 text-xs border-none shadow-none px-1">
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
      
      {/* Opportunities grid with background gradient */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-gray-50 to-white">
        {filteredOpportunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            ))}
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
    </div>
  );
}