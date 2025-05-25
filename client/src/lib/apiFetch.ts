/** Fetch wrapper that automatically adds JWT token to every request */
export async function apiFetch(
  input: RequestInfo,
  init: RequestInit = {}
) {
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('[apiFetch] Adding token to request:', input, 'Token length:', token.length);
  } else {
    console.log('[apiFetch] No token found for request:', input);
  }
  return fetch(input, { ...init, headers, credentials: 'include' });
}
