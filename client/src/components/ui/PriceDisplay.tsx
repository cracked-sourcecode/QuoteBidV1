/**
 * Real-Time Price Display Component
 * 
 * Shows current price with live update indicators and trend animations
 */

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Zap, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number | string;
  className?: string;
  showTrend?: boolean;
  liveUpdate?: {
    trend: number; // 1, 0, -1
    source: "worker" | "admin" | "gpt";
    timestamp: string;
    focused?: boolean;
  };
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export function PriceDisplay({ 
  price, 
  className = "", 
  showTrend = true,
  liveUpdate,
  size = "md",
  animate = true
}: PriceDisplayProps) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  
  // Convert price to number
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  const displayPrice = isNaN(numericPrice) ? 0 : numericPrice;
  
  // Flash animation when live update occurs
  useEffect(() => {
    if (liveUpdate && animate) {
      setIsFlashing(true);
      setShowBadge(true);
      
      // Remove flash effect
      const flashTimer = setTimeout(() => {
        setIsFlashing(false);
      }, 500);
      
      // Remove badge after longer delay
      const badgeTimer = setTimeout(() => {
        setShowBadge(false);
      }, 3000);
      
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(badgeTimer);
      };
    }
  }, [liveUpdate?.timestamp, animate]);
  
  // Get trend icon and color
  const getTrendDisplay = () => {
    if (!liveUpdate || !showTrend) return null;
    
    const trend = liveUpdate.trend;
    if (trend > 0) {
      return {
        icon: TrendingUp,
        color: "text-green-600",
        bgColor: "bg-green-100",
        label: "↑"
      };
    } else if (trend < 0) {
      return {
        icon: TrendingDown, 
        color: "text-red-600",
        bgColor: "bg-red-100",
        label: "↓"
      };
    } else {
      return {
        icon: Minus,
        color: "text-gray-600",
        bgColor: "bg-gray-100", 
        label: "→"
      };
    }
  };
  
  // Get source icon
  const getSourceIcon = () => {
    if (!liveUpdate) return null;
    
    switch (liveUpdate.source) {
      case "gpt":
        return <Bot className="w-3 h-3" />;
      case "admin":
        return <User className="w-3 h-3" />;
      case "worker":
        return <Zap className="w-3 h-3" />;
      default:
        return null;
    }
  };
  
  // Size variations
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg", 
    lg: "text-2xl"
  };
  
  const trendDisplay = getTrendDisplay();
  
  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      {/* Main Price */}
      <span 
        className={cn(
          "font-semibold text-gray-900 transition-all duration-300",
          sizeClasses[size],
          isFlashing && animate && [
            "scale-105",
            liveUpdate?.trend && liveUpdate.trend > 0 ? "text-green-600" : 
            liveUpdate?.trend && liveUpdate.trend < 0 ? "text-red-600" :
            "text-blue-600"
          ]
        )}
      >
        ${displayPrice.toLocaleString()}
      </span>
      
      {/* Trend Indicator */}
      {trendDisplay && showTrend && (
        <div className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-all duration-300",
          trendDisplay.color,
          trendDisplay.bgColor,
          isFlashing && animate && "scale-110"
        )}>
          <trendDisplay.icon className="w-3 h-3" />
          <span>{trendDisplay.label}</span>
        </div>
      )}
      
      {/* Live Update Badge */}
      {showBadge && liveUpdate && (
        <div className={cn(
          "absolute -top-2 -right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all duration-300",
          "bg-blue-600 text-white shadow-sm",
          animate && "animate-pulse"
        )}>
          {getSourceIcon()}
          <span className="uppercase text-[10px] font-bold">
            {liveUpdate.source === "gpt" ? "AI" : 
             liveUpdate.source === "admin" ? "ADM" : "SYS"}
          </span>
        </div>
      )}
      
      {/* Focused Update Indicator */}
      {liveUpdate?.focused && (
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
      )}
    </div>
  );
}

// Specialized component for opportunity cards
export function OpportunityPriceDisplay({ 
  opportunity, 
  className = "" 
}: { 
  opportunity: any;
  className?: string;
}) {
  const price = opportunity?.current_price || opportunity?.tier_price || 0;
  const liveUpdate = opportunity?._liveUpdate;
  
  return (
    <PriceDisplay
      price={price}
      liveUpdate={liveUpdate}
      className={className}
      size="md"
      showTrend={true}
      animate={true}
    />
  );
}

// Connection status indicator
export function LiveConnectionStatus({ 
  connectionStatus 
}: { 
  connectionStatus: { connected: boolean; lastUpdate?: string; error?: string; }
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className={cn(
        "w-2 h-2 rounded-full transition-colors",
        connectionStatus.connected ? "bg-green-500" : "bg-red-500"
      )} />
      <span>
        {connectionStatus.connected ? "Live" : "Offline"}
        {connectionStatus.lastUpdate && (
          <span className="ml-1">
            • {new Date(connectionStatus.lastUpdate).toLocaleTimeString()}
          </span>
        )}
      </span>
      {connectionStatus.error && (
        <span className="text-red-500 text-xs">
          ({connectionStatus.error})
        </span>
      )}
    </div>
  );
} 