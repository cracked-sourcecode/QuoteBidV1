/**
 * Utility function to detect if the user is on a mobile device
 * This checks both screen size and user agent for comprehensive mobile detection
 */
export function isMobileDevice(): boolean {
  // Check screen size (mobile typically < 768px width)
  const isMobileScreen = window.innerWidth < 768;
  
  // Check user agent for mobile patterns
  const mobileUserAgents = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUserAgent = mobileUserAgents.test(navigator.userAgent);
  
  // Return true if either condition is met
  return isMobileScreen || isMobileUserAgent;
}

/**
 * Conditional toast function that only shows toasts on desktop
 * Use this instead of direct toast() calls during signup/registration
 */
export function conditionalToast(toastFn: Function, ...args: any[]) {
  if (!isMobileDevice()) {
    toastFn(...args);
  }
} 