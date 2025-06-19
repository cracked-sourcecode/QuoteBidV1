/**
 * QuoteBid WebSocket Server
 * 
 * Handles real-time price updates, system events, and admin notifications
 */

import { createServer } from "http";
import { Server } from "socket.io";

// Create HTTP server for Socket.io
const httpServer = createServer();

// Initialize Socket.io with CORS for development
export const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, restrict this to your domain
    methods: ["GET", "POST"]
  }
});

// Connection handling
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Send initial connection confirmation
  socket.emit("connected", {
    timestamp: new Date().toISOString(),
    message: "Connected to QuoteBid real-time updates"
  });
  
  // Handle client disconnection
  socket.on("disconnect", (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
  });
  
  // Handle admin room joining for admin-specific events
  socket.on("join:admin", (data) => {
    console.log(`👨‍💼 Admin client joined: ${socket.id}`);
    socket.join("admin");
    socket.emit("admin:joined", { status: "success" });
  });
  
  // Handle opportunity room joining for specific opportunity updates
  socket.on("join:opportunity", (opportunityId) => {
    console.log(`📊 Client joined opportunity room: ${opportunityId}`);
    socket.join(`opportunity:${opportunityId}`);
  });
  
  // Handle leaving opportunity room
  socket.on("leave:opportunity", (opportunityId) => {
    console.log(`📊 Client left opportunity room: ${opportunityId}`);
    socket.leave(`opportunity:${opportunityId}`);
  });
});

// Helper functions for emitting events
export const priceUpdates = {
  // Emit price update to all clients and specific opportunity room
  priceChanged: (update: {
    id: number;
    oldPrice: number;
    newPrice: number;
    trend: number; // 1, 0, -1
    timestamp: string;
    source: "worker" | "admin" | "gpt";
  }) => {
    console.log(`📡 Broadcasting price update: OPP ${update.id} $${update.oldPrice} → $${update.newPrice}`);
    
    // Broadcast to all clients
    io.emit("price:update", update);
    
    // Also emit to specific opportunity room
    io.to(`opportunity:${update.id}`).emit("price:focused", update);
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
    console.log(`📡 Broadcasting batch price update: ${updates.length} opportunities`);
    io.emit("price:batch", { updates, timestamp: new Date().toISOString() });
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
    console.log(`📡 Broadcasting worker status: ${status.status}`);
    io.to("admin").emit("worker:status", status);
  },
  
  // GPT metrics
  gptMetrics: (metrics: {
    latency: number;
    tokensUsed: number;
    cost: number;
    model: string;
    timestamp: string;
  }) => {
    io.to("admin").emit("gpt:metrics", metrics);
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
    console.log(`📡 Broadcasting config update: ${update.type}.${update.key}`);
    io.emit("config:update", update);
  }
};

// Health check endpoint data
export const healthStats = {
  connections: () => io.sockets.sockets.size,
  rooms: () => Object.keys(io.sockets.adapter.rooms).length
};

// Start server if this file is run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url === encodeURI(`file://${process.argv[1]}`);

// Also check if we're being run directly vs imported
const isDirectRun = process.argv[1] && process.argv[1].includes('wsServer');

// Don't auto-start if imported by pricing worker
const isPricingWorker = process.env.PRICING_WORKER === 'true';

if ((isMainModule || isDirectRun) && !isPricingWorker) {
  const WS_PORT = process.env.WS_PORT || 4000;
  
  httpServer.listen(WS_PORT, () => {
    console.log(`🚀 QuoteBid WebSocket Server running on port ${WS_PORT}`);
    console.log(`🔌 Ready for real-time price updates`);
  });
}

// Export function to manually start server
export function startWebSocketServer(port: number = 4000) {
  return new Promise<void>((resolve, reject) => {
    httpServer.listen(port, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        console.log(`🚀 QuoteBid WebSocket Server running on port ${port}`);
        console.log(`🔌 Ready for real-time price updates`);
        resolve();
      }
    });
  });
}

export default io; 