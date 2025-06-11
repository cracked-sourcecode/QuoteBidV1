/**
 * QuoteBid Live Price Updates Hook
 * 
 * Connects to WebSocket server and updates React Query cache in real-time
 */

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";

interface PriceUpdate {
  id: number;
  oldPrice: number;
  newPrice: number;
  trend: number; // 1, 0, -1
  timestamp: string;
  source: "worker" | "admin" | "gpt";
}

interface BatchPriceUpdate {
  updates: PriceUpdate[];
  timestamp: string;
}

interface ConnectionStatus {
  connected: boolean;
  lastUpdate?: string;
  error?: string;
}

// Use Vite environment variables or fallback to localhost:4000 for the pricing WebSocket
const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:4000";

export function useLivePrice() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false
  });

  useEffect(() => {
    console.log("🔌 Initializing WebSocket connection to", WS_URL);
    
    // Create socket connection
    const socket = io(WS_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("✅ WebSocket connected:", socket.id);
      setConnectionStatus({ connected: true });
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ WebSocket disconnected:", reason);
      setConnectionStatus({ connected: false, error: reason });
    });

    socket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection error:", error);
      setConnectionStatus({ connected: false, error: error.message });
    });

    // Handle initial connection confirmation
    socket.on("connected", (data) => {
      console.log("🎉 WebSocket server confirmed connection:", data.message);
    });

    // Handle individual price updates
    socket.on("price:update", (update: PriceUpdate) => {
      console.log(`💰 Price update received: OPP ${update.id} $${update.oldPrice} → $${update.newPrice} (${update.source})`);
      
      setConnectionStatus(prev => ({ 
        ...prev, 
        lastUpdate: update.timestamp 
      }));

      // Update opportunities list cache
      queryClient.setQueryData(['opportunities'], (oldData: any) => {
        if (!oldData) return oldData;
        
        return oldData.map((opp: any) => 
          opp.id === update.id 
            ? { 
                ...opp, 
                current_price: update.newPrice.toString(),
                _liveUpdate: {
                  trend: update.trend,
                  source: update.source,
                  timestamp: update.timestamp
                }
              }
            : opp
        );
      });

      // Update individual opportunity cache if it exists
      queryClient.setQueryData(['opportunity', update.id], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          current_price: update.newPrice.toString(),
          _liveUpdate: {
            trend: update.trend,
            source: update.source,
            timestamp: update.timestamp
          }
        };
      });

      // Also update any related pitch queries that might show the opportunity
      queryClient.invalidateQueries({
        queryKey: ['pitches'],
        exact: false
      });
    });

    // Handle batch price updates (more efficient for multiple changes)
    socket.on("price:batch", (batchUpdate: BatchPriceUpdate) => {
      console.log(`💰 Batch price update received: ${batchUpdate.updates.length} opportunities`);
      
      setConnectionStatus(prev => ({ 
        ...prev, 
        lastUpdate: batchUpdate.timestamp 
      }));

      // Update opportunities list cache with all changes
      queryClient.setQueryData(['opportunities'], (oldData: any) => {
        if (!oldData) return oldData;
        
        const updateMap = new Map(batchUpdate.updates.map(u => [u.id, u]));
        
        return oldData.map((opp: any) => {
          const update = updateMap.get(opp.id);
          return update 
            ? { 
                ...opp, 
                current_price: update.newPrice.toString(),
                _liveUpdate: {
                  trend: update.trend,
                  source: update.source,
                  timestamp: update.timestamp
                }
              }
            : opp;
        });
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['pitches'],
        exact: false
      });
    });

    // Handle focused price updates for specific opportunities
    socket.on("price:focused", (update: PriceUpdate) => {
      console.log(`🎯 Focused price update: OPP ${update.id}`);
      
      // This is for when user is viewing a specific opportunity
      queryClient.setQueryData(['opportunity', update.id], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          current_price: update.newPrice.toString(),
          _liveUpdate: {
            trend: update.trend,
            source: update.source,
            timestamp: update.timestamp,
            focused: true // Special flag for focused updates
          }
        };
      });
    });

    // Cleanup on unmount
    return () => {
      console.log("🔌 Cleaning up WebSocket connection");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  // Helper functions for components
  const joinOpportunityRoom = (opportunityId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join:opportunity", opportunityId);
      console.log(`📊 Joined opportunity room: ${opportunityId}`);
    }
  };

  const leaveOpportunityRoom = (opportunityId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave:opportunity", opportunityId);
      console.log(`📊 Left opportunity room: ${opportunityId}`);
    }
  };

  const joinAdminRoom = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join:admin");
      console.log("👨‍💼 Joined admin room");
    }
  };

  return {
    connectionStatus,
    joinOpportunityRoom,
    leaveOpportunityRoom,
    joinAdminRoom,
    socket: socketRef.current
  };
}

// Hook for specifically monitoring an opportunity
export function useOpportunityLivePrice(opportunityId: number) {
  const { joinOpportunityRoom, leaveOpportunityRoom, connectionStatus } = useLivePrice();
  
  useEffect(() => {
    if (opportunityId && connectionStatus.connected) {
      joinOpportunityRoom(opportunityId);
      
      return () => {
        leaveOpportunityRoom(opportunityId);
      };
    }
  }, [opportunityId, connectionStatus.connected, joinOpportunityRoom, leaveOpportunityRoom]);
  
  return { connectionStatus };
} 