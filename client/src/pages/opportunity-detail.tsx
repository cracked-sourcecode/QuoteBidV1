import { useEffect, useState, useRef } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { ChevronLeft, Calendar, Clock, DollarSign, TrendingUp, Flame, ChevronUp, Info, Mic, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/apiFetch';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ReferenceDot, Tooltip } from 'recharts';
import LogoUniform from '@/components/ui/logo-uniform';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { getPublicationLogo } from '@/lib/responsive-utils';
import { apiRequest } from '@/lib/queryClient';
import { useOpportunityPrice, usePriceConnection } from '@/contexts/PriceContext';

export default function OpportunityDetail() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, params] = useRoute('/opportunities/:id');
  const opportunityId = params ? parseInt(params.id) : 0;
  const [isBriefMinimized, setIsBriefMinimized] = useState(false);
  const [pitchContent, setPitchContent] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'Daily' | 'Weekly'>('Daily');
  
  // Connect to real-time price updates from pricing engine
  const priceData = useOpportunityPrice(opportunityId);
  const { isConnected, connectionCount } = usePriceConnection();
  
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
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
  
  // Improved logo loading handler for retina displays
  const handleLogoLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    // On retina displays, wait a bit to ensure proper loading
    setTimeout(() => {
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setLogoLoaded(true);
        setLogoFailed(false);
        console.log(`✅ Detail logo loaded successfully for ${opportunity?.outlet}: ${img.naturalWidth}x${img.naturalHeight}`);
      } else {
        console.log(`❌ Detail logo failed dimension check for ${opportunity?.outlet}: ${img.naturalWidth}x${img.naturalHeight}`);
        setLogoFailed(true);
      }
    }, 100);
  };

  const handleLogoError = () => {
    console.log(`❌ Detail logo failed to load for ${opportunity?.outlet}: ${opportunity?.outletLogo}`);
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
    
    console.log(`OpportunityDetail - ${opportunity.outlet}: logo URL = ${logoUrl}, original = ${logo}`);
    
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
        
        // Fetch price history
        try {
          const priceResponse = await apiFetch(`/api/opportunities/${opportunityId}/price-history`, {
            credentials: 'include'
          });
          
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            // Transform price history data for the chart
            const chartData = priceData.map((item: any, index: number) => ({
              day: index + 1,
              price: item.price,
              label: `${index + 1}d`,
              timestamp: item.timestamp
            }));
            setPriceHistory(chartData);
          }
        } catch (priceError) {
          console.log('Price history not available, using fallback data');
          // Generate fallback price data
          const fallbackData = generateFallbackPriceData(opportunityData);
          setPriceHistory(fallbackData);
        }
        
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
        if (opportunityData) {
          try {
            // Get the primary industry/category from topic tags
            const primaryCategory = opportunityData.topicTags?.[0] || opportunityData.industry || 'General';
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
        }

        // Check if user has already pitched for this opportunity
        await checkUserPitchStatus(opportunityData.id);
        
      } catch (err) {
        console.error('Error fetching opportunity data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load opportunity');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOpportunityData();
  }, [opportunityId]);
  
  // Generate fallback price data if API doesn't have it
  const generateFallbackPriceData = (opp: any) => {
    const basePrice = opp.basePrice || 100;
    const currentPrice = opp.currentPrice || basePrice;
    const days = 7;
    
    const data = [];
    for (let i = 0; i < days; i++) {
      const progress = i / (days - 1);
      const price = Math.round(basePrice + (currentPrice - basePrice) * progress);
      data.push({
        day: i + 1,
        price: price,
        label: `${i + 1}d`
      });
    }
    
    return data;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading opportunity details...</p>
        </div>
      </div>
    );
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

  // Use real-time price data if available, fallback to opportunity data
  const currentPrice = priceData?.currentPrice || bidInfo?.currentPrice || opportunity?.currentPrice || opportunity?.basePrice || 100;
  const priceTrend = priceData?.trend || 'stable';
  const priceIncrease = currentPrice - (opportunity?.basePrice || 100);
  const belowListPercentage = 17; // This could be calculated based on real data later
  const maxPitchLength = 2000;
  const remainingChars = maxPitchLength - pitchContent.length;
  
  // Calculate if today is the deadline
  const isToday = opportunity?.deadline ? format(new Date(opportunity.deadline), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : false;

  // Use real price data or fallback data
  const priceDataForChart = priceHistory.length > 0 ? priceHistory : [
    { day: 1, price: currentPrice - 50, label: '1d' },
    { day: 2, price: currentPrice - 30, label: '2d' },
    { day: 3, price: currentPrice - 20, label: '3d' },
    { day: 4, price: currentPrice - 35, label: '4d' },
    { day: 5, price: currentPrice - 10, label: '5d' },
    { day: 6, price: currentPrice - 5, label: '6d' },
    { day: 7, price: currentPrice, label: '7d' }
  ];

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
      
      if (pitchContent.length < 50) {
        toast({
          title: "Pitch Too Short",
          description: "Please provide a more detailed pitch (minimum 50 characters).",
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

      // Re-check pitch status to update UI immediately
      setTimeout(() => {
        checkUserPitchStatus(opportunity.id);
      }, 500);

    } catch (error) {
      console.error('Error submitting pitch:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : 'Failed to submit pitch. Please try again.',
        variant: "destructive"
      });
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentPrice = payload[0].value;
      const dayIndex = payload[0].payload.day;
      const prevPrice = dayIndex > 1 ? priceDataForChart[dayIndex - 2].price : priceDataForChart[0].price;
      const priceChange = currentPrice - prevPrice;
      const changeDirection = priceChange >= 0 ? '+' : '';
      
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[140px]">
          <div className="text-xs text-gray-500 font-medium mb-1">Day {dayIndex}</div>
          <div className="text-lg font-bold text-gray-900 mb-1">${currentPrice}</div>
          {dayIndex > 1 && (
            <div className={`text-xs font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changeDirection}${Math.abs(priceChange)} from yesterday
            </div>
          )}
        </div>
      );
    }
    return null;
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

  // Voice recording functions
  const startRecording = async () => {
    console.log('[Voice Recording] Starting recording...');
    try {
      setRecorderError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('[Voice Recording] Got media stream:', mediaStream);
      setStream(mediaStream);
      
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm;codecs=opus'
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
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordingBlob(blob);
        setIsRecording(false);
        
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        
        if (recordingInterval.current) {
          clearInterval(recordingInterval.current);
        }
        
        console.log('[Voice Recording] Recording complete, blob size:', blob.size);
        
        // Automatically transcribe the audio
        await transcribeAudio(blob);
      };
      
      recorder.onerror = (event) => {
        console.error('[Voice Recording] Recording error:', event);
        setRecorderError('Recording failed. Please try again.');
        setIsRecording(false);
      };
      
      recorder.start(100);
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
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true);
      setRecorderError(null);
      
      console.log('[Transcription] Starting transcription...');
      
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
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const result = await response.json();
      
      console.log('[Transcription] Success:', result);
      
      // Add transcribed text to the pitch content
      if (result.text) {
        const transcribedText = result.text.trim();
        setPitchContent(prev => {
          // If there's existing content, add a line break before the new text
          const separator = prev.trim() ? '\n\n' : '';
          return prev + separator + transcribedText;
        });
        
        toast({
          title: "Voice Transcribed",
          description: `Added ${transcribedText.length} characters to your pitch`,
        });
      }
      
      // Clean up
      setRecordingBlob(null);
      setAudioURL(null);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('[Transcription] Error:', error);
      setRecorderError('Failed to transcribe audio. Please try again.');
      
      // Keep the audio blob in case user wants to retry manually
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Main Content */}
      <div className="mx-auto px-4 py-4">
        {/* White Container Wrapper */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="px-6 pb-6">
            {/* Compact Professional Header with Logo + Name - ORIGINAL DESIGN */}
            <div className="pt-6 pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-4 mb-4">
                {/* Logo Container */}
                <div className="flex-shrink-0">
                  {getLogoUrl() && !logoFailed ? (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 flex-shrink-0 flex items-center justify-center bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <img
                        src={getLogoUrl()}
                        alt={`${opportunity.outlet} logo`}
                        className="w-full h-full object-contain"
                        onError={handleLogoError}
                        onLoad={handleLogoLoad}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 flex-shrink-0 flex items-center justify-center bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <span className="text-gray-600 font-bold text-base sm:text-lg md:text-xl lg:text-2xl">
                        {opportunity.outlet?.split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Publication Name and Tier */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                      {opportunity.outlet}
                    </h2>
                    <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md px-3 py-1.5 text-xs sm:text-sm font-semibold">
                      Tier {getTierDisplay(opportunity.tier)}
                    </Badge>
                  </div>
                  {/* Optional: Add publication tagline or category */}
                  <p className="text-sm sm:text-base text-gray-600 mt-1">Premium Media Opportunity</p>
                </div>
              </div>
            </div>

            {/* Opportunity Title */}
            <div className="pt-6 mb-6">
              <h1 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold text-black leading-tight">
                {opportunity.title}
              </h1>
            </div>

            {/* Topic Tags - Compact inline display */}
            <div className="mb-6">
              <div className="flex items-center flex-wrap gap-2">
                {(opportunity.topicTags || []).map((tag: string, index: number) => (
                  <div 
                    key={`${tag}-${index}`}
                    className="text-xs sm:text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full shadow-sm border border-gray-200 hover:bg-gray-150 transition-colors"
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>

            {/* Key Info Row - More colorful design with left-aligned dates */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-4 mb-6 border border-blue-200/20 shadow-md">
              {/* Posted Date - Left aligned */}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg shadow-md">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Posted</div>
                  <div className="text-sm font-bold text-gray-900">
                    {format(new Date(opportunity.postedAt || opportunity.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-blue-300 to-transparent"></div>

              {/* Deadline - Left aligned */}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg shadow-md">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Deadline</div>
                  <div className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                    <span>{format(new Date(opportunity.deadline), 'MMM d, yyyy')}</span>
                    {isToday && (
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-0.5 shadow-md animate-pulse">
                        Today
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="h-12 w-px bg-gradient-to-b from-transparent via-green-300 to-transparent"></div>

              {/* Status - Left aligned */}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-green-400 to-green-500 rounded-lg shadow-md">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="flex items-center space-x-2 mb-1">
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wide">Current Price</div>
                  </div>
                  <div className={`text-sm font-bold ${priceData ? 'text-blue-600' : 'text-gray-900'} transition-colors duration-300`}>
                    ${currentPrice}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity - Enhanced with gradients */}
            <div className="mb-10">
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-purple-200/30 p-6 shadow-lg">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex items-center justify-center w-6 h-6">
                      <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-400/50"></span>
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Live Activity:</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-xl border border-green-200/50 shadow-md">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">${Math.abs(priceIncrease)} {priceIncrease >= 0 ? 'increase' : 'decrease'} (last hour)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 rounded-xl border border-blue-200/50 shadow-md">
                    <Flame className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">8 pitches (last hour)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-2 rounded-xl border border-orange-200/50 shadow-md">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-semibold text-orange-700">
                      {Math.max(0, Math.ceil((new Date(opportunity.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)))}h remaining
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Opportunity Brief Card - Lighter, more professional blue */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl overflow-hidden mb-10 shadow-lg border border-blue-200/50">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-1.5">
                      <span className="w-3 h-3 bg-blue-500 rounded-full shadow-md animate-pulse"></span>
                      <span className="w-3 h-3 bg-blue-400 rounded-full shadow-md animate-pulse animation-delay-200"></span>
                      <span className="w-3 h-3 bg-blue-300 rounded-full shadow-md animate-pulse animation-delay-400"></span>
                    </div>
                    <h3 className="text-xl font-semibold text-blue-900 tracking-wide">
                      Opportunity Brief
                    </h3>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-blue-700">Classification:</span>
                    <Badge className={`border-0 px-4 py-2 font-semibold shadow-sm ${
                      opportunity.status === 'open' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : 'bg-gradient-to-r from-red-400 to-pink-500 text-white'
                    }`}>
                      {opportunity.status ? opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1) : 'Open'}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                {!isBriefMinimized && (
                  <div className="mb-6">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden border border-blue-100">
                      <div className="p-6">
                        <div className="text-black text-lg leading-loose space-y-4 font-medium">
                          {opportunity.summary ? (
                            <div className="whitespace-pre-wrap">
                              {opportunity.summary.split('\n\n').map((paragraph: string, index: number) => (
                                <p key={index} className="mb-4 last:mb-0 font-medium text-black">
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
                              <p className="font-semibold text-black mb-4 text-xl">
                                {opportunity.title}
                              </p>
                              <p className="text-black leading-loose text-lg font-medium">
                                This opportunity is seeking expert commentary and insights. Please provide your relevant experience and perspective in your pitch.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Minimize Button */}
                <div className="flex justify-start">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsBriefMinimized(!isBriefMinimized)}
                    className="flex items-center space-x-3 text-blue-700 hover:text-blue-900 hover:bg-blue-100/50 transition-all duration-200 px-4 py-3 rounded-xl font-medium"
                  >
                    <ChevronUp className={`h-5 w-5 transition-transform duration-300 ${isBriefMinimized ? 'rotate-180' : ''}`} />
                    <span className="text-sm">{isBriefMinimized ? 'Expand Brief' : 'Minimize Brief'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Marketplace Pricing Section - Enhanced with gradients */}
            <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-3xl border border-indigo-200/30 overflow-hidden shadow-xl">
              <div className="grid grid-cols-2 gap-0">
                {/* Price Trend Section - Left Side */}
                <div className="p-8 border-r border-gray-200/50">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-gray-900">Price Trend</h3>
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          className="px-4 py-2 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm"
                        >
                          Daily
                        </button>
                      </div>
                    </div>

                    {/* Immersive Price Chart - Full Container */}
                    <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={priceDataForChart} 
                          margin={{ top: 5, right: 5, bottom: 5, left: 25 }}
                        >
                          <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          
                          <CartesianGrid 
                            strokeDasharray="2 2" 
                            stroke="#E5E7EB" 
                            strokeOpacity={0.5}
                            vertical={false}
                          />
                          
                          <XAxis 
                            type="number"
                            dataKey="day"
                            domain={[1, 7]}
                            ticks={[1, 2, 3, 4, 5, 6, 7]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            tickFormatter={(value) => `${value}d`}
                            height={15}
                          />
                          
                          <YAxis 
                            type="number"
                            domain={[
                              Math.floor(Math.min(...priceDataForChart.map(p => p.price)) * 0.95), 
                              Math.ceil(Math.max(...priceDataForChart.map(p => p.price)) * 1.05)
                            ]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            tickFormatter={(value) => `$${value}`}
                            width={25}
                          />
                          
                          <Tooltip content={<CustomTooltip />} />
                          
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke="#3B82F6"
                            strokeWidth={3.5}
                            fill="url(#priceGradient)"
                            dot={false}
                            activeDot={{ 
                              r: 5, 
                              fill: '#3B82F6', 
                              stroke: '#FFFFFF', 
                              strokeWidth: 2
                            }}
                          />
                          
                          <ReferenceDot
                            x={priceDataForChart.length}
                            y={currentPrice}
                            r={4}
                            fill="#3B82F6"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Price range */}
                    <div className="flex justify-between items-center mt-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 font-bold text-lg">${Math.min(...priceDataForChart.map(p => p.price))}</span>
                        <span className="text-gray-500 text-sm">Low</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-500 font-bold text-lg">${Math.max(...priceDataForChart.map(p => p.price))}</span>
                        <span className="text-gray-500 text-sm">High</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Price & Pitch Section - Right Side */}
                <div className="p-8 relative">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">Current Price</h3>
                      <div className="flex items-center space-x-2 text-green-600 text-sm font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>{belowListPercentage}% below list price</span>
                      </div>
                    </div>

                    <div className="flex items-baseline space-x-3 mb-4">
                      <span className={`text-4xl font-bold ${
                        priceTrend === 'up' ? 'text-green-600 animate-pulse' :
                        priceTrend === 'down' ? 'text-red-600 animate-pulse' :
                        priceData ? 'text-blue-600' : 'text-gray-900'
                      } transition-colors duration-300`}>${currentPrice}</span>
                      {priceIncrease !== 0 && (
                        <div className={`flex items-center space-x-1 text-lg font-semibold ${priceIncrease >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <TrendingUp className={`h-5 w-5 ${priceIncrease < 0 ? 'rotate-180' : ''}`} />
                          <span>{priceIncrease >= 0 ? '+' : ''}${priceIncrease}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-full ${priceData ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        <span className="text-gray-600 font-medium">
                          {priceData ? 'Dynamic pricing active' : 'Static pricing'}
                        </span>
                      </div>
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
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200/50 overflow-hidden">
                          <div className="p-8 text-center">
                            {/* Success Icon */}
                            <div className="flex justify-center mb-6">
                              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"></path>
                                </svg>
                              </div>
                            </div>
                            
                            {/* Title */}
                            <h3 className="text-2xl font-bold text-green-800 mb-4">
                              Pitch Already Submitted!
                            </h3>
                            
                            {/* Message */}
                            <p className="text-green-700 text-lg mb-6 leading-relaxed">
                              You've already submitted a pitch for this opportunity. Each user can only submit one pitch per opportunity.
                            </p>
                            
                            {/* Bid Amount Display */}
                            {userPitchStatus.pitch?.bidAmount && (
                              <div className="bg-white/60 rounded-xl p-4 mb-6 border border-green-200/50">
                                <div className="text-sm font-medium text-green-600 mb-1">Your bid amount:</div>
                                <div className="text-3xl font-bold text-green-800">
                                  ${userPitchStatus.pitch.bidAmount}
                                </div>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="space-y-3">
                              <Link href="/opportunities">
                                <Button className="w-full bg-white hover:bg-gray-50 text-green-700 border border-green-200 font-semibold py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                                  <div className="flex items-center justify-center space-x-2">
                                    <ChevronLeft className="h-5 w-5 rotate-180" />
                                    <span>Browse Other Opportunities</span>
                                  </div>
                                </Button>
                              </Link>
                              
                              <Link href="/my-pitches">
                                <Button variant="outline" className="w-full bg-white/80 hover:bg-white text-green-700 border border-green-200 font-semibold py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                                  <div className="flex items-center justify-center space-x-2">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <label className="text-gray-700 font-semibold text-lg">Craft your pitch</label>
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
                              className="min-h-[240px] w-full p-4 border border-gray-200 rounded-xl bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all duration-200 resize-none text-gray-800 text-base font-medium placeholder:text-gray-400 placeholder:font-normal shadow-sm hover:border-gray-300"
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
                      <div className="flex items-center justify-between mb-6">
                        <Button
                          variant="outline"
                          className={`flex items-center space-x-2 border-red-200 hover:bg-red-50 ${
                            isRecording ? 'bg-red-50 text-red-700 border-red-300' : 
                            isTranscribing ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            'text-red-500'
                          }`}
                          onClick={isRecording ? stopRecording : startRecording}
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
                          onClick={handleSecurePitch}
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
            <div className="mt-12 bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl border border-orange-200/50 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <Flame className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Competition Momentum</h3>
                      <p className="text-gray-600 mt-1">Demand level based on expert pitches</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 text-sm font-bold shadow-md">
                    {pitches.length === 0 ? 'No Interest' : 
                     pitches.length <= 2 ? 'Low Demand' : 
                     pitches.length <= 5 ? 'Medium Demand' : 
                     'High Demand'}
                  </Badge>
                </div>

                {/* Competition Meter */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Demand Level</span>
                    <span className="text-sm font-bold text-orange-600">{Math.min(pitches.length * 15, 100)}% Competitive</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div 
                      className="h-3 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400 transition-all duration-1000 ease-out shadow-sm"
                      style={{ width: `${Math.min(pitches.length * 15, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Low Demand</span>
                    <span>Medium Demand</span>
                    <span>High Demand</span>
                  </div>
                </div>

                {/* Experts Pitched - Combined Display */}
                <div className="bg-white/50 rounded-2xl p-6 border border-white/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Count Display */}
                      <div className="flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-xl shadow-md">
                        <span className="font-bold text-2xl">{pitches.length}</span>
                      </div>
                      
                      {/* Info */}
                      <div>
                        <div className="text-lg font-bold text-gray-900">Experts Pitched</div>
                        <div className="text-green-600 text-sm font-semibold">↗ +{pitches.length} today</div>
                        <div className="text-gray-500 text-sm">Driving current demand level</div>
                      </div>
                    </div>
                    
                    {/* Expert Avatars - Real user profile photos */}
                    <div className="flex items-center">
                      {pitches.length > 0 ? (
                        <>
                          {pitches.slice(0, 5).map((pitch, index) => (
                            <div key={pitch.id} className={`flex items-center justify-center w-10 h-10 rounded-full shadow-md border-2 border-white ${index > 0 ? '-ml-2' : ''}`}>
                              {pitch.user?.avatar ? (
                                <img 
                                  src={pitch.user.avatar.startsWith('http') ? pitch.user.avatar : `${window.location.origin}${pitch.user.avatar}`}
                                  alt={pitch.user.fullName || 'Expert'}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {pitch.user?.fullName ? pitch.user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'EX'}
                                </div>
                              )}
                            </div>
                          ))}
                          {pitches.length > 5 && (
                            <div className="flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded-full text-xs font-bold shadow-md border-2 border-white -ml-2">
                              +{pitches.length - 5}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-500 text-sm">No pitches yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested for You Section */}
            <div className="mt-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 rounded-3xl border border-gray-200/50 overflow-hidden shadow-xl">
              <div className="p-8">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                          <span>Suggested for you</span>
                          <span className="text-blue-600">•</span>
                          <span className="text-lg text-blue-600 font-semibold">
                            Active {opportunity?.topicTags?.[0] || 'Related'} Stories
                          </span>
                        </h3>
                      </div>
                    </div>
                  </div>
                  <Link href="/opportunities">
                    <Button 
                      variant="outline" 
                      className="group bg-white/80 backdrop-blur-sm hover:bg-white border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md px-6 py-3"
                    >
                      <span className="font-semibold">View All</span>
                      <ChevronLeft className="h-4 w-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                  </Link>
                </div>

                {/* Opportunities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 overflow-hidden hover:shadow-xl hover:border-blue-200/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                          {/* Card Header */}
                          <div className="p-6 pb-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                                  <span className="text-white text-xs font-bold">
                                    {(relatedOpp.publication?.name || relatedOpp.outlet || 'UK')[0]}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold text-gray-600">
                                  {relatedOpp.publication?.name || relatedOpp.outlet || 'Unknown Outlet'}
                                </span>
                              </div>
                              <Badge className={`text-xs font-bold px-3 py-1.5 shadow-sm border-0 ${
                                getTierDisplay(relatedOpp.tier) === 1 ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                                getTierDisplay(relatedOpp.tier) === 2 ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                                'bg-gradient-to-r from-green-500 to-green-600 text-white'
                              }`}>
                                Tier {getTierDisplay(relatedOpp.tier)}
                              </Badge>
                            </div>
                            
                            {/* Title */}
                            <h4 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                              {relatedOpp.title}
                            </h4>
                            
                            {/* Status and Time */}
                            <div className="flex items-center justify-between mb-4">
                              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                                relatedOpp.status === 'urgent' ? 'bg-red-50 text-red-600 border border-red-200' :
                                relatedOpp.status === 'trending' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                                'bg-green-50 text-green-600 border border-green-200'
                              }`}>
                                {relatedOpp.status === 'urgent' ? (
                                  <>
                                    <Clock className="h-4 w-4" />
                                    <span>Urgent</span>
                                  </>
                                ) : relatedOpp.status === 'trending' ? (
                                  <>
                                    <Flame className="h-4 w-4" />
                                    <span>Trending</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Open</span>
                                  </>
                                )}
                              </div>
                              <span className="text-gray-500 text-sm font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                {relatedOpp.deadline ? 
                                  `${Math.ceil((new Date(relatedOpp.deadline).getTime() - Date.now()) / (1000 * 60 * 60))}h left` :
                                  'Active'
                                }
                              </span>
                            </div>
                          </div>
                          
                          {/* Card Footer */}
                          <div className="px-6 pb-6">
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl border border-gray-100">
                              <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-bold text-green-600">
                                  ${relatedOpp.minimumBid || relatedOpp.currentPrice || 0}
                                </span>
                                {relatedOpp.increment && (
                                  <span className="text-gray-500 text-sm font-medium">
                                    +${relatedOpp.increment}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500 mb-1">Current Rate</div>
                                <div className="text-green-600 text-sm font-semibold flex items-center space-x-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>Live</span>
                                </div>
                              </div>
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
                  <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-center space-x-2 text-sm text-blue-700">
                      <Info className="h-4 w-4" />
                      <span className="font-medium">
                        Found {relatedOpportunities.length} related {relatedOpportunities.length === 1 ? 'opportunity' : 'opportunities'} in {opportunity?.topicTags?.[0] || 'your area'}
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