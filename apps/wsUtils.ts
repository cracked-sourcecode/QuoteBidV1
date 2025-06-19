/**
 * WebSocket utilities that can be safely imported by workers
 * without starting a WebSocket server
 */

// Stub implementations that can be used when WebSocket server is not available
export const priceUpdates = {
  // Emit price update - will only work if WebSocket server is running separately
  priceChanged: (update: {
    id: number;
    oldPrice: number;
    newPrice: number;
    trend: number; // 1, 0, -1
    timestamp: string;
    source: "worker" | "admin" | "gpt";
  }) => {
    console.log(`📡 Price update: OPP ${update.id} $${update.oldPrice} → $${update.newPrice} (${update.source})`);
    
    // Try to emit to WebSocket server if available
    try {
      // This will only work if there's a WebSocket server running on the expected port
      // In production, the WebSocket server runs as a separate process
      // so this will just log the update
    } catch (error) {
      // Silently fail - WebSocket server might not be available
    }
  },
  
  // Emit batch price updates
  batchUpdate: (updates: Array<{
    id: number;
    oldPrice: number;
    newPrice: number;
    trend: number;
    timestamp: string;
    source: "worker" | "admin" | "gpt";
  }>) => {
    console.log(`📡 Batch price update: ${updates.length} opportunities`);
  }
};

export const systemEvents = {
  // Worker status updates
  workerStatus: (status: {
    status: "online" | "offline" | "error";
    lastTick: string;
    nextTick?: string;
    processedCount?: number;
    gptLatency?: number;
  }) => {
    console.log(`📡 Worker status: ${status.status}`);
  },
  
  // GPT metrics
  gptMetrics: (metrics: {
    latency: number;
    tokensUsed: number;
    cost: number;
    model: string;
    timestamp: string;
  }) => {
    console.log(`📡 GPT metrics: ${metrics.latency}ms, ${metrics.tokensUsed} tokens`);
  },
  
  // Admin configuration changes
  configUpdate: (update: {
    type: "variable" | "config";
    key: string;
    oldValue: any;
    newValue: any;
    updatedBy: string;
    timestamp: string;
  }) => {
    console.log(`📡 Config update: ${update.type}.${update.key}`);
  }
}; 