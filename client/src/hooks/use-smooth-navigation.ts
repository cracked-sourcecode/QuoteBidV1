import { useLocation } from "wouter";
import { useCallback } from "react";

export function useSmoothNavigation() {
  const [_, navigate] = useLocation();
  
  const smoothNavigate = useCallback((path: string) => {
    // First, set the body background to prevent white flash
    const originalBodyBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#004684';
    
    // Create a transition overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #004684;
      z-index: 99999;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      pointer-events: none;
    `;
    
    document.body.appendChild(overlay);
    
    // Force reflow to ensure the initial state is applied
    overlay.offsetHeight;
    
    // Fade in the overlay
    overlay.style.opacity = '1';
    
    // Navigate after the overlay is fully visible
    setTimeout(() => {
      navigate(path);
      
      // Keep the overlay visible for a bit longer to ensure smooth transition
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          if (overlay.parentNode) {
            document.body.removeChild(overlay);
          }
          // Restore original body background
          document.body.style.backgroundColor = originalBodyBg;
        }, 200);
      }, 100);
    }, 200);
  }, [navigate]);
  
  return smoothNavigate;
} 