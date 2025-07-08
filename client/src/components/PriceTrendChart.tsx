import React, { useMemo, useState, useEffect } from 'react';
import { format, subHours, subDays, subWeeks, isAfter } from 'date-fns';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
  ReferenceLine
} from 'recharts';

export interface PricePoint { t: string; p: number; }

interface CustomTooltipProps extends TooltipProps<number, string> {
  live?: boolean;
}

const CustomTooltip: React.FC<CustomTooltipProps & { theme?: 'light' | 'dark' }> = ({ active, payload, label, live, theme = 'light' }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const price = data.value;
  const change = data.payload.priceChange;
  const isRealTime = data.payload.isRealTime;
  
  const tooltipStyles = theme === 'dark' 
    ? "bg-slate-900/95 backdrop-blur-xl border border-blue-400/20 rounded-xl shadow-2xl shadow-blue-500/10 p-4 text-sm min-w-[180px] ring-1 ring-blue-400/10"
    : "bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl p-4 text-sm min-w-[180px]";
    
  const priceStyles = theme === 'dark' ? "font-bold text-2xl text-emerald-400 mb-2" : "font-bold text-2xl text-green-600 mb-2";
  const timeStyles = theme === 'dark' ? "text-slate-300 text-xs mb-3 opacity-80" : "text-gray-500 text-xs mb-3 opacity-80";
  const changeColors = theme === 'dark' 
    ? { up: 'text-emerald-400', down: 'text-blue-400' }
    : { up: 'text-green-600', down: 'text-red-600' };
  const liveStyles = theme === 'dark' 
    ? "flex items-center space-x-2 text-xs text-cyan-400 mt-3 pt-3 border-t border-cyan-400/20"
    : "flex items-center space-x-2 text-xs text-blue-600 mt-3 pt-3 border-t border-blue-200";
  
  return (
    <div className={tooltipStyles}>
      <div className={priceStyles}>
        ${price?.toLocaleString()}
      </div>
      <div className={timeStyles}>{data.payload.fullTime}</div>
      {change !== undefined && change !== 0 && (
        <div className={`text-sm font-semibold flex items-center space-x-2 ${
          change > 0 ? changeColors.up : changeColors.down
        }`}>
          <span className="text-lg">{change > 0 ? '↗' : '↘'}</span>
          <span>${Math.abs(change).toFixed(0)} {change > 0 ? 'increase' : 'decrease'}</span>
        </div>
      )}
      {isRealTime && (
        <div className={liveStyles}>
          <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-cyan-400' : 'bg-blue-600'} rounded-full animate-pulse shadow-lg ${theme === 'dark' ? 'shadow-cyan-400/50' : 'shadow-blue-600/50'}`}></div>
          <span className="font-medium tracking-wide">LIVE UPDATE</span>
        </div>
      )}
    </div>
  );
};

/**
 * Cyberpunk-inspired dark theme interactive price chart with stunning visual effects
 */
export default function PriceTrendChart({
  data, live = false, theme = 'light',
}: { 
  data: PricePoint[]; 
  live?: boolean;
  theme?: 'light' | 'dark';
}) {
  
  // Time period options with dark cyberpunk styling
  const timeframes = [
    { label: '1H', hours: 1 },
    { label: '6H', hours: 6 },
    { label: '1D', hours: 24 },
    { label: '3D', hours: 72 },
    { label: '1W', hours: 168 },
    { label: 'ALL', hours: null }
  ];

  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframes[5]); // Default to ALL
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);

  // Mobile detection for responsive chart styling
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle timeframe changes with smooth transitions
  const handleTimeframeChange = (newTimeframe: typeof timeframes[0]) => {
    setSelectedTimeframe(newTimeframe);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Animate chart when new real-time data comes in
  useEffect(() => {
    if (live && data.length > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [data.length, live]);

  // Filter and transform data based on timeframe - synced with real data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    console.log('📊 Processing real chart data:', data.length, 'price points');
    
    let filteredData = [...data]; // Create copy to avoid mutations
    
    // Filter by timeframe if not "ALL"
    if (selectedTimeframe.hours !== null) {
      const cutoffTime = subHours(new Date(), selectedTimeframe.hours);
      filteredData = data.filter(point => {
        const pointTime = new Date(point.t);
        return isAfter(pointTime, cutoffTime);
      });
      console.log('📊 Filtered to', filteredData.length, 'points for', selectedTimeframe.label);
    }
    
    // Sort by timestamp to ensure proper order
    filteredData.sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
    
    // Transform data with enhanced real-time tracking
    const seenDates = new Set<string>(); // Track which dates we've already shown
    const processedData = filteredData.map((point, index) => {
      const date = new Date(point.t);
      const prevPrice = index > 0 ? filteredData[index - 1].p : point.p;
      
      // Determine if this is a recent/live update (last 10 points)
      const isRecentUpdate = live && index >= filteredData.length - 10;
      
      // Smart date labeling to prevent duplicates
      let displayTime = '';
      if (selectedTimeframe.hours && selectedTimeframe.hours <= 24) {
        // For 1H and 6H, show time
        displayTime = format(date, 'h:mm a');
      } else {
        // For 1D, 3D, ALL - only show date if we haven't shown this date yet
        const dateStr = format(date, 'MMM d');
        if (index % Math.max(1, Math.floor(filteredData.length / 5)) === 0 && !seenDates.has(dateStr)) {
          displayTime = dateStr;
          seenDates.add(dateStr);
        }
      }
      
      return {
        timestamp: date.getTime(),
        price: point.p,
        priceChange: point.p - prevPrice,
        displayTime,
        fullTime: format(date, 'MMM d, h:mm:ss a'),
        index,
        isRealTime: isRecentUpdate,
        originalTimestamp: point.t
      };
    });
    
    console.log('📊 Chart data processed:', processedData.length, 'points for display');
    return processedData;
  }, [data, live, selectedTimeframe]);

  // Calculate price stats
  const priceStats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const startPrice = chartData[0].price;
    const currentPrice = chartData[chartData.length - 1].price;
    const change = currentPrice - startPrice;
    const changePercent = ((change / startPrice) * 100);
    const highest = Math.max(...chartData.map(d => d.price));
    const lowest = Math.min(...chartData.map(d => d.price));
    
    return {
      current: currentPrice,
      start: startPrice,
      change,
      changePercent: changePercent.toFixed(1),
      highest,
      lowest,
      isUp: change >= 0,
      totalDataPoints: chartData.length
    };
  }, [chartData]);

  // Y-axis domain
  const priceDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1;
    
    return [Math.max(0, minPrice - padding), maxPrice + padding];
  }, [chartData]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-auto">
        {/* Header with timeframe buttons - themed */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className={`flex rounded-xl p-1 sm:p-1.5 flex-shrink-0 shadow-lg ${
            theme === 'dark' 
              ? 'bg-slate-800/60 backdrop-blur-sm border border-slate-600/30'
              : 'bg-gray-100 border border-gray-200'
          }`}>
            {timeframes.map((tf) => (
              <button
                key={tf.label}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap ${
                  selectedTimeframe.label === tf.label
                    ? theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/50'
                      : 'bg-blue-600 text-white shadow-lg'
                    : theme === 'dark'
                      ? 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className={`w-full h-[280px] sm:h-[360px] lg:h-[400px] flex items-center justify-center rounded-2xl border shadow-2xl ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-800/50 to-slate-900/80 backdrop-blur-sm border-slate-600/30'
            : 'bg-white border-gray-200'
        } ${isMobile ? 'pt-2 px-0 pb-2' : 'p-4'}`}>
          <div className={`text-center px-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 opacity-60">📈</div>
            <p className="font-semibold text-base sm:text-lg">No price data for {selectedTimeframe.label} timeframe</p>
            <p className={`text-xs sm:text-sm mt-2 opacity-75 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Try selecting "ALL" to see complete history</p>
          </div>
        </div>
      </div>
    );
  }

      return (
      <div className="w-full h-auto">
      {/* Header with live price ticker and controls - themed */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 min-w-0">
          {priceStats && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className={`text-2xl sm:text-3xl lg:text-4xl font-black transition-all duration-500 whitespace-nowrap ${
                  theme === 'dark'
                    ? isAnimating && live 
                      ? 'text-transparent bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text animate-pulse' 
                      : hoveredPrice ? 'text-cyan-400' : 'text-emerald-400'
                    : hoveredPrice ? 'text-blue-600' : 'text-green-600'
                }`}>
                  ${hoveredPrice || priceStats.current}
                </div>
                {hoveredPrice && (
                  <div className={`text-xs px-2 py-1 rounded-full transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' 
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}>
                    Interactive
                  </div>
                )}
              </div>
              <div className={`flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-bold transition-all duration-500 whitespace-nowrap px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl ${
                theme === 'dark'
                  ? priceStats.isUp 
                    ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-400/20' 
                    : 'text-blue-300 bg-blue-500/10 border border-blue-400/20'
                  : priceStats.isUp 
                    ? 'text-green-700 bg-green-50 border border-green-200' 
                    : 'text-red-700 bg-red-50 border border-red-200'
              }`}>
                <span className={`text-sm sm:text-lg ${isAnimating && live ? 'animate-bounce' : ''}`}>
                  {priceStats.isUp ? '↗' : '↘'}
                </span>
                <span>${Math.abs(priceStats.change).toFixed(0)} ({priceStats.isUp ? '+' : ''}{priceStats.changePercent}%)</span>
              </div>
            </div>
          )}
        </div>
        
        <div className={`flex rounded-xl p-1 sm:p-1.5 flex-shrink-0 shadow-xl ${
          theme === 'dark' 
            ? 'bg-slate-800/60 backdrop-blur-sm border border-slate-600/30'
            : 'bg-gray-100 border border-gray-200'
        }`}>
          {timeframes.map((tf) => (
            <button
              key={tf.label}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap ${
                selectedTimeframe.label === tf.label
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/50'
                    : 'bg-blue-600 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive chart - themed */}
      <div className={`h-[280px] sm:h-[360px] lg:h-[400px] rounded-2xl border ${isMobile ? 'pt-2 px-0 pb-2' : 'p-4 lg:p-6'} shadow-2xl transition-all duration-500 ${
        theme === 'dark'
          ? `bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40 backdrop-blur-sm border-slate-600/30 ${
              isAnimating ? 'ring-2 ring-cyan-400/50 shadow-cyan-500/20' : 'shadow-slate-900/50'
            }`
          : 'bg-white border-gray-200 shadow-gray-300/50'
      }`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData} 
            margin={{ top: isMobile ? 15 : 10, right: isMobile ? 5 : 5, left: isMobile ? -20 : -25, bottom: isMobile ? 0 : -5 }}
            onMouseMove={(e: any) => {
              if (e && e.activePayload && e.activePayload[0]) {
                setHoveredPrice(e.activePayload[0].payload.price);
                setHoveredTime(e.activePayload[0].payload.fullTime);
              }
            }}
            onMouseLeave={() => {
              setHoveredPrice(null);
              setHoveredTime(null);
            }}
          >
            <defs>
              {/* Gradient definitions for different price trends - themed */}
              <linearGradient id={theme === 'dark' ? "bullishGradient" : "bullishGradientLight"} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={theme === 'dark' ? 0.6 : 0.3} />
                <stop offset="30%" stopColor="#059669" stopOpacity={theme === 'dark' ? 0.4 : 0.2} />
                <stop offset="70%" stopColor="#047857" stopOpacity={theme === 'dark' ? 0.2 : 0.1} />
                <stop offset="100%" stopColor="#065f46" stopOpacity={theme === 'dark' ? 0.05 : 0.02} />
              </linearGradient>
              
              <linearGradient id={theme === 'dark' ? "bearishGradient" : "bearishGradientLight"} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme === 'dark' ? "#3B82F6" : "#EF4444"} stopOpacity={theme === 'dark' ? 0.6 : 0.3} />
                <stop offset="30%" stopColor={theme === 'dark' ? "#2563EB" : "#DC2626"} stopOpacity={theme === 'dark' ? 0.4 : 0.2} />
                <stop offset="70%" stopColor={theme === 'dark' ? "#1D4ED8" : "#B91C1C"} stopOpacity={theme === 'dark' ? 0.2 : 0.1} />
                <stop offset="100%" stopColor={theme === 'dark' ? "#1E40AF" : "#991B1B"} stopOpacity={theme === 'dark' ? 0.05 : 0.02} />
              </linearGradient>

              {/* Glow effects - themed */}
              <filter id={theme === 'dark' ? "cyberpunkGlow" : "lightGlow"} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={theme === 'dark' ? "4" : "2"} result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              <filter id={theme === 'dark' ? "liveGlow" : "liveGlowLight"} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={theme === 'dark' ? "6" : "3"} result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              {/* Animated gradient for live updates - themed */}
              <linearGradient id={theme === 'dark' ? "liveGradient" : "liveGradientLight"} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme === 'dark' ? "#06B6D4" : "#3B82F6"} stopOpacity={theme === 'dark' ? 0.8 : 0.4} />
                <stop offset="50%" stopColor="#3B82F6" stopOpacity={theme === 'dark' ? 0.5 : 0.3} />
                <stop offset="100%" stopColor={theme === 'dark' ? "#8B5CF6" : "#6366F1"} stopOpacity={theme === 'dark' ? 0.1 : 0.05} />
              </linearGradient>
            </defs>
            
            {/* Grid - themed */}
            <CartesianGrid 
              strokeDasharray="2 4" 
              opacity={theme === 'dark' ? 0.15 : 0.3} 
              stroke={theme === 'dark' ? "#64748b" : "#e5e7eb"}
            />
            
            <XAxis
              dataKey="displayTime"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isMobile ? 9 : 11, fill: theme === 'dark' ? '#94a3b8' : '#6b7280', fontWeight: 500 }}
              interval="preserveStartEnd"
            />
            
            <YAxis
              domain={priceDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isMobile ? 9 : 11, fill: theme === 'dark' ? '#94a3b8' : '#6b7280', fontWeight: 500 }}
              tickFormatter={(value) => `$${Math.round(value)}`}
            />
            
            <Tooltip content={<CustomTooltip live={live} theme={theme} />} />
            
            {/* Main price area - themed */}
            <Area
              type="monotone"
              dataKey="price"
              stroke={
                live && isAnimating 
                  ? theme === 'dark' ? "#06B6D4" : "#3B82F6"
                  : priceStats?.isUp 
                    ? "#10B981" 
                    : theme === 'dark' ? "#3B82F6" : "#EF4444"
              }
              strokeWidth={live && isAnimating ? 4 : 3}
              strokeLinecap="round"
              fill={
                live && isAnimating 
                  ? theme === 'dark' ? "url(#liveGradient)" : "url(#liveGradientLight)"
                  : priceStats?.isUp 
                    ? theme === 'dark' ? "url(#bullishGradient)" : "url(#bullishGradientLight)"
                    : theme === 'dark' ? "url(#bearishGradient)" : "url(#bearishGradientLight)"
              }
              fillOpacity={1}
              dot={false}
              activeDot={{
                r: live ? 8 : 6,
                stroke: live && isAnimating 
                  ? theme === 'dark' ? "#06B6D4" : "#3B82F6"
                  : priceStats?.isUp 
                    ? "#10B981" 
                    : theme === 'dark' ? "#3B82F6" : "#EF4444",
                strokeWidth: 3,
                fill: theme === 'dark' ? '#1e293b' : '#ffffff',
                style: { cursor: 'pointer' },
                filter: live && isAnimating 
                  ? theme === 'dark' ? 'url(#liveGlow)' : 'url(#liveGlowLight)'
                  : theme === 'dark' ? 'url(#cyberpunkGlow)' : 'url(#lightGlow)'
              }}
              animationDuration={isAnimating ? 1000 : 600}
              animationEasing="ease-out"
              filter={live && isAnimating ? theme === 'dark' ? 'url(#cyberpunkGlow)' : undefined : undefined}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 