const WS_PORT = 4000; // WebSocket server port (matches wsServer.ts)

export function setupWebSocket(token: string): WebSocket {
  return new WebSocket(
    `ws://${window.location.hostname}:${WS_PORT}?token=${token}`
  );
}
