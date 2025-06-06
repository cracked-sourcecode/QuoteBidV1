const WS_PORT = 5050; // Main server port for WebSocket connections

export function setupWebSocket(token: string): WebSocket {
  return new WebSocket(
    `ws://${window.location.hostname}:${WS_PORT}?token=${token}`
  );
}
