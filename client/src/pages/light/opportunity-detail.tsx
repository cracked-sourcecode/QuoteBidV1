import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { ChevronLeft, Calendar, Clock, DollarSign, TrendingUp, TrendingDown, Flame, ChevronUp, Info, Mic, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/apiFetch';
import PriceTrendChart from '@/components/PriceTrendChart';
import LogoUniform from '@/components/ui/logo-uniform';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { getPublicationLogo } from '@/lib/responsive-utils';
// Mobile-compatible voice recording using native MediaRecorder

// Function to determine actual opportunity status based on deadline
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
  
  // Debug logging for troubleshooting
  console.log('🔍 Status Check:', {
    id: opportunity.id,
    title: opportunity.title?.substring(0, 50),
    storedStatus: opportunity.status,
    deadline: deadlineDate.toISOString(),
    now: now.toISOString(),
    deadlineInFuture: deadlineDate > now
  });
  
  // If current time is after end of deadline day, it's closed
  if (now > deadlineDate) {
    return 'closed';
  }
  
  // If deadline is in the future, it should be open
  return 'open';
};
import { apiRequest } from '@/lib/queryClient';
import { useOpportunityPrice, usePriceConnection } from '@/contexts/PriceContext';

// Component to show live price for related opportunities
function RelatedOpportunityPrice({ opportunityId, fallbackPrice }: { opportunityId: number; fallbackPrice: number }) {
  const priceData = useOpportunityPrice(opportunityId);
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
  
  // 🚀 PERFORMANCE FIX: Use cached price data and avoid individual API calls for related opportunities
  // Only fetch if we absolutely need to and don't have cached data
  useEffect(() => {
    // Only fetch if we don't have any price data at all (neither live nor cached)
    if (!priceData?.currentPrice && !fetchedPrice) {
      const fetchCurrentPrice = async () => {
        try {
          const response = await apiFetch(`/api/opportunities/${opportunityId}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const opportunity = await response.json();
            setFetchedPrice(opportunity.currentPrice || opportunity.basePrice);
          }
        } catch (error) {
          console.error(`Failed to fetch price for related opportunity ${opportunityId}:`, error);
        }
      };
      
      // Add small delay to prevent too many simultaneous requests
      const timeoutId = setTimeout(fetchCurrentPrice, Math.random() * 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [opportunityId, priceData?.currentPrice, fetchedPrice]);
  
  const currentPrice = priceData?.currentPrice || fetchedPrice || fallbackPrice;
  
  return (
    <span className="text-2xl font-bold text-green-600">
      ${currentPrice}
    </span>
  );
}

// Component to show hourly price change for related opportunities
function RelatedOpportunityHourlyChange({ opportunityId }: { opportunityId: number }) {
  const priceData = useOpportunityPrice(opportunityId);
  const [hourlyChange, setHourlyChange] = useState<{ change: number; trend: string } | null>(null);
  
  // Fetch hourly price change data
  useEffect(() => {
    const fetchHourlyChange = async () => {
      try {
        const response = await apiFetch(`/api/opportunities/${opportunityId}/price-trend?window=1h`, {
          credentials: 'include'
        });
        if (response.ok) {
          const priceHistory = await response.json();
          if (priceHistory.length >= 2) {
            const latest = priceHistory[priceHistory.length - 1];
            const previous = priceHistory[0];
            const change = latest.p - previous.p;
            const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
            setHourlyChange({ change, trend });
          } else {
            setHourlyChange({ change: 0, trend: 'stable' });
          }
        }
      } catch (error) {
        console.error(`Failed to fetch hourly change for opportunity ${opportunityId}:`, error);
        setHourlyChange({ change: 0, trend: 'stable' });
      }
    };
    
    fetchHourlyChange();
  }, [opportunityId]);
  
  // Use live data if available, otherwise use fetched data
  const change = priceData?.deltaPastHour ?? hourlyChange?.change ?? 0;
  const trend = priceData?.trend ?? hourlyChange?.trend ?? 'stable';
  
  if (trend === 'stable' || change === 0) {
    return (
      <div className="text-right">
        <div className="text-xs text-gray-500 mb-1">Past Hour</div>
        <div className="text-blue-600 text-sm font-semibold flex items-center justify-end space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>No change</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="text-right">
      <div className="text-xs text-gray-500 mb-1">Past Hour</div>
      <div className={`text-sm font-semibold flex items-center justify-end space-x-1 ${
        trend === 'up' ? 'text-green-600' : 'text-red-600'
      }`}>
        <TrendingUp className={`h-3 w-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
        <span>{change > 0 ? '+' : ''}${Math.abs(change)}</span>
      </div>
    </div>
  );
}

export default function OpportunityDetail() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, params] = useRoute('/opportunities/:id');
  const opportunityId = params ? parseInt(params.id) : 0;
  
  // Stable reference to opportunity ID to prevent unnecessary re-renders
  const stableOpportunityId = useRef(opportunityId);
  useEffect(() => {
    if (opportunityId && opportunityId !== stableOpportunityId.current) {
      stableOpportunityId.current = opportunityId;
    }
  }, [opportunityId]);
  const [isBriefMinimized, setIsBriefMinimized] = useState(false);
  const [pitchContent, setPitchContent] = useState('');
  const [draftId, setDraftId] = useState<number | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Connect to real-time price updates from pricing engine
  const priceData = useOpportunityPrice(opportunityId);
  const { isConnected, connectionCount } = usePriceConnection();
  
  // Draft functionality
  const createDraft = useCallback(async () => {
    try {
      console.log('🚀 Creating draft for opportunity:', opportunityId);
      console.log('🚀 Draft payload:', {
        opportunityId,
        content: pitchContent,
        bidAmount: opportunity?.currentPrice || 0,
        pitchType: 'text',
        status: 'draft'
      });
      
      const response = await apiFetch('/api/pitches/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          content: pitchContent,
          bidAmount: opportunity?.currentPrice || 0,
          pitchType: 'text',
          status: 'draft'
        }),
      });
      
      console.log('🚀 Draft API response:', response.status, response.ok);
      
      if (response.ok) {
        const draft = await response.json();
        console.log('📝 Draft created successfully:', draft);
        setDraftId(draft.id);
        setLastSaved(new Date());
        return draft;
      } else {
        const errorText = await response.text();
        console.error('Failed to create draft:', response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('Error creating draft:', error);
      return null;
    }
  }, [opportunityId, pitchContent]);
  
  const saveDraft = useCallback(async () => {
    if (!draftId) return;
    
    try {
      setIsAutoSaving(true);
      console.log('💾 Saving draft:', draftId, 'Content length:', pitchContent.length);
      const response = await apiFetch(`/api/pitches/${draftId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: pitchContent,
          bidAmount: opportunity?.currentPrice || 0
        }),
      });
      
      if (response.ok) {
        console.log('✅ Draft saved successfully');
        setLastSaved(new Date());
      } else {
        console.error('Failed to save draft:', response.status);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [draftId, pitchContent]);
  
  const loadExistingDraft = async () => {
    try {
      const response = await apiFetch('/api/user');
      if (response.ok) {
        const userData = await response.json();
        const userId = userData.id;
        
        // Check for existing draft for this opportunity
        const draftsResponse = await apiFetch(`/api/users/${userId}/drafts?opportunityId=${opportunityId}`);
        if (draftsResponse.ok) {
          const drafts = await draftsResponse.json();
          if (drafts && drafts.length > 0) {
            const draft = drafts[0];
            console.log('📖 Loading existing draft:', draft);
            setDraftId(draft.id);
            setPitchContent(draft.content || '');
            setLastSaved(new Date(draft.updatedAt));
          }
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };
  
  // State for real data
  const [opportunity, setOpportunity] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [bidInfo, setBidInfo] = useState<any>(null);
  const [pitches, setPitches] = useState<any[]>([]);
  const [relatedOpportunities, setRelatedOpportunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordRTCRecorder, setRecordRTCRecorder] = useState<any>(null); // RecordRTC instance
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionSuccess, setTranscriptionSuccess] = useState(false);
  
  // Prevent any accidental navigation during transcription
  useEffect(() => {
    if (isTranscribing) {
      console.log('[Transcription] Transcription in progress, preventing navigation...');
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isTranscribing]);
  
  // User pitch status state - prevent duplicate pitches
  const [userPitchStatus, setUserPitchStatus] = useState<{
    hasSubmitted: boolean;
    isPending: boolean;
    pitch: any;
    message: string;
    hasDraft?: boolean;
  } | null>(null);
  const [isCheckingPitchStatus, setIsCheckingPitchStatus] = useState(false);
  
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Improved logo loading handler for retina displays
  const handleLogoLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    // On retina displays, wait a bit to ensure proper loading
    setTimeout(() => {
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setLogoLoaded(true);
        setLogoFailed(false);
        console.log(`✅ Detail logo loaded successfully: ${img.naturalWidth}x${img.naturalHeight}`);
      } else {
        console.log(`❌ Detail logo failed dimension check: ${img.naturalWidth}x${img.naturalHeight}`);
        setLogoFailed(true);
      }
    }, 100);
  };

  const handleLogoError = () => {
            console.log(`❌ Detail logo failed to load`);
        setLogoFailed(true);
        setLogoLoaded(false);
      };

      // Get the appropriate logo URL - same approach as opportunity card
      const getLogoUrl = () => {
        if (!opportunity) return '';
        
        const logo = opportunity.outletLogo;
        
        // Same logic as opportunity card
        const logoUrl = logo && logo.trim() && logo !== 'null' && logo !== 'undefined' 
          ? (logo.startsWith('http') || logo.startsWith('data:') 
              ? logo 
              : `${window.location.origin}${logo}`)
          : '';
        
        return logoUrl;
      };
  
  // Check if user has already pitched for this opportunity
  const checkUserPitchStatus = async (opportunityId: number) => {
    try {
      setIsCheckingPitchStatus(true);
      
      const response = await apiFetch(`/api/opportunities/${opportunityId}/user-pitch-status`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const pitchStatus = await response.json();
        setUserPitchStatus(pitchStatus);
        
        // If user has a draft, load it into the pitch content
        if (pitchStatus.hasDraft && pitchStatus.draftPitch?.content) {
          setPitchContent(pitchStatus.draftPitch.content);
        }
      } else {
        // If it fails (like user not authenticated), just set default state
        setUserPitchStatus({
          hasSubmitted: false,
          isPending: false,
          pitch: null,
          message: "No pitch submitted yet."
        });
      }
    } catch (error) {
      console.log('Error checking user pitch status:', error);
      // Default to allowing pitch submission if check fails
      setUserPitchStatus({
        hasSubmitted: false,
        isPending: false,
        pitch: null,
        message: "No pitch submitted yet."
      });
    } finally {
      setIsCheckingPitchStatus(false);
    }
  };
  
  // Component mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      console.log('[Component] OpportunityDetail unmounting...');
      isMountedRef.current = false;
      
      // Clean up media resources
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  // Fetch opportunity data
  useEffect(() => {
    const fetchOpportunityData = async () => {
      if (!opportunityId) return;
      
      // Scroll to top when navigating to a new opportunity
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Reset all state when opportunity changes
      setOpportunity(null);
      setPriceHistory([]);
      setBidInfo(null);
      setPitches([]);
      setRelatedOpportunities([]);
      setUserPitchStatus(null);
      setPitchContent('');
      setError(null);
      setLogoFailed(false);
      
      setIsLoading(true);
      
      try {
        // Fetch opportunity details
        const opportunityResponse = await apiFetch(`/api/opportunities/${opportunityId}`, {
          credentials: 'include'
        });
        
        if (!opportunityResponse.ok) {
          throw new Error('Failed to fetch opportunity details');
        }
        
        const opportunityData = await opportunityResponse.json();
        setOpportunity(opportunityData);
        
        // Fetch price history - Load complete accumulated price movement history
        try {
          console.log('📊 Loading complete price history for opportunity:', opportunityId);
          const priceResponse = await apiFetch(`/api/opportunities/${opportunityId}/price-trend?window=30d`, {
            credentials: 'include'
          });
          
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            console.log('📊 Loaded price history from database:', priceData.length, 'data points');
            
            // Transform database price history for the chart
            // The API returns format: { t: timestamp, p: price }
            const chartData = priceData.map((item: any) => ({
              timestamp: new Date(item.t).getTime(),
              price: Number(item.p),
              date: new Date(item.t),
              label: format(new Date(item.t), 'MMM d, HH:mm:ss'),
              slotsRemaining: opportunityData.slotsRemaining || 5,
              trend: 'historical',
              isRealTime: false
            }));
            
            setPriceHistory(chartData);
            console.log('📊 Chart will show COMPLETE PERSISTENT JOURNEY:', chartData.length, 'recorded price points');
          }
        } catch (priceError) {
          console.log('📊 Price history API not available, will create base price point');
          // Will create base price point below regardless
        }
        
        // ALWAYS ensure we have a base price starting point
        const basePrice = opportunityData.tier === 1 ? 225 : 
                         opportunityData.tier === 2 ? 175 : 125;
        
        const startTime = new Date(opportunityData.postedAt || opportunityData.createdAt);
        
        const initialPricePoint = {
          timestamp: startTime.getTime(),
          price: basePrice,
          date: startTime,
          label: format(startTime, 'MMM d, HH:mm'),
          slotsRemaining: opportunityData.slotsRemaining || 5,
          trend: 'initial',
          isRealTime: false
        };
        
        // If we don't have any price history, start with base price
        // If we do have history, ensure it starts with the base price
        setPriceHistory(prev => {
          if (prev.length === 0) {
            console.log('📊 No existing history - starting with tier base price:', basePrice, 'for tier', opportunityData.tier);
            return [initialPricePoint];
          } else {
            // Check if first point is the base price
            const firstPoint = prev[0];
            if (firstPoint.price !== basePrice || Math.abs(firstPoint.timestamp - startTime.getTime()) > 60000) {
              console.log('📊 Prepending tier base price to existing history:', basePrice, 'for tier', opportunityData.tier);
              return [initialPricePoint, ...prev];
            } else {
              console.log('📊 Using existing price history that already starts with base price:', prev.length, 'points');
              return prev;
            }
          }
        });
        
        // Fetch bid info
        try {
          const bidResponse = await apiFetch(`/api/opportunities/${opportunityId}/bid-info`, {
            credentials: 'include'
          });
          
          if (bidResponse.ok) {
            const bidData = await bidResponse.json();
            setBidInfo(bidData);
          }
        } catch (bidError) {
          console.log('Bid info not available, using fallback data');
          // Generate fallback bid info
          setBidInfo({
            opportunityId: opportunityData.id,
            currentPrice: opportunityData.currentPrice || opportunityData.basePrice || 100,
            minBid: (opportunityData.currentPrice || opportunityData.basePrice || 100) + 50,
            deadline: opportunityData.deadline,
            slotsRemaining: opportunityData.slotsRemaining || 3,
            slotsTotal: opportunityData.slotsTotal || 5
          });
        }
        
        // Fetch pitches with user data
        try {
          const pitchesResponse = await apiFetch(`/api/opportunities/${opportunityId}/pitches-with-users`, {
            credentials: 'include'
          });
          
          if (pitchesResponse.ok) {
            const pitchesData = await pitchesResponse.json();
            setPitches(pitchesData || []);
          }
        } catch (pitchError) {
          console.log('Pitches not available, using fallback data');
          setPitches([]);
        }

        // Fetch related opportunities by industry
        // CRITICAL FIX: Use primary industry field, not first topic tag
        const primaryCategory = opportunityData.industry || opportunityData.topicTags?.[0] || 'General';
        console.log('🎯 [RELATED OPPORTUNITIES] Using primary industry for matching:', {
          primaryIndustry: opportunityData.industry,
          firstTopicTag: opportunityData.topicTags?.[0],
          selectedCategory: primaryCategory,
          opportunityTitle: opportunityData.title?.substring(0, 50)
        });
        try {
          const relatedResponse = await apiFetch(`/api/opportunities/related/${encodeURIComponent(primaryCategory)}?exclude=${opportunityId}`, {
            credentials: 'include'
          });
          
          if (relatedResponse.ok) {
            const relatedData = await relatedResponse.json();
            setRelatedOpportunities(relatedData || []);
          }
        } catch (relatedError) {
          console.log('Related opportunities not available, using fallback data');
          setRelatedOpportunities([]);
        }

        // Check if user has already pitched for this opportunity
        await checkUserPitchStatus(opportunityData.id);
        
        // Load existing draft after checking pitch status
        if (!userPitchStatus?.hasSubmitted) {
          await loadExistingDraft();
        }
        
      } catch (err) {
        console.error('Error fetching opportunity data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load opportunity');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOpportunityData();
  }, [opportunityId]);
  
  // Auto-save draft when pitch content changes
  useEffect(() => {
    if (!pitchContent || userPitchStatus?.hasSubmitted) return;
    
    const autoSaveTimer = setTimeout(async () => {
      console.log('🔥 Auto-save triggered:', { pitchContent: pitchContent.length, draftId, hasSubmitted: userPitchStatus?.hasSubmitted });
      
      if (!draftId && pitchContent.trim().length >= 1) {
        // Create draft if user starts typing (minimum 1 character)
        console.log('🔥 Creating draft...');
        const newDraft = await createDraft();
        console.log('🔥 Draft creation result:', newDraft);
      } else if (draftId && pitchContent.trim().length >= 1) {
        // Save existing draft (minimum 1 character)
        console.log('🔥 Saving existing draft:', draftId);
        await saveDraft();
      }
    }, 500); // Wait 500ms after user stops typing for faster response
    
    return () => clearTimeout(autoSaveTimer);
  }, [pitchContent, draftId, userPitchStatus?.hasSubmitted, createDraft, saveDraft]);

  // Scroll to pitch section if anchor is present - Enhanced for navigation from other pages
  useEffect(() => {
    const handleScrollToPitchSection = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const scrollParam = urlParams.get('scroll');
      
      if (window.location.hash === '#pitch-section' || scrollParam === 'pitch-section') {
        console.log('🎯 Hash detected: #pitch-section or scroll=pitch-section - initiating scroll');
        
        const scrollToPitchSection = () => {
          const element = document.getElementById('pitch-section');
          if (element) {
            console.log('✅ Found pitch-section element, scrolling...');
            
            // Scroll to the top of the pitch section with better positioning
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start', // Changed from 'center' to 'start' for better positioning
              inline: 'nearest'
            });
            return true;
          }
          console.log('❌ Pitch-section element not found');
          return false;
        };

        // Try multiple times with increasing delays to handle loading states
        const attempts = [0, 100, 300, 600, 1000, 1500, 2000];
        attempts.forEach(delay => {
          setTimeout(() => {
            if (scrollToPitchSection()) {
              console.log('🎯 Successfully scrolled to pitch section');
            }
          }, delay);
        });
      }
    };

    // Run immediately on mount
    handleScrollToPitchSection();

    // Also listen for hash changes (when navigating within the same page)
    const handleHashChange = () => {
      console.log('🔄 Hash changed:', window.location.hash);
      handleScrollToPitchSection();
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [opportunity, isLoading]); // Depend on opportunity and loading state changes

  // Real-time price history state
  const [realTimePriceHistory, setRealTimePriceHistory] = useState<any[]>([]);
  
    // Real-time price update effect - Record EVERY price update from the engine
  useEffect(() => {
    if (!priceData || !opportunity) return;
    
    const now = new Date();
    const currentTimestamp = now.getTime();
    
    console.log('📊 🎯 CAPTURING EVERY PRICE UPDATE:', priceData.currentPrice, 'at', now.toISOString());
    
    // Create new price point for every update
    const newPricePoint = {
      timestamp: currentTimestamp,
      price: priceData.currentPrice,
      date: now,
      label: format(now, 'MMM d, HH:mm:ss'),
      slotsRemaining: opportunity.slotsRemaining || 5,
      trend: priceData.trend || 'stable',
      isRealTime: true
    };
    
    // Add to real-time array for immediate feedback
    setRealTimePriceHistory(prev => {
      console.log('📊 Adding to real-time history (total will be:', prev.length + 1, ')');
      return [...prev, newPricePoint].slice(-100); // Keep last 100 for performance
    });
    
    // CRITICAL: Record EVERY price update to persistent history
    setPriceHistory(prev => {
      const lastEntry = prev[prev.length - 1];
      
      // Record EVERY price update - no filtering by time or amount
      // Only skip if it's literally the exact same price at the exact same timestamp
      const isDuplicate = lastEntry && 
        lastEntry.price === priceData.currentPrice && 
        Math.abs(new Date(lastEntry.timestamp).getTime() - currentTimestamp) < 5000; // 5 second buffer for duplicates
      
      if (!isDuplicate) {
        const persistentPoint = {
          timestamp: now.toISOString(),
          price: priceData.currentPrice,
          date: now,
          label: format(now, 'MMM d, HH:mm:ss'),
          slotsRemaining: opportunity.slotsRemaining || 5,
          trend: priceData.trend || 'stable',
          isRealTime: true
        };
        
        console.log('📊 ✅ RECORDED TO PERSISTENT HISTORY:', persistentPoint.price, '(total history:', prev.length + 1, 'points)');
        return [...prev, persistentPoint];
      } else {
        console.log('📊 ⏭️  Skipping duplicate price point');
        return prev;
      }
    });
  }, [priceData?.currentPrice, priceData?.trend, priceData?.lastPriceUpdate, opportunity]);

    // No auto-refresh needed - we capture every price update directly from the engine
  

  
  // Enhanced price data processing - Show complete persistent price journey
  const getEnhancedPriceData = () => {
    if (!opportunity) return [];
    
    // Get tier base price
    const tierBasePrice = opportunity.tier === 1 ? 225 : 
                         opportunity.tier === 2 ? 175 : 125;
    const oppStartDate = new Date(opportunity.postedAt || opportunity.createdAt);
    
    const basePricePoint = {
      timestamp: oppStartDate.getTime(),
      price: tierBasePrice,
      date: oppStartDate,
      label: format(oppStartDate, 'MMM d, HH:mm'),
      slotsRemaining: opportunity.slotsRemaining || 5,
      trend: 'initial',
      isRealTime: false
    };
    
    // Always use the persistent price history as the primary data source
    if (priceHistory.length > 0) {
      console.log('📊 Using persistent price history:', priceHistory.length, 'points');
      
      // Transform persistent history for chart display
      const persistentData = priceHistory.map((item: any) => ({
        timestamp: new Date(item.timestamp).getTime(),
        price: item.price,
        date: new Date(item.timestamp),
        label: item.label || format(new Date(item.timestamp), 'MMM d, HH:mm'),
        slotsRemaining: item.slotsRemaining || opportunity.slotsRemaining || 5,
        trend: item.trend || 'historical',
        isRealTime: item.isRealTime || false
      }));
      
      // Add any recent real-time points that might not be in persistent history yet
      if (realTimePriceHistory.length > 0) {
        const lastPersistentTime = persistentData[persistentData.length - 1]?.timestamp || 0;
        const newRealTimePoints = realTimePriceHistory.filter(rt => rt.timestamp > lastPersistentTime);
        
        if (newRealTimePoints.length > 0) {
          console.log('📊 Adding', newRealTimePoints.length, 'new real-time points');
          persistentData.push(...newRealTimePoints);
        }
      }
      
      // Ensure chart ALWAYS starts with tier base price
      const firstPoint = persistentData[0];
      if (!firstPoint || firstPoint.price !== tierBasePrice) {
        console.log('📊 🎯 PREPENDING TIER BASE PRICE:', tierBasePrice, 'for tier', opportunity.tier);
        persistentData.unshift(basePricePoint);
      }
      
      // Sort by timestamp to ensure chronological order
      const sortedData = persistentData.sort((a, b) => a.timestamp - b.timestamp);
      console.log('📊 Complete price journey:', sortedData.length, 'data points');
      return sortedData;
    }
    
    // Generate base price point if we have no price history at all
    console.log('📊 No price history found, generating TIER BASE PRICE as starting point');
    const startDate = new Date(opportunity.postedAt || opportunity.createdAt);
    const basePrice = opportunity.tier === 1 ? 225 : 
                     opportunity.tier === 2 ? 175 : 125;
    
    console.log('📊 🎯 CHART WILL START AT TIER', opportunity.tier, 'BASE PRICE:', basePrice);
    
    return [{
      timestamp: startDate.getTime(),
      price: basePrice,
      date: startDate,
      label: format(startDate, 'MMM d, HH:mm'),
      slotsRemaining: opportunity.slotsRemaining || 5,
      trend: 'initial',
      isRealTime: false
    }];
  };

  // Use the enhanced price data which includes the complete persistent price journey
  // Make this reactive to state changes using useMemo
  const priceDataForChart = useMemo(() => {
    return getEnhancedPriceData();
  }, [priceHistory, realTimePriceHistory, opportunity]);

  // Loading state
  if (isLoading) {
    return <LoadingScreen message="Loading opportunity..." size="lg" />;
  }
  
  // Error state
  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Opportunity not found'}</p>
          <Link href="/opportunities">
            <Button>Back to Opportunities</Button>
          </Link>
        </div>
      </div>
    );
  }

  // CRITICAL FIX: For closed opportunities, use static final price - NO FETCHING!
  const currentPrice = (() => {
    const opportunityStatus = getOpportunityStatus(opportunity);
    
    if (opportunityStatus === 'closed') {
      // For closed opportunities, use the stored final price, no live fetching
      const finalPrice = opportunity?.lastPrice || opportunity?.last_price || opportunity?.finalPrice;
      console.log(`🏁 Closed opportunity ${opportunityId} using final price: $${finalPrice || opportunity?.currentPrice}`);
      return finalPrice || opportunity?.currentPrice || opportunity?.basePrice || 100;
    } else {
      // For open opportunities, use live price data
      return priceData?.currentPrice || opportunity?.currentPrice || opportunity?.basePrice || 100;
    }
  })();
  const priceTrend = priceData?.trend || 'stable';
  const priceIncrease = currentPrice - (opportunity?.basePrice || 100);
  
  // Enhanced dynamic pricing detection
  const isDynamicPricing = priceData || isConnected || (Math.abs(priceIncrease) > 0);
  
  // Calculate actual percentage difference from base/list price
  const basePrice = opportunity?.basePrice || opportunity?.minimumBid || 100;
  const actualPriceDifference = ((currentPrice - basePrice) / basePrice) * 100;
  const belowListPercentage = Math.abs(actualPriceDifference);
  const maxPitchLength = 2000;
  const remainingChars = maxPitchLength - pitchContent.length;
  
  // Calculate if today is the deadline
  const isToday = opportunity?.deadline ? format(new Date(opportunity.deadline), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false;



  const handleSecurePitch = async () => {
    try {
      // Check if user has already submitted a pitch
      if (userPitchStatus?.hasSubmitted) {
        toast({
          title: "Pitch Already Submitted",
          description: userPitchStatus.message,
          variant: "destructive"
        });
        return;
      }

      // Validation
      if (!pitchContent.trim()) {
        toast({
          title: "Pitch Required",
          description: "Please write your pitch before submitting.",
          variant: "destructive"
        });
        return;
      }
      
      if (pitchContent.trim().length < 1) {
        toast({
          title: "Pitch Too Short",
          description: "Please provide a pitch (minimum 1 character).",
          variant: "destructive"
        });
        return;
      }

      // Submit the pitch
      const pitchData = {
        opportunityId: opportunity.id,
        content: pitchContent.trim(),
        bidAmount: currentPrice,
        status: 'pending'
      };

      console.log('Submitting pitch:', pitchData);

      const response = await apiRequest('POST', '/api/pitches', pitchData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit pitch');
      }

      const result = await response.json();
      console.log('Pitch submitted successfully:', result);

      // Update user pitch status to reflect submission
      setUserPitchStatus({
        hasSubmitted: true,
        isPending: true,
        pitch: result,
        message: "Your pitch has been submitted and is being reviewed."
      });

      // Show success message
      toast({
        title: "Pitch Submitted Successfully! 🎉",
        description: `Your pitch has been submitted at $${currentPrice} and is now being reviewed by the admin team.`,
      });

      // Clear the pitch content
      setPitchContent('');

      // Invalidate cache for My Pitches page to show the new pitch
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/pitches`] });
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/drafts`] });
        // Also invalidate the pitch status check for this opportunity
        queryClient.invalidateQueries({ queryKey: [`/api/opportunities/${opportunity.id}/user-pitch-status`] });
      }

      // No need to re-check pitch status - we already updated the state above

    } catch (error) {
      console.error('Error submitting pitch:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : 'Failed to submit pitch. Please try again.',
        variant: "destructive"
      });
    }
  };

  // Get tier display
  const getTierDisplay = (tier: any) => {
    if (typeof tier === 'number') return tier;
    if (typeof tier === 'string') {
      // Remove all instances of "Tier" (case insensitive) and extract just the number
      const cleanTier = tier.replace(/tier\s*/gi, '').trim();
      const parsed = parseInt(cleanTier);
      return isNaN(parsed) ? 1 : parsed;
    }
    return 1; // Default
  };

  // Mobile detection utility
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const isIOSDevice = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  // Check if recording is supported
  const isRecordingSupported = () => {
    try {
    return !!(navigator.mediaDevices && 
              window.MediaRecorder);
    } catch {
      return false;
    }
  };

  // Voice recording functions - Mobile Compatible
  const startRecording = async () => {
    console.log('[Voice Recording] Starting recording...');
    console.log('[Voice Recording] Mobile device:', isMobileDevice());
    console.log('[Voice Recording] iOS device:', isIOSDevice());
    console.log('[Voice Recording] Recording supported:', isRecordingSupported());
    
    try {
      setRecorderError(null);

      // Check if recording is supported
      if (!isRecordingSupported()) {
        setRecorderError('Audio recording is not supported on this device/browser. Please type your pitch instead.');
        return;
      }

      // iOS specific checks
      if (isIOSDevice()) {
        // Check if we're in a secure context (HTTPS)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
          setRecorderError('Audio recording requires HTTPS on iOS devices. Please type your pitch instead.');
          return;
        }

        // Check if MediaRecorder is available
        if (!window.MediaRecorder) {
          setRecorderError('Audio recording is not available on this iOS version. Please type your pitch instead.');
          return;
        }
      }

      // Request microphone access with mobile-optimized settings
      let mediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      // iOS specific audio constraints
      if (isIOSDevice()) {
        mediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
      }

      console.log('[Voice Recording] Requesting microphone access...');
      
      // Try to get media stream with timeout for mobile
      const mediaStream = await Promise.race([
        navigator.mediaDevices.getUserMedia(mediaStreamConstraints),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Microphone access timeout')), 10000)
        )
      ]) as MediaStream;
      
      console.log('[Voice Recording] Got media stream:', mediaStream);
      setStream(mediaStream);
      
      // Determine the best MIME type for the device
      let mimeType = 'audio/webm;codecs=opus';
      
      if (isIOSDevice()) {
        // iOS preferred formats
        const iosTypes = ['audio/mp4', 'audio/aac', 'audio/wav'];
        for (const type of iosTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }
      } else if (isMobileDevice()) {
        // Android preferred formats
        const androidTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
        for (const type of androidTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }
      }

      console.log('[Voice Recording] Using MIME type:', mimeType);
      
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: mimeType
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('[Voice Recording] Got chunk:', event.data.size, 'bytes');
        }
      };
      
      recorder.onstop = async () => {
        console.log('[Voice Recording] Recording stopped, creating blob...');
        const blob = new Blob(chunks, { type: mimeType });
        setRecordingBlob(blob);
        setIsRecording(false);
        
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        
        if (recordingInterval.current) {
          clearInterval(recordingInterval.current);
        }
        
        console.log('[Voice Recording] Recording complete, blob size:', blob.size);
        
        // Mobile-specific success message
        if (isMobileDevice()) {
          console.log('[Voice Recording] Mobile recording completed successfully!');
        }
        
        // Use setTimeout to prevent any synchronous issues
        setTimeout(async () => {
          try {
            await transcribeAudio(blob);
          } catch (error) {
            console.error('[Voice Recording] Error in transcription:', error);
          }
        }, 250);
      };
      
      recorder.onerror = (event) => {
        console.error('[Voice Recording] Recording error:', event);
        let errorMessage = 'Recording failed. Please try again.';
        
        if (isMobileDevice()) {
          errorMessage = 'Mobile recording failed. Please check microphone permissions and try again, or type your pitch instead.';
        }
        
        setRecorderError(errorMessage);
        setIsRecording(false);
      };
      
      // Start recording
      recorder.start(isMobileDevice() ? 1000 : 100); // Larger chunks for mobile
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= 120) {
            stopRecording();
            return 120;
          }
          return newTime;
        });
      }, 1000);
      
      console.log('[Voice Recording] Recording started successfully!');
      
    } catch (err) {
      console.error('[Voice Recording] Error starting recording:', err);
      setRecorderError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsRecording(false);
    }
  };
  
  const stopRecording = () => {
    console.log('[Voice Recording] Stopping recording...');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      console.log('[Transcription] Starting transcription...');
      setIsTranscribing(true);
      setRecorderError(null);
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;
      
      console.log('[Transcription] About to send API request...');
      
      // Send to transcription API
      const response = await apiFetch('/api/pitches/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          audio: base64Audio
        })
      });
      
      console.log('[Transcription] API response received, status:', response.status);
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const result = await response.json();
      console.log('[Transcription] Success, result:', result);
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log('[Transcription] Component unmounted, skipping state updates');
        return;
      }

      // Batch all state updates to prevent multiple re-renders
      if (result.text) {
        const transcribedText = result.text.trim();
        console.log('[Transcription] Adding text to pitch:', transcribedText.length, 'characters');
        
        // Update pitch content immediately
        setPitchContent(prev => {
          const separator = prev.trim() ? '\n\n' : '';
          const newContent = prev + separator + transcribedText;
          console.log('[Transcription] New pitch content length:', newContent.length);
          return newContent;
        });
        
        console.log('[Transcription] Pitch content updated, cleaning up...');
        
        // Clean up recording state
        setRecordingBlob(null);
        setAudioURL(null);
        setRecordingTime(0);
        
        // Show success feedback without global toast
        console.log('[Transcription] Voice transcription completed successfully!');
        console.log(`[Transcription] Added ${transcribedText.length} characters to pitch content`);
        
        // Set transcription success state for UI feedback
        setTranscriptionSuccess(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setTranscriptionSuccess(false);
          }
        }, 3000);
      } else {
        console.log('[Transcription] No text in result, cleaning up...');
        setRecordingBlob(null);
        setAudioURL(null);
        setRecordingTime(0);
      }
      
      console.log('[Transcription] Transcription process complete');
      
    } catch (error) {
      console.error('[Transcription] Error:', error);
      setRecorderError('Failed to transcribe audio. Please try again.');
      
      // Keep the audio blob in case user wants to retry manually
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);
    } finally {
      console.log('[Transcription] Setting isTranscribing to false...');
      if (isMountedRef.current) {
        setIsTranscribing(false);
      }
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Additional depth layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-100/30 via-transparent to-white/20" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 via-transparent to-indigo-100/30" />
      
      {/* Main Content */}
      <div className="relative z-10 mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Light Container Wrapper */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Compact Professional Header with Logo + Name */}
            <div className="pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-200/50">
              <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                {/* Logo Container */}
                <div className="flex-shrink-0">
                  {getLogoUrl() && !logoFailed ? (
                    <div className="w-16 h-16 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 flex-shrink-0 flex items-center justify-center bg-white rounded-lg border border-gray-200/50 overflow-hidden shadow-md">
                      <img
                        src={getLogoUrl()}
                        alt={`${opportunity.outlet} logo`}
                        className="w-full h-full object-contain"
                        onError={handleLogoError}
                        onLoad={handleLogoLoad}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 flex-shrink-0 flex items-center justify-center bg-white rounded-lg border border-gray-200/50 overflow-hidden shadow-md">
                      <span className="text-gray-700 font-bold text-lg sm:text-base md:text-lg lg:text-xl xl:text-2xl">
                        {opportunity.outlet?.split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Publication Name and Tier */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between mb-1">
                    <h2 className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                      {opportunity.outlet}
                    </h2>
                    <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ml-2">
                      Tier {getTierDisplay(opportunity.tier)}
                    </Badge>
                  </div>
                  {/* Optional: Add publication tagline or category */}
                  <p className="text-sm text-gray-600 leading-tight">Premium Media Opportunity</p>
                </div>
              </div>
            </div>

            {/* Opportunity Title */}
            <div className="pt-4 sm:pt-6 mb-4 sm:mb-6">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black leading-tight">
                {opportunity.title}
              </h1>
            </div>

            {/* Topic Tags - Compact inline display */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center flex-wrap gap-2">
                {(opportunity.topicTags || []).map((tag: string, index: number) => (
                  <div 
                    key={`${tag}-${index}`}
                    className="text-xs sm:text-sm px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 rounded-full shadow-sm border border-gray-200 hover:bg-gray-150 transition-colors"
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>

            {/* Key Info Row - More colorful design with left-aligned dates */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-2 sm:p-4 mb-4 sm:mb-6 border border-blue-200/20 shadow-md">
              {/* Posted Date - Left aligned */}
              <div className="flex items-center space-x-2">
                <div className="p-1 sm:p-2 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg shadow-md flex items-center justify-center">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] sm:text-xs font-semibold text-blue-600 uppercase tracking-wide">Posted</div>
                  <div className="text-[11px] sm:text-sm font-bold text-gray-900">
                    {format(new Date(opportunity.postedAt || opportunity.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="h-8 sm:h-12 w-px bg-gradient-to-b from-transparent via-blue-300 to-transparent"></div>

              {/* Deadline - Left aligned */}
              <div className="flex items-center space-x-2">
                <div className="p-1 sm:p-2 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg shadow-md flex items-center justify-center">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] sm:text-xs font-semibold text-orange-600 uppercase tracking-wide">Deadline</div>
                  <div className="text-[11px] sm:text-sm font-bold text-gray-900 flex items-center space-x-1 sm:space-x-2">
                    <span>{format(new Date(opportunity.deadline), 'MMM d, yyyy')}</span>
                    {isToday && (
                      <Badge className="hidden sm:inline-flex bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-1 py-0.5 shadow-md">
                        Today
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="h-8 sm:h-12 w-px bg-gradient-to-b from-transparent via-green-300 to-transparent"></div>

              {/* Status - Left aligned */}
              <div className="flex items-center space-x-2">
                <div className="p-1 sm:p-2 bg-gradient-to-br from-green-400 to-green-500 rounded-lg shadow-md flex items-center justify-center">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="flex items-center space-x-2 mb-1">
                  <div className="text-[11px] sm:text-xs font-semibold text-green-600 uppercase tracking-wide">
                    {getOpportunityStatus(opportunity) === 'closed' ? 'Final Price' : 'Current Price'}
                  </div>
                  </div>
                  <div className={`text-[11px] sm:text-sm font-bold ${priceData ? 'text-blue-600' : 'text-gray-900'} transition-colors duration-300`}>
                    ${currentPrice}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity - Enhanced with gradients */}
            <div className="mb-6 sm:mb-8 lg:mb-10">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 backdrop-blur-sm rounded-xl border border-blue-200/50 p-2 sm:p-4 mb-4 sm:mb-6 shadow-lg">
                <div className="flex flex-row flex-wrap items-center gap-1 sm:gap-2 lg:gap-4">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="relative flex items-center justify-center w-3 h-3 sm:w-4 sm:h-4">
                      {getOpportunityStatus(opportunity) === 'closed' ? (
                        <Lock className="w-2 h-2 sm:w-3 sm:h-3 text-gray-600" />
                      ) : (
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-400/50"></span>
                      )}
                    </div>
                    <span className="text-sm sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {getOpportunityStatus(opportunity) === 'closed' ? 'Final Status:' : 'Live Activity:'}
                    </span>
                  </div>
                  
                  {getOpportunityStatus(opportunity) === 'closed' ? (
                    <div className="flex items-center space-x-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg bg-gray-100 border border-gray-300/50 shadow-md">
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">
                        Closed at ${opportunity.lastPrice || opportunity.currentPrice || opportunity.basePrice}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className={`flex items-center space-x-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg shadow-md ${
                      priceIncrease >= 0 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50'
                        : 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200/50'
                    }`}>
                      {priceIncrease >= 0 ? (
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      ) : (
                          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                      )}
                        <span className={`text-xs sm:text-sm font-semibold ${
                        priceIncrease >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        ${Math.abs(priceIncrease)} {priceIncrease >= 0 ? 'increase' : 'decrease'} 
                      </span>
                    </div>
                    
                      <div className="flex items-center space-x-1 bg-gradient-to-r from-orange-50 to-amber-50 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border border-orange-200/50 shadow-md">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                        <span className="text-xs sm:text-sm font-semibold text-orange-700">
                            {Math.max(0, Math.ceil((new Date(opportunity.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)))}h remaining
                        </span>
                    </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Opportunity Brief Card - Lighter, more professional blue */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl overflow-hidden mb-4 sm:mb-6 shadow-lg border border-blue-200/50 relative">
              {/* Classification Badge - Top Right */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                <Badge className={`border-0 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold shadow-sm ${
                      getOpportunityStatus(opportunity) === 'open' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : 'bg-gradient-to-r from-red-400 to-pink-500 text-white'
                    }`}>
                      {getOpportunityStatus(opportunity).charAt(0).toUpperCase() + getOpportunityStatus(opportunity).slice(1)}
                    </Badge>
              </div>
              
              <div className="p-3 sm:p-4">
                {/* Header */}
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  {/* Title Row */}
                  <div className="flex items-center space-x-2 sm:space-x-3 pr-16 sm:pr-20">
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full shadow-md animate-pulse"></span>
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-400 rounded-full shadow-md animate-pulse animation-delay-200"></span>
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-300 rounded-full shadow-md animate-pulse animation-delay-400"></span>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-blue-900 tracking-wide">
                      Opportunity Brief
                    </h3>
                  </div>
                  
                  {/* Expand/Minimize Button */}
                  <div className="flex justify-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsBriefMinimized(!isBriefMinimized)}
                      className="flex items-center space-x-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100/50 transition-all duration-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium"
                    >
                      <ChevronUp className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-300 ${isBriefMinimized ? 'rotate-180' : ''}`} />
                      <span className="text-xs sm:text-sm">{isBriefMinimized ? 'Expand Brief' : 'Minimize Brief'}</span>
                    </Button>
                  </div>
                </div>

                {/* Content */}
                {!isBriefMinimized && (
                  <div className="mb-3 sm:mb-4">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-blue-100">
                      <div className="p-3 sm:p-4">
                        <div className="text-black text-sm sm:text-base leading-relaxed space-y-2 sm:space-y-3 font-medium">
                          {opportunity.summary ? (
                            <div className="whitespace-pre-wrap">
                              {opportunity.summary.split('\n\n').map((paragraph: string, index: number) => (
                                <p key={index} className="mb-2 sm:mb-3 last:mb-0 font-medium text-black">
                                  {paragraph.split('\n').map((line: string, lineIndex: number) => (
                                    <span key={lineIndex}>
                                      {line}
                                      {lineIndex < paragraph.split('\n').length - 1 && <br />}
                                    </span>
                                  ))}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-black mb-2 sm:mb-3 text-base sm:text-lg">
                                {opportunity.title}
                              </p>
                              <p className="text-black leading-relaxed text-sm sm:text-base font-medium">
                                This opportunity is seeking expert commentary and insights. Please provide your relevant experience and perspective in your pitch.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                </div>
              </div>

            {/* Closed Opportunity Banner */}
            {getOpportunityStatus(opportunity) === 'closed' && (
              <div className="bg-gradient-to-r from-yellow-100/80 to-orange-100/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 border border-yellow-300/50">
                {/* Title Row with Icon */}
                <div className="flex items-start space-x-2 sm:space-x-3 md:space-x-4 mb-3 sm:mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-yellow-800 font-bold text-base sm:text-lg md:text-xl leading-tight">Opportunity Closed — Dynamic Pricing Frozen</h4>
                  </div>
                </div>
                
                {/* Description Text - Full Width */}
                <div className="space-y-3">
                  <p className="text-red-900 leading-relaxed text-sm sm:text-base md:text-lg">
                    This placement is no longer live. The last recorded market rate was{' '}
                    <span className="font-bold text-red-800 bg-red-200 px-2 py-1 sm:px-3 sm:py-1 rounded-md">
                      ${(() => {
                        // CRITICAL FIX: Use proper final price logic for closed opportunities
                        const finalPrice = opportunity.lastPrice || opportunity.last_price;
                        if (finalPrice) {
                          return finalPrice;
                        }
                        // Fallback to currentPrice if no final price is recorded
                        return opportunity.currentPrice || opportunity.basePrice;
                      })()}
                    </span>{' '}
                    before the opportunity was closed. You may still pitch at that fixed price.
                  </p>
                  <p className="text-yellow-600/70 text-xs sm:text-sm leading-relaxed">
                    Opportunities close when reporters stop accepting new pitches, or when the deadline has been reached.
                  </p>
                </div>
              </div>
            )}

            {/* Marketplace Pricing Section - Enhanced with gradients */}
            <div id="pitch-section" style={{position: 'absolute', transform: 'translateY(-60px)'}}></div>
            <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-3xl border border-indigo-200/30 overflow-hidden shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Price Trend Section - Left Side */}
                <div className="p-3 sm:p-4 lg:p-6 lg:border-r border-gray-200/50">
                  <div className="mb-2 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">Price History</h3>
                    </div>
                    {/* Interactive Price Chart - Mobile Optimized */}
                    <div className="w-full">
                      <PriceTrendChart
                        data={priceDataForChart.map(p => ({
                          t: new Date(p.timestamp).toISOString(),
                          p: p.price
                        }))}
                        live={isConnected && !!priceData}
                        theme="light"
                      />
                    </div>

                    {/* Enhanced price range and timeline info */}
                    <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-6 mb-0 sm:mb-0">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 font-bold text-sm sm:text-base">${Math.min(...priceDataForChart.map((p: any) => p.price))}</span>
                          <span className="text-gray-500 text-xs sm:text-sm">Low</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-red-500 font-bold text-sm sm:text-base">${Math.max(...priceDataForChart.map((p: any) => p.price))}</span>
                          <span className="text-gray-500 text-xs sm:text-sm">High</span>
                        </div>
                      </div>
                      
                      {/* Timeline information */}
                      <div className="flex justify-end items-center text-xs text-gray-500 border-t pt-3 sm:pt-2">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          {opportunity && (
                            <>
                              <span>Started {format(new Date(opportunity.postedAt || opportunity.createdAt), 'MMM d')}</span>
                              <span>•</span>
                              <span>Ends {format(new Date(opportunity.deadline), 'MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Price & Pitch Section - Right Side */}
                <div className="p-3 sm:p-4 lg:p-6 relative border-t lg:border-t-0 border-gray-200/50">
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                        {getOpportunityStatus(opportunity) === 'closed' ? 'Final Price' : 'Current Price'}
                      </h3>
                      <div className="flex items-center space-x-1 sm:space-x-2 text-green-600 text-xs sm:text-sm font-medium">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></span>
                        <span>
                          {Math.round(belowListPercentage)}% {actualPriceDifference >= 0 ? 'above' : 'below'} list price
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline space-x-2 sm:space-x-3 mb-2">
                      <span className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black ${
                        priceTrend === 'up' ? 'text-green-600' :
                        priceTrend === 'down' ? 'text-red-600' :
                        priceData ? 'text-blue-600' : 'text-gray-900'
                      } transition-colors duration-300`}>${currentPrice}</span>
                      {priceIncrease !== 0 && (
                        <div className={`flex items-center space-x-1 text-sm sm:text-base md:text-lg font-semibold ${priceIncrease >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <TrendingUp className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ${priceIncrease < 0 ? 'rotate-180' : ''}`} />
                          <span>{priceIncrease >= 0 ? '+' : ''}${priceIncrease}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">

                      {priceData?.lastPriceUpdate && (
                        <div className="text-xs text-gray-500 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Updated {new Date(priceData.lastPriceUpdate).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Pitch Input */}
                    <div className="mb-6">
                      {isCheckingPitchStatus ? (
                        /* Loading Pitch Status */
                        <div className="bg-gray-50 rounded-2xl border border-gray-200/50 p-8">
                          <div className="text-center">
                            <div className="flex justify-center mb-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                            <p className="text-gray-600 font-medium">Checking your pitch status...</p>
                          </div>
                        </div>
                      ) : userPitchStatus?.hasSubmitted ? (
                        /* Already Submitted State */
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200/50 overflow-hidden h-auto min-h-[240px] sm:h-[360px] lg:h-[400px] flex items-center justify-center mt-6">
                          <div className="p-4 sm:p-8 text-center flex flex-col justify-center h-full">
                            {/* Success Icon */}
                            <div className="flex justify-center mb-3 sm:mb-5">
                              <div className="w-12 h-12 sm:w-18 sm:h-18 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 sm:w-9 sm:h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"></path>
                                </svg>
                              </div>
                            </div>
                            
                            {/* Title */}
                            <h3 className="text-lg sm:text-xl font-bold text-green-800 mb-2 sm:mb-4">
                              Pitch Already Submitted!
                            </h3>
                            
                            {/* Message */}
                            <p className="text-green-700 text-sm sm:text-base mb-3 sm:mb-5 leading-relaxed">
                              You've already submitted a pitch for this opportunity. Each user can only submit one pitch per opportunity.
                            </p>
                            
                            {/* Bid Amount Display */}
                            {userPitchStatus.pitch?.bidAmount && (
                              <div className="bg-white/60 rounded-lg p-3 sm:p-4 mb-3 sm:mb-5 border border-green-200/50">
                                <div className="text-xs sm:text-sm font-medium text-green-600 mb-1">Your bid amount:</div>
                                <div className="text-xl sm:text-2xl font-bold text-green-800">
                                  ${userPitchStatus.pitch.bidAmount}
                                </div>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="space-y-2 sm:space-y-3">
                              <Link href="/opportunities">
                                <Button className="w-full bg-white hover:bg-gray-50 text-green-700 border border-green-200 font-semibold py-2 sm:py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm sm:text-base">
                                  <div className="flex items-center justify-center space-x-2">
                                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 rotate-180" />
                                    <span>Browse Other Opportunities</span>
                                  </div>
                                </Button>
                              </Link>
                              
                              <Link href="/my-pitches">
                                <Button variant="outline" className="w-full bg-white/80 hover:bg-white text-green-700 border border-green-200 font-semibold py-2 sm:py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm sm:text-base">
                                  <div className="flex items-center justify-center space-x-2">
                                    <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    <span>View My Pitches</span>
                                  </div>
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Normal Pitch Input State */
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                            <label className="text-gray-700 font-semibold text-lg">Craft your pitch</label>
                            </div>
                            <span className={`text-sm font-medium ${
                              remainingChars < 100 ? 'text-red-500' : 'text-gray-500'
                            }`}>
                              {remainingChars} characters remaining
                            </span>
                          </div>
                          
                          <div className="relative">
                            <Textarea
                              value={pitchContent}
                              onChange={(e) => setPitchContent(e.target.value)}
                              placeholder="Share your expertise, credentials, and unique perspective that would make you perfect for this story. Explain why you're the ideal expert for this opportunity..."
                              className="min-h-[240px] w-full p-4 border border-gray-200 rounded-xl bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all duration-200 resize-none text-gray-800 text-sm sm:text-base font-medium placeholder:text-gray-400 placeholder:font-normal shadow-sm hover:border-gray-300"
                              maxLength={maxPitchLength}
                              style={{
                                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                                lineHeight: '1.5',
                                letterSpacing: '0.01em'
                              }}
                            />
                            
                            {/* Word count indicator */}
                            <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-1 rounded">
                              {pitchContent.trim().split(/\s+/).filter(word => word.length > 0).length} words
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Record Pitch Button - Only show if not submitted and not loading */}
                    {!isCheckingPitchStatus && !userPitchStatus?.hasSubmitted && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <Button
                            type="button"
                            variant="outline"
                            className={`flex items-center space-x-2 border-red-200 hover:bg-red-50 ${
                              isRecording ? 'bg-red-50 text-red-700 border-red-300' : 
                              isTranscribing ? 'bg-blue-50 text-blue-700 border-blue-300' :
                              'text-red-500'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isRecording) {
                                stopRecording();
                              } else {
                                startRecording();
                              }
                            }}
                            disabled={isTranscribing}
                          >
                            {isRecording ? (
                              <>
                                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                                <span className="font-medium">Recording {formatTime(recordingTime)}</span>
                              </>
                            ) : isTranscribing ? (
                              <>
                                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                                <span className="font-medium">Transcribing...</span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="font-medium">Record Pitch</span>
                              </>
                            )}
                          </Button>
                          <span className="text-blue-600 text-sm font-medium">
                            Powered by QuoteBid AI
                          </span>
                        </div>
                        
                        {/* Success indicator */}
                        {transcriptionSuccess && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-green-700 font-medium text-sm">Voice transcribed and added to your pitch!</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recording Error Display - Only show if not submitted and not loading */}
                    {!isCheckingPitchStatus && !userPitchStatus?.hasSubmitted && recorderError && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-red-800">{recorderError}</p>
                        {audioURL && (
                          <button
                            onClick={() => {
                              setRecorderError(null);
                              setAudioURL(null);
                              setRecordingBlob(null);
                            }}
                            className="text-sm text-red-600 hover:text-red-700 mt-2 underline"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    )}

                    {/* Audio Playback - Only show if not submitted and not loading */}
                    {!isCheckingPitchStatus && !userPitchStatus?.hasSubmitted && audioURL && recorderError && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Mic className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">Recording Available (Transcription Failed)</span>
                        </div>
                        <audio controls src={audioURL} className="w-full mb-2"></audio>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => recordingBlob && transcribeAudio(recordingBlob)}
                            disabled={isTranscribing}
                            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            {isTranscribing ? 'Transcribing...' : 'Retry Transcription'}
                          </button>
                          <button
                            onClick={() => {
                              setAudioURL(null);
                              setRecordingBlob(null);
                              setRecorderError(null);
                              setRecordingTime(0);
                            }}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Clear recording
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Secure Pitch Button - Only show if not submitted and not loading */}
                    {!isCheckingPitchStatus && !userPitchStatus?.hasSubmitted && (
                      <>
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSecurePitch();
                          }}
                          className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mb-4 ${
                            priceData ? 'ring-2 ring-blue-300 ring-opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <Lock className="h-5 w-5" />
                            <span>Secure Pitch at ${currentPrice}</span>
                            {priceData && (
                              <Badge className="bg-white/20 text-white text-xs px-2 py-0.5 ml-2">
                                Live Price
                              </Badge>
                            )}
                          </div>
                        </Button>

                        {/* Disclaimer */}
                        <p className="text-gray-500 text-sm text-center leading-relaxed">
                          By pitching, you agree to pay the accepted market rate at the time of submission—only if you're included in the article.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Competition Momentum Section */}
            <div className="mt-6 sm:mt-10 lg:mt-12 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl sm:rounded-3xl border border-orange-200/50 overflow-hidden">
              <div className="p-2.5 sm:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-3 sm:mb-8">
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <div className="p-1.5 sm:p-3 bg-orange-100 rounded-lg sm:rounded-xl">
                      <Flame className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-2xl font-bold text-gray-900">Competition Momentum</h3>
                      <p className="text-gray-600 text-xs sm:text-base leading-tight">Demand level based on expert pitches</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-bold shadow-md">
                    {pitches.length === 0 ? 'Low' : 
                     pitches.length <= 2 ? 'Low' : 
                     pitches.length <= 5 ? 'Medium' : 
                     'High'}
                  </Badge>
                </div>

                {/* Competition Meter */}
                <div className="mb-3 sm:mb-8">
                  <div className="flex items-center justify-between mb-1.5 sm:mb-4">
                    <span className="text-xs sm:text-sm font-medium text-gray-600">Demand Level</span>
                    <span className="text-xs sm:text-sm font-bold text-orange-600">{Math.min(pitches.length * 15, 100)}% Competitive</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 shadow-inner">
                    <div 
                      className="h-2 sm:h-3 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400 transition-all duration-1000 ease-out shadow-sm"
                      style={{ width: `${Math.min(pitches.length * 15, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs sm:text-xs text-gray-500 mt-1 sm:mt-2">
                    <span>Low Demand</span>
                    <span>Medium Demand</span>
                    <span>High Demand</span>
                  </div>
                </div>

                {/* Experts Pitched - Combined Display */}
                <div className="bg-white/50 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-white/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      {/* Count Display */}
                      <div className="flex items-center justify-center w-10 h-10 sm:w-16 sm:h-16 bg-blue-500 text-white rounded-lg sm:rounded-xl shadow-md">
                        <span className="font-bold text-base sm:text-2xl">{pitches.length}</span>
                      </div>
                      
                      {/* Info */}
                      <div>
                        <div className="text-sm sm:text-lg font-bold text-gray-900">Experts Pitched</div>
                        <div className="text-green-600 text-xs sm:text-sm font-semibold">↗ +{pitches.length} today</div>
                        <div className="text-gray-500 text-xs sm:text-sm">Driving current demand level</div>
                      </div>
                    </div>
                    
                    {/* Expert Avatars - Real user profile photos */}
                    <div className="flex items-center">
                      {pitches.length > 0 ? (
                        <>
                          {pitches.slice(0, 5).map((pitch, index) => (
                            <div key={pitch.id} className={`flex items-center justify-center w-6 h-6 sm:w-10 sm:h-10 rounded-full shadow-md border border-white ${index > 0 ? '-ml-1 sm:-ml-2' : ''}`}>
                              {pitch.user?.avatar ? (
                                <img 
                                  src={pitch.user.avatar.startsWith('http') ? pitch.user.avatar : `${window.location.origin}${pitch.user.avatar}`}
                                  alt={pitch.user.fullName || 'Expert'}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-500 text-white rounded-full flex items-center justify-center text-xs sm:text-xs font-bold">
                                  {pitch.user?.fullName ? pitch.user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'EX'}
                                </div>
                              )}
                            </div>
                          ))}
                          {pitches.length > 5 && (
                            <div className="flex items-center justify-center w-6 h-6 sm:w-10 sm:h-10 bg-gray-600 text-white rounded-full text-xs sm:text-xs font-bold shadow-md border border-white -ml-1 sm:-ml-2">
                              +{pitches.length - 5}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-500 text-xs sm:text-sm">No pitches yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested for You Section */}
            <div className="mt-8 sm:mt-10 lg:mt-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 rounded-3xl border border-gray-200/50 overflow-hidden shadow-xl">
              <div className="p-4 sm:p-6 lg:p-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                          <span>Suggested for you</span>
                          <span className="text-blue-600 hidden sm:inline">•</span>
                          <span className="text-base sm:text-lg text-blue-600 font-semibold">
                            Active {opportunity?.industry || opportunity?.topicTags?.[0] || 'Related'} Stories
                          </span>
                        </h3>
                      </div>
                    </div>
                  </div>
                  <Link href="/opportunities">
                    <Button 
                      variant="outline" 
                      className="group bg-white/80 backdrop-blur-sm hover:bg-white border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md px-4 sm:px-6 py-2 sm:py-3"
                    >
                      <span className="font-semibold text-sm sm:text-base">View All</span>
                      <ChevronLeft className="h-4 w-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                  </Link>
                </div>

                {/* Opportunities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {relatedOpportunities.length > 0 ? (
                    relatedOpportunities.map((relatedOpp, index) => (
                      <Link
                        key={relatedOpp.id} 
                        href={`/opportunities/${relatedOpp.id}`}
                        className="group block"
                        onClick={() => {
                          // Set loading state immediately for smooth transition
                          setIsLoading(true);
                        }}
                      >
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 overflow-hidden hover:shadow-xl hover:border-blue-200/60 transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 cursor-pointer group">
                          {/* Card Header */}
                          <div className="p-4 sm:p-6 pb-3 sm:pb-4">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:from-blue-400 group-hover:to-blue-500 transition-all duration-300">
                                  <span className="text-white text-xs font-bold">
                                    {(relatedOpp.publication?.name || relatedOpp.outlet || 'UK')[0]}
                                  </span>
                                </div>
                                <span className="text-xs sm:text-sm font-semibold text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                                  {relatedOpp.publication?.name || relatedOpp.outlet || 'Unknown Outlet'}
                                </span>
                              </div>
                              <Badge className={`text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 shadow-lg border-0 ${
                                getTierDisplay(relatedOpp.tier) === 1 ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                                getTierDisplay(relatedOpp.tier) === 2 ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                                'bg-gradient-to-r from-green-500 to-green-600 text-white'
                              }`}>
                                Tier {getTierDisplay(relatedOpp.tier)}
                              </Badge>
                            </div>
                            
                            {/* Title */}
                            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2 leading-tight">
                              {relatedOpp.title}
                            </h4>
                            
                            {/* Status and Time */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                              {(() => {
                                // Calculate deadline status first
                                const hoursLeft = relatedOpp.deadline ? Math.ceil((new Date(relatedOpp.deadline).getTime() - Date.now()) / (1000 * 60 * 60)) : null;
                                const isClosed = hoursLeft !== null && hoursLeft <= 0;
                                
                                // Determine unified status
                                if (isClosed) {
                                  return (
                                    <div className="flex items-center space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold backdrop-blur-sm bg-red-50 text-red-600 border border-red-200 shadow-md">
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-400 rounded-full"></div>
                                      <span>Closed</span>
                                    </div>
                                  );
                                } else if (relatedOpp.status === 'urgent') {
                                  return (
                                    <div className="flex items-center space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold backdrop-blur-sm bg-red-50 text-red-600 border border-red-200 shadow-md">
                                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                      <span>Urgent</span>
                                    </div>
                                  );
                                } else if (relatedOpp.status === 'trending') {
                                  return (
                                    <div className="flex items-center space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold backdrop-blur-sm bg-orange-50 text-orange-600 border border-orange-200 shadow-md">
                                      <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
                                      <span>Trending</span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="flex items-center space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold backdrop-blur-sm bg-green-50 text-green-600 border border-green-200 shadow-md">
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                                      <span>Open</span>
                                    </div>
                                  );
                                }
                              })()}
                              <span className="text-gray-600 text-xs sm:text-sm font-medium bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200 shadow-md">
                                {relatedOpp.deadline ? (() => {
                                  const hoursLeft = Math.ceil((new Date(relatedOpp.deadline).getTime() - Date.now()) / (1000 * 60 * 60));
                                  return hoursLeft <= 0 ? 'Expired' : `${hoursLeft}h left`;
                                })() : 'Active'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Card Footer */}
                          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                            <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-blue-50/50 backdrop-blur-sm rounded-xl border border-gray-100 shadow-lg group-hover:from-gray-100 group-hover:to-blue-50/70 transition-all duration-300">
                              <div className="flex items-baseline space-x-2">
                                <RelatedOpportunityPrice opportunityId={relatedOpp.id} fallbackPrice={relatedOpp.minimumBid || relatedOpp.currentPrice || 0} />
                                {relatedOpp.increment && (
                                  <span className="text-gray-500 text-sm font-medium">
                                    +${relatedOpp.increment}
                                  </span>
                                )}
                              </div>
                              <RelatedOpportunityHourlyChange opportunityId={relatedOpp.id} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    // Enhanced fallback design
                    Array.from({ length: 3 }, (_, index) => (
                      <div 
                        key={`fallback-${index}`}
                        className="bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden"
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                            </div>
                            <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                          <div className="h-6 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
                          <div className="flex justify-between mb-4">
                            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                          <div className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Additional Info */}
                {relatedOpportunities.length > 0 && (
                  <div className="mt-8 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 backdrop-blur-sm rounded-xl border border-blue-200/50">
                    <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-blue-600">
                      <Info className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="font-medium text-center">
                        Found {relatedOpportunities.length} related {relatedOpportunities.length === 1 ? 'opportunity' : 'opportunities'} in {opportunity?.industry || opportunity?.topicTags?.[0] || 'your area'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="mt-12 text-center">
              <Link href="/opportunities">
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 transition-all duration-200 px-8 py-4 mx-auto"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="font-semibold text-lg">Back to Opportunities</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}