import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Price metadata for each opportunity
export interface PriceMeta {
  opportunityId: number;
  currentPrice: number;
  deltaPastHour: number;
  percentChange: number;
  trend: 'up' | 'down' | 'stable';
  lastPriceUpdate: string | null;
  lastUpdated: number; // timestamp for cache invalidation
}

// WebSocket message format for price updates
interface PriceUpdateMessage {
  id: number;
  oldPrice: number;
  newPrice: number;
  trend: number; // -1, 0, 1
  timestamp: string;
  source: 'worker' | 'gpt';
}

// Context state
interface PriceContextState {
  prices: Map<number, PriceMeta>;
  isConnected: boolean;
  lastActivity: number;
  connectionCount: number;
}

// Context methods
interface PriceContextMethods {
  updatePrice: (update: PriceUpdateMessage) => void;
  refreshPrice: (opportunityId: number) => Promise<void>;
  refreshAllPrices: () => Promise<void>;
  getPrice: (opportunityId: number) => PriceMeta | null;
}

type PriceContextType = PriceContextState & PriceContextMethods;

const PriceContext = createContext<PriceContextType | null>(null);

// Custom hook to use price context
export const usePrices = () => {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePrices must be used within a PriceProvider');
  }
  return context;
};

// Price provider component
export const PriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PriceContextState>({
    prices: new Map(),
    isConnected: false,
    lastActivity: Date.now(),
    connectionCount: 0
  });

  // Socket.io connection
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Connect to Socket.io for real-time updates
  const connectWebSocket = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting || (socketRef.current && socketRef.current.connected)) {
      console.log('🔌 Already connecting or connected, skipping connection attempt');
      return;
    }
    
    try {
      setIsConnecting(true);
      
      // Disconnect existing socket first
      if (socketRef.current) {
        console.log('🔌 Disconnecting existing socket...');
        socketRef.current.disconnect();
      }
      
      const socketUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
      
      console.log('🔌 Connecting to price Socket.io:', socketUrl);
      
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        forceNew: false // Don't force new connection every time
      });
      
      newSocket.on('connect', () => {
        console.log('🔌 Price Socket.io connected successfully!');
        setIsConnecting(false);
        setState(prev => ({ 
          ...prev, 
          isConnected: true,
          connectionCount: prev.connectionCount + 1,
          lastActivity: Date.now()
        }));
      });
      
      newSocket.on('connected', (data) => {
        console.log('🔌 Server confirmed connection:', data.message);
      });
      
      // Listen for price updates
      newSocket.on('price:update', (update: PriceUpdateMessage) => {
        console.log('💰 Received price update:', update);
        updatePrice(update);
        
        setState(prev => ({ 
          ...prev, 
          lastActivity: Date.now()
        }));
      });
      
      // Listen for batch price updates
      newSocket.on('price:batch', (data: { updates: PriceUpdateMessage[], timestamp: string }) => {
        console.log('💰 Received batch price update:', data.updates.length, 'opportunities');
        data.updates.forEach(update => updatePrice(update));
        
        setState(prev => ({ 
          ...prev, 
          lastActivity: Date.now()
        }));
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Price Socket.io disconnected:', reason);
        setIsConnecting(false);
        setState(prev => ({ ...prev, isConnected: false }));
        socketRef.current = null;
        
        // Reconnect after 3 seconds unless it was intentional
        if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
          setTimeout(() => {
            console.log('🔄 Attempting Socket.io reconnection...');
            connectWebSocket();
          }, 3000);
        }
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('❌ Price Socket.io connection error:', error);
        setIsConnecting(false);
        setState(prev => ({ ...prev, isConnected: false }));
      });
      
      setSocket(newSocket);
      socketRef.current = newSocket;
      
    } catch (error) {
      console.error('❌ Failed to create Socket.io connection:', error);
      setIsConnecting(false);
    }
  }, []); // Remove dependencies to prevent infinite recreation

  // Update price in state from WebSocket message
  const updatePrice = useCallback((update: PriceUpdateMessage) => {
    setState(prev => {
      const newPrices = new Map(prev.prices);
      const existing = newPrices.get(update.id);
      
      // Calculate delta from previous price
      const deltaPastHour = update.newPrice - (existing?.currentPrice || update.oldPrice);
      const percentChange = existing?.currentPrice 
        ? ((deltaPastHour / existing.currentPrice) * 100)
        : 0;

      const newPriceMeta: PriceMeta = {
        opportunityId: update.id,
        currentPrice: update.newPrice,
        deltaPastHour,
        percentChange: Math.round(percentChange),
        trend: update.trend > 0 ? 'up' : update.trend < 0 ? 'down' : 'stable',
        lastPriceUpdate: update.timestamp,
        lastUpdated: Date.now()
      };
      
      newPrices.set(update.id, newPriceMeta);
      
      console.log(`💰 Price updated: OPP ${update.id} → $${update.newPrice} (${update.source})`);
      
      return {
        ...prev,
        prices: newPrices
      };
    });
  }, []);

  // Refresh single opportunity price from API
  const refreshPrice = useCallback(async (opportunityId: number) => {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`);
      if (!response.ok) throw new Error('Failed to fetch opportunity');
      
      const opportunity = await response.json();
      
      const priceMeta: PriceMeta = {
        opportunityId,
        currentPrice: opportunity.currentPrice || 0,
        deltaPastHour: opportunity.deltaPastHour || 0,
        percentChange: opportunity.percentChange || 0,
        trend: opportunity.trend || 'stable',
        lastPriceUpdate: opportunity.lastPriceUpdate,
        lastUpdated: Date.now()
      };
      
      setState(prev => {
        const newPrices = new Map(prev.prices);
        newPrices.set(opportunityId, priceMeta);
        return { ...prev, prices: newPrices };
      });
      
    } catch (error) {
      console.error(`❌ Failed to refresh price for opportunity ${opportunityId}:`, error);
    }
  }, []);

  // Refresh all prices from API
  const refreshAllPrices = useCallback(async () => {
    try {
      const response = await fetch('/api/opportunities');
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      
      const opportunities = await response.json();
      
      setState(prev => {
        const newPrices = new Map(prev.prices);
        
        opportunities.forEach((opp: any) => {
          const priceMeta: PriceMeta = {
            opportunityId: opp.id,
            currentPrice: opp.currentPrice || 0,
            deltaPastHour: opp.deltaPastHour || 0,
            percentChange: opp.percentChange || 0,
            trend: opp.trend || 'stable',
            lastPriceUpdate: opp.lastPriceUpdate,
            lastUpdated: Date.now()
          };
          
          newPrices.set(opp.id, priceMeta);
        });
        
        return { ...prev, prices: newPrices };
      });
      
      console.log(`💰 Refreshed prices for ${opportunities.length} opportunities`);
      
    } catch (error) {
      console.error('❌ Failed to refresh all prices:', error);
    }
  }, []);

  // Get price for specific opportunity
  const getPrice = useCallback((opportunityId: number): PriceMeta | null => {
    return state.prices.get(opportunityId) || null;
  }, [state.prices]);

  // Initialize Socket.io connection on mount
  useEffect(() => {
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Remove connectWebSocket dependency to prevent infinite loop

  // Refresh prices periodically as fallback (balanced approach)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if we haven't had recent Socket.io activity
      const timeSinceActivity = Date.now() - state.lastActivity;
      if (timeSinceActivity > 60000) { // 1 minute
        console.log('🔄 Refreshing prices due to stale Socket.io data');
        refreshAllPrices();
      }
    }, 120000); // Check every 2 minutes

    return () => clearInterval(interval);
  }, [state.lastActivity, refreshAllPrices]);

  const contextValue: PriceContextType = {
    ...state,
    updatePrice,
    refreshPrice,
    refreshAllPrices,
    getPrice
  };

  return (
    <PriceContext.Provider value={contextValue}>
      {children}
    </PriceContext.Provider>
  );
};

// Hook to get connection status
export const usePriceConnection = () => {
  const { isConnected, connectionCount } = usePrices();
  return { isConnected, connectionCount };
};

// Convenience hook for getting price of specific opportunity
export const useOpportunityPrice = (opportunityId: number) => {
  const { getPrice, refreshPrice } = usePrices();
  
  // Don't try to get price data for invalid IDs
  if (!opportunityId || opportunityId <= 0) {
    return null;
  }
  
  const price = getPrice(opportunityId);
  
  // Load prices immediately on mount, then refresh if stale
  useEffect(() => {
    if (opportunityId > 0) {
      if (!price) {
        // Load immediately if no price data
        console.log(`💰 Loading price immediately for opportunity ${opportunityId}`);
        refreshPrice(opportunityId);
      } else if (Date.now() - price.lastUpdated > 120000) {
        // Refresh if stale (older than 2 minutes)
        console.log(`🔄 Refreshing stale price for opportunity ${opportunityId}`);
        refreshPrice(opportunityId);
      }
    }
  }, [opportunityId, price, refreshPrice]);
  
  return price;
};

export default PriceContext; 