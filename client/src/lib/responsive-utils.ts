// Responsive design utilities for large screens and retina displays
// Addresses layout issues on 27" displays and larger screens

import { Publication } from '../../../shared/schema';

export const responsiveImageClasses = {
  // Logo sizes that scale properly on large screens
  logo: {
    small: "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-8 lg:h-8 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12",
    medium: "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-10 lg:h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14",
    large: "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24"
  },
  
  // Typography that scales for readability on large screens
  typography: {
    cardTitle: "text-base sm:text-lg md:text-lg lg:text-xl xl:text-xl 2xl:text-2xl",
    cardSubtitle: "text-sm sm:text-sm md:text-sm lg:text-base xl:text-base 2xl:text-lg",
    heroTitle: "text-3xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-5xl 2xl:text-6xl",
    heroSubtitle: "text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-3xl 2xl:text-4xl",
    badge: "text-xs sm:text-xs md:text-xs lg:text-sm xl:text-sm 2xl:text-base",
    price: "text-xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-3xl 2xl:text-4xl"
  },
  
  // Grid layouts optimized for different screen sizes
  grids: {
    opportunities: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4",
    cards: "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    stats: "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6"
  },
  
  // Spacing that works well on large screens
  spacing: {
    cardPadding: "p-3 sm:p-4 md:p-4 lg:p-5 xl:p-6 2xl:p-8",
    sectionPadding: "px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-10 lg:py-12 xl:px-12 xl:py-16 2xl:px-16 2xl:py-20",
    gaps: {
      small: "gap-2 sm:gap-3 md:gap-4 lg:gap-4 xl:gap-5 2xl:gap-6",
      medium: "gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-8 2xl:gap-10",
      large: "gap-6 sm:gap-8 md:gap-10 lg:gap-12 xl:gap-16 2xl:gap-20"
    }
  }
};

// Image loading utilities with retina display support
export const createResponsiveImageProps = (
  src: string,
  alt: string,
  fallbackIcon?: React.ComponentType<any>
) => {
  return {
    src,
    alt,
    className: "w-full h-full object-contain p-1",
    loading: "lazy" as const,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.target as HTMLImageElement;
      console.log(`Image failed to load: ${src}`);
      target.style.display = 'none';
      const fallback = target.nextElementSibling as HTMLElement;
      if (fallback) fallback.style.display = 'flex';
    },
    onLoad: (e: React.SyntheticEvent<HTMLImageElement>) => {
      // Ensure image loaded successfully for retina displays
      const img = e.target as HTMLImageElement;
      setTimeout(() => {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          console.log(`Image dimensions failed for: ${src}`);
          const fallback = img.nextElementSibling as HTMLElement;
          if (fallback) {
            img.style.display = 'none';
            fallback.style.display = 'flex';
          }
        }
      }, 100);
    },
    style: { 
      imageRendering: 'crisp-edges',
      WebkitImageRendering: 'crisp-edges'
    } as React.CSSProperties
  };
};

// Container utilities for preventing overflow on large screens
export const containerClasses = {
  maxWidth: "max-w-7xl 2xl:max-w-8xl mx-auto",
  fullWidth: "w-full min-w-0",
  flexContainer: "flex-1 min-w-0"
};

// Breakpoint utilities
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920, // For 27" displays and larger
};

// Helper function to get responsive classes
export const getResponsiveClasses = (
  config: keyof typeof responsiveImageClasses
) => {
  return responsiveImageClasses[config];
};

// Fix for logo/title overlap issues
export const preventOverlapClasses = {
  logoContainer: "flex items-center justify-start mb-6 pt-6",
  titleContainer: "mb-8 lg:mb-10",
  flexPreventOverflow: "flex-1 min-w-0 truncate"
};

// Layout debugging utilities (remove in production)
export const debugClasses = {
  border: "border-2 border-red-500",
  background: "bg-red-100",
  outline: "outline outline-2 outline-blue-500"
};

// Image loading utility with retina support
export const getOptimizedImageUrl = (url: string, size: 'sm' | 'md' | 'lg' = 'md'): string => {
  if (!url) return '';
  
  // Handle different image sizes for retina displays
  const sizeMap = {
    sm: { width: 40, height: 40 },
    md: { width: 80, height: 80 },
    lg: { width: 120, height: 120 }
  };
  
  const dimensions = sizeMap[size];
  
  // If it's already a data URL or external URL, return as-is
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // For local URLs, ensure they're properly formatted
  if (url.startsWith('/')) {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}${url}`;
  }
  
  return url;
};

// Get publication logo with comprehensive fallback system
export const getPublicationLogo = (publication: Publication | null | undefined): string => {
  // If no publication provided, return empty string (will trigger fallback)
  if (!publication) {
    console.warn('No publication provided to getPublicationLogo');
    return '';
  }
  
  // Try to get the logo URL
  const logoUrl = publication.logo;
  if (!logoUrl) {
    console.warn(`No logo found for publication: ${publication.name}`);
    return '';
  }
  
  // Return the optimized URL
  const optimizedUrl = getOptimizedImageUrl(logoUrl, 'md');
  console.log(`Using logo for ${publication.name}:`, optimizedUrl);
  return optimizedUrl;
};

// Enhanced responsive image classes with mobile-first approach
export const getResponsiveImageClasses = (baseSize: string = 'w-10 h-10'): string => {
  return `${baseSize} sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24`;
};

// Logo container classes that work across all devices
export const getLogoContainerClasses = (): string => {
  return 'flex-shrink-0 flex items-center justify-center bg-white rounded-lg border border-gray-200 overflow-hidden';
};

// Comprehensive logo fallback component props
export interface LogoImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ComponentType<{ className?: string }>;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
}

// Publication-specific logo handling
export const getPublicationSpecificLogo = (publicationName: string): string => {
  const logoMap: Record<string, string> = {
    'Yahoo Finance': 'https://logos-world.net/wp-content/uploads/2020/11/Yahoo-Finance-Logo.png',
    'Bloomberg': 'https://logos-world.net/wp-content/uploads/2020/11/Bloomberg-Logo.png',
    'Forbes': 'https://logos-world.net/wp-content/uploads/2020/11/Forbes-Logo.png',
    'Wall Street Journal': 'https://logos-world.net/wp-content/uploads/2020/11/Wall-Street-Journal-Logo.png',
    'Financial Times': 'https://logos-world.net/wp-content/uploads/2020/11/Financial-Times-Logo.png'
  };
  
  return logoMap[publicationName] || '';
};

// Check if image URL is valid and accessible
export const validateImageUrl = async (url: string): Promise<boolean> => {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// Device-specific optimizations
export const getDeviceOptimizedClasses = (): string => {
  // Mobile-first responsive classes that work on all devices
  return 'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 2xl:w-20 2xl:h-20';
};

// Debug utilities for retina display issues
export const debugImageLoading = (src: string, element: HTMLImageElement) => {
  console.group(`🖼️ Image Debug: ${src}`);
  console.log('Element:', element);
  console.log('Natural dimensions:', `${element.naturalWidth}x${element.naturalHeight}`);
  console.log('Display dimensions:', `${element.width}x${element.height}`);
  console.log('Complete:', element.complete);
  console.log('Device pixel ratio:', window.devicePixelRatio);
  console.log('Image src:', element.src);
  console.groupEnd();
}; 