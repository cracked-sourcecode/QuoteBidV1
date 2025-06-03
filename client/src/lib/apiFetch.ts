/** Fetch wrapper that automatically adds JWT token to every request */
export async function apiFetch(
  input: RequestInfo,
  init: RequestInit = {}
) {
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers || {});
  
  // Always ensure content-type is set for JSON requests
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('[apiFetch] Adding token to request:', input, 'Token length:', token.length);
    console.log('[apiFetch] First 20 chars of token:', token.substring(0, 20) + '...');
  } else {
    console.log('[apiFetch] No token found for request:', input);
    console.log('[apiFetch] LocalStorage keys:', Object.keys(localStorage));
  }
  
  const response = await fetch(input, { ...init, headers, credentials: 'include' });
  
  // Log response for debugging
  if (!response.ok) {
    console.log('[apiFetch] Request failed:', input, 'Status:', response.status);
  }
  
  return response;
}
