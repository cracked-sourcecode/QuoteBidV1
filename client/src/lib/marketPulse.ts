/**
 * Market Pulse Library
 * Handles real-time price updates and market dynamics for the auction system
 */

export interface MarketPulseConfig {
  opportunityId: number;
  onPriceUpdate?: (newPrice: number, direction: 'up' | 'down' | 'neutral') => void;
  onBidReceived?: (bidData: any) => void;
  onSlotUpdate?: (slotsRemaining: number) => void;
}

export interface MarketPulseConnection {
  disconnect: () => void;
  simulatePriceChange: () => void;
}

/**
 * Initialize Market Pulse WebSocket connection for real-time updates
 */
export function initializeMarketPulse(config: MarketPulseConfig): MarketPulseConnection {
  const { opportunityId, onPriceUpdate, onBidReceived, onSlotUpdate } = config;
  
  // For now, we'll simulate the WebSocket connection with intervals
  // In production, this would connect to a real WebSocket server
  let priceUpdateInterval: NodeJS.Timeout | null = null;
  let isConnected = true;
  
  // Simulate market activity
  const simulateMarketActivity = () => {
    if (!isConnected) return;
    
    // Random chance of price change (10% chance every 5 seconds)
    if (Math.random() < 0.1) {
      const priceChange = Math.floor(Math.random() * 6) - 3; // -3 to +2
      const direction = priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'neutral';
      
      if (onPriceUpdate && priceChange !== 0) {
        onPriceUpdate(priceChange, direction);
      }
    }
    
    // Simulate occasional bid activity
    if (Math.random() < 0.05) { // 5% chance
      if (onBidReceived) {
        onBidReceived({
          bidder: 'Anonymous',
          amount: Math.floor(Math.random() * 100) + 200,
          timestamp: new Date().toISOString()
        });
      }
    }
  };
  
  // Start the simulation
  priceUpdateInterval = setInterval(simulateMarketActivity, 5000);
  
  // Manual price change simulation
  const simulatePriceChange = () => {
    const randomChange = Math.floor(Math.random() * 6) - 3; // -3 to +2
    const direction = randomChange > 0 ? 'up' : randomChange < 0 ? 'down' : 'neutral';
    
    if (onPriceUpdate) {
      onPriceUpdate(randomChange, direction);
    }
  };
  
  // Return connection interface
  return {
    disconnect: () => {
      isConnected = false;
      if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
        priceUpdateInterval = null;
      }
    },
    simulatePriceChange
  };
}

/**
 * Calculate market heat level based on recent activity
 */
export function calculateMarketHeat(
  basePrice: number,
  currentPrice: number,
  timeActive: number // in hours
): 'cold' | 'warm' | 'hot' | 'blazing' {
  const priceIncrease = (currentPrice - basePrice) / basePrice;
  const activityScore = priceIncrease * (1 / Math.max(timeActive, 1));
  
  if (activityScore > 0.3) return 'blazing';
  if (activityScore > 0.15) return 'hot';
  if (activityScore > 0.05) return 'warm';
  return 'cold';
}

/**
 * Generate market pulse indicators for UI
 */
export function getMarketPulseIndicators(heat: string) {
  switch (heat) {
    case 'blazing':
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        pulse: 'animate-pulse',
        icon: '🔥',
        label: 'Blazing Hot'
      };
    case 'hot':
      return {
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        pulse: 'animate-pulse',
        icon: '🔥',
        label: 'Hot'
      };
    case 'warm':
      return {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        pulse: '',
        icon: '📈',
        label: 'Warm'
      };
    default:
      return {
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        pulse: '',
        icon: '📊',
        label: 'Steady'
      };
  }
} 