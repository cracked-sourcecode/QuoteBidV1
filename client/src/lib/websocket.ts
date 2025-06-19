// Use environment variable for WebSocket URL in production
const getWebSocketUrl = (token: string): string => {
  // In production, use secure WebSocket with proper domain
  if (import.meta.env.PROD) {
    return `wss://quotebid.co:4000?token=${token}`;
  }
  // In development, use localhost
  return `ws://${window.location.hostname}:4000?token=${token}`;
};

export function setupWebSocket(token: string): WebSocket {
  return new WebSocket(getWebSocketUrl(token));
}
