import { useMemo } from 'react';
import { format } from 'date-fns';
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
import { PriceTick } from '@shared/types/opportunity';

interface PriceChartProps {
  priceHistory: PriceTick[];
  className?: string;
  currentPrice?: number;
  basePrice?: number;
  isLoading?: boolean;
}

/**
 * Custom tooltip for the price chart
 */
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload as PriceTick;
  const date = new Date(data.timestamp);
  
  return (
    <div className="bg-white border border-gray-200 shadow-md p-3 rounded-md text-sm">
      <p className="font-semibold mb-1">{format(date, 'MMM d, yyyy h:mm a')}</p>
      <p className="text-gray-700">Price: <span className="font-medium">${data.price}</span></p>
      <p className="text-gray-700">Slots Remaining: <span className="font-medium">{data.slotsRemaining}</span></p>
    </div>
  );
};

/**
 * Price chart component that displays historical price trends
 */
export default function PriceChart({
  priceHistory,
  className = '',
  currentPrice,
  basePrice,
  isLoading = false
}: PriceChartProps) {
  // Format data for the chart
  const chartData = useMemo(() => {
    return priceHistory.map((tick) => ({
      ...tick,
      // Format the date for display on the chart
      displayTime: format(new Date(tick.timestamp), 'MMM d')
    }));
  }, [priceHistory]);

  // Calculate price domain to ensure nice chart boundaries
  const priceDomain = useMemo(() => {
    if (priceHistory.length === 0) return [0, 1000];
    
    const prices = priceHistory.map(tick => tick.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Add some padding to the min/max
    const padding = (maxPrice - minPrice) * 0.2;
    return [
      Math.max(0, minPrice - padding),
      maxPrice + padding
    ];
  }, [priceHistory]);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse w-full h-full bg-gray-100 rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Price History</h3>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
          >
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            
            <XAxis
              dataKey="displayTime"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            
            <YAxis
              domain={priceDomain}
              tickFormatter={(value) => `$${value}`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#priceGradient)"
              strokeWidth={2}
            />
            
            {basePrice && (
              <ReferenceLine
                y={basePrice}
                stroke="#6B7280"
                strokeDasharray="3 3"
                label={{
                  value: `Base Price: $${basePrice}`,
                  position: 'insideTopLeft',
                  fill: '#6B7280',
                  fontSize: 12
                }}
              />
            )}
            
            {currentPrice && currentPrice !== basePrice && (
              <ReferenceLine
                y={currentPrice}
                stroke="#10B981"
                strokeDasharray="3 3"
                label={{
                  value: `Current Price: $${currentPrice}`,
                  position: 'insideBottomLeft',
                  fill: '#10B981',
                  fontSize: 12
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Price increases as slots fill up. Lock in your bid at the current price.</p>
      </div>
    </div>
  );
}