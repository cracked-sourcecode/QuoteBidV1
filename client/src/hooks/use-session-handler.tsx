import { useEffect } from 'react';
import { useAuth } from './use-auth';

/**
 * Hook to handle session expiration and auth errors globally
 * Redirects Rubicon users back to Rubicon when QuoteBid session expires
 */
export function useSessionHandler() {
  const { user, error } = useAuth();

  useEffect(() => {
    // Handle 401/403 errors (session expired)
    if (error && (error.message.includes('401') || error.message.includes('403'))) {
      const isRubiconIntegration = import.meta.env.VITE_RUBICON_INTEGRATION === 'true';
      
      if (isRubiconIntegration && user?.rubicon_user_id) {
        // Rubicon user session expired - redirect back to Rubicon
        console.log('🔒 QuoteBid session expired for Rubicon user - redirecting to Rubicon');
        const rubiconBaseUrl = import.meta.env.VITE_RUBICON_BASE_URL || 'https://www.rubiconprgroup.com';
        window.location.href = `${rubiconBaseUrl}/dashboard?message=session-expired`;
      }
    }
  }, [error, user]);

  // Global handler for 401 responses from API calls
  useEffect(() => {
    const handleUnauthorized = (event: CustomEvent) => {
      const isRubiconIntegration = import.meta.env.VITE_RUBICON_INTEGRATION === 'true';
      
      if (isRubiconIntegration && user?.rubicon_user_id) {
        console.log('🔒 Unauthorized API response for Rubicon user - redirecting to Rubicon');
        const rubiconBaseUrl = import.meta.env.VITE_RUBICON_BASE_URL || 'https://www.rubiconprgroup.com';
        window.location.href = `${rubiconBaseUrl}/dashboard?message=session-expired`;
      }
    };

    // Listen for custom 401 events from API calls
    window.addEventListener('quotebid-unauthorized', handleUnauthorized as EventListener);

    return () => {
      window.removeEventListener('quotebid-unauthorized', handleUnauthorized as EventListener);
    };
  }, [user]);
}

/**
 * Function to trigger session expiration redirect from anywhere in the app
 */
export function handleSessionExpired() {
  window.dispatchEvent(new CustomEvent('quotebid-unauthorized'));
}