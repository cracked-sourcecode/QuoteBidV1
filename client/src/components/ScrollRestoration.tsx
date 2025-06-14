import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function ScrollRestoration() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Check if there's a hash in the URL
    const hash = window.location.hash;
    
    if (hash) {
      // For opportunity detail pages, let their existing scroll logic handle it
      // Don't interfere with pages that have their own hash handling
      if (location.includes('/opportunities/') && hash === '#pitch-section') {
        return; // Let the opportunity detail page handle this
      }
      
      // For other pages with hashes, handle normally
      const scrollToHash = (attempts = 0) => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else if (attempts < 5) {
          // Try again with longer delay
          setTimeout(() => scrollToHash(attempts + 1), 100 * (attempts + 1));
        }
      };
      
      // Start trying to scroll to the hash element
      setTimeout(() => scrollToHash(), 100);
    } else {
      // Only scroll to top if there's no hash
      window.scrollTo(0, 0);
    }
  }, [location]);
  
  return null;
} 