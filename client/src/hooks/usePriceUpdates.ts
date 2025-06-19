import React, { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

interface PriceUpdate {
  opportunityId: number;
  price: number;
  trend: 'up' | 'down' | 'stable';
  timestamp: string;
}

export const usePriceUpdates = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  // Connect to WebSocket server - use environment variable or fallback
  const WS_URL = import.meta.env.VITE_WS_URL || 'wss://quotebid.co:4000';

  useEffect(() => {
    // Connect to WebSocket server on port 4000
    const socket = io(WS_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    setSocket(socket);

    // Listen for price updates
    socket.on('priceUpdate', (data: PriceUpdate) => {
      console.log('📈 Price update received:', data);
      
      // Update React Query cache for opportunities
      queryClient.setQueryData(['opportunities'], (oldData: any) => {
        if (!oldData) return oldData;
        
        return oldData.map((opp: any) => {
          if (opp.id === data.opportunityId) {
            return {
              ...opp,
              currentPrice: data.price,
              trend: data.trend,
              lastPriceUpdate: Date.now()
            };
          }
          return opp;
        });
      });

      // Also update individual opportunity queries
      queryClient.setQueryData(['opportunity', data.opportunityId], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          currentPrice: data.price,
          trend: data.trend,
          lastPriceUpdate: Date.now()
        };
      });
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔌 Connected to QuoteBid pricing engine');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from pricing engine');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.warn('🔌 WebSocket connection error:', error);
      // Fallback to polling if WebSocket fails
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      }, 5000);
    });

    return () => {
      socket.disconnect();
      setSocket(null);
    };
  }, [queryClient, WS_URL]);

  return {
    isConnected,
    socket
  };
} 