const WS_PORT = import.meta.env.VITE_WS_PORT || 5050; // fallback for dev

export function setupWebSocket(token: string): WebSocket {
  return new WebSocket(
    `ws://${window.location.hostname}:${WS_PORT}?token=${token}`
  );
}
