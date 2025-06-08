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

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, live }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const price = data.value;
  const change = data.payload.priceChange;
  const isRealTime = data.payload.isRealTime;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-sm min-w-[160px]">
      <div className="font-bold text-xl text-gray-900 mb-1">${price?.toLocaleString()}</div>
      <div className="text-gray-500 text-xs mb-2">{data.payload.fullTime}</div>
      {change !== undefined && change !== 0 && (
        <div className={`text-sm font-semibold flex items-center space-x-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
          <span>{change > 0 ? '↗' : '↘'}</span>
          <span>${Math.abs(change).toFixed(0)} {change > 0 ? 'increase' : 'decrease'}</span>
        </div>
      )}
      {isRealTime && (
        <div className="flex items-center space-x-1 text-xs text-red-600 mt-2 pt-2 border-t border-gray-100">
          <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
          <span className="font-medium">Live Update</span>
        </div>
      )}
    </div>
  );
};

/**
 * StockX-inspired interactive price chart
 */
export default function PriceTrendChart({
  data, live = false,
}: { 
  data: PricePoint[]; 
  live?: boolean;
}) {
  
  // Time period options (StockX style)
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
    const processedData = filteredData.map((point, index) => {
      const date = new Date(point.t);
      const prevPrice = index > 0 ? filteredData[index - 1].p : point.p;
      
      // Determine if this is a recent/live update (last 10 points)
      const isRecentUpdate = live && index >= filteredData.length - 10;
      
      return {
        timestamp: date.getTime(),
        price: point.p,
        priceChange: point.p - prevPrice,
        displayTime: selectedTimeframe.hours && selectedTimeframe.hours <= 24 
          ? format(date, 'h:mm a') 
          : index % Math.max(1, Math.floor(filteredData.length / 5)) === 0 
            ? format(date, 'MMM d') 
            : '',
        fullTime: format(date, 'MMM d, HH:mm:ss'),
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
      <div className="w-full h-[520px]">
        {/* Header with timeframe buttons */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="text-lg font-semibold text-gray-900">Price History</div>
            {live && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium text-sm">Live</span>
              </div>
            )}
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {timeframes.map((tf) => (
              <button
                key={tf.label}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  selectedTimeframe.label === tf.label
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="w-full h-[460px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-center text-gray-500">
            <div className="text-3xl mb-3">📈</div>
            <p className="font-medium">No price data for {selectedTimeframe.label} timeframe</p>
            <p className="text-sm text-gray-400 mt-1">Try selecting "ALL" to see complete history</p>
          </div>
        </div>
      </div>
    );
  }

      return (
      <div className="w-full h-[520px]">
      {/* Header with live price ticker and timeframe controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-900">Price History</div>
          {priceStats && (
            <div className="flex items-center space-x-4">
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                isAnimating && live ? 'text-blue-600' : 'text-gray-900'
              }`}>
                ${priceStats.current}
              </div>
              <div className={`flex items-center space-x-1 text-sm font-semibold transition-all duration-300 ${
                priceStats.isUp ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className={isAnimating && live ? 'animate-bounce' : ''}>
                  {priceStats.isUp ? '↗' : '↘'}
                </span>
                <span>${Math.abs(priceStats.change).toFixed(0)} ({priceStats.isUp ? '+' : ''}{priceStats.changePercent}%)</span>
              </div>
              {live && (
                <div className="flex items-center space-x-1 px-3 py-1 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 font-medium text-sm">Live Updates</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          {timeframes.map((tf) => (
            <button
              key={tf.label}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                selectedTimeframe.label === tf.label
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Chart */}
      <div className={`h-[460px] bg-white rounded-xl border border-gray-200 p-4 transition-all duration-300 ${
        isAnimating ? 'ring-2 ring-blue-200' : ''
      }`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={priceStats?.isUp ? "#10B981" : "#EF4444"} stopOpacity={0.4} />
                <stop offset="50%" stopColor={priceStats?.isUp ? "#10B981" : "#EF4444"} stopOpacity={0.1} />
                <stop offset="100%" stopColor={priceStats?.isUp ? "#10B981" : "#EF4444"} stopOpacity={0.02} />
              </linearGradient>
              
              {/* Glow effect for live updates */}
              <filter id="liveGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            
            <XAxis
              dataKey="displayTime"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              interval="preserveStartEnd"
            />
            
            <YAxis
              domain={priceDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={(value) => `$${Math.round(value)}`}
            />
            
            <Tooltip content={<CustomTooltip live={live} />} />
            

            
            {/* Main price area with enhanced styling for live updates */}
            <Area
              type="monotone"
              dataKey="price"
              stroke={priceStats?.isUp ? "#10B981" : "#EF4444"}
              strokeWidth={live && isAnimating ? 3 : 2.5}
              strokeLinecap="round"
              fill="url(#priceGradient)"
              fillOpacity={1}
              dot={false}
              activeDot={{
                r: live ? 6 : 5,
                stroke: priceStats?.isUp ? "#10B981" : "#EF4444",
                strokeWidth: 2,
                fill: 'white',
                style: { cursor: 'pointer' },
                filter: live && isAnimating ? 'url(#liveGlow)' : undefined
              }}
              animationDuration={isAnimating ? 800 : 400}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>


    </div>
  );
} 