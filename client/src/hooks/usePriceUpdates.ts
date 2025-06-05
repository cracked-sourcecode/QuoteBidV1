import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

interface PriceUpdate {
  opportunityId: number;
  price: number;
  trend: 'up' | 'down' | 'neutral';
}

export function usePriceUpdates() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server on port 4000
    const socket = io('http://localhost:4000', {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

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
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from pricing engine');
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
      socketRef.current = null;
    };
  }, [queryClient]);

  return {
    isConnected: socketRef.current?.connected || false,
    socket: socketRef.current
  };
} 