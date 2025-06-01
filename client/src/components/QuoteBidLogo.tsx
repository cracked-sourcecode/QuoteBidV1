import React from 'react';

interface QuoteBidLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
}

export default function QuoteBidLogo({ 
  className = "", 
  size = "md", 
  variant = "full" 
}: QuoteBidLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto", 
    lg: "h-10 w-auto",
    xl: "h-12 w-auto"
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl", 
    xl: "text-3xl"
  };

  if (variant === 'text') {
    return (
      <div className={`font-bold text-blue-600 ${textSizeClasses[size]} ${className}`}>
        QuoteBid
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <div className={`${sizeClasses[size]} bg-blue-600 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-white font-bold text-sm">QB</span>
      </div>
    );
  }

  // Full logo variant
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${sizeClasses[size]} bg-blue-600 rounded-lg flex items-center justify-center`} style={{ width: '32px', height: '32px' }}>
        <span className="text-white font-bold text-sm">QB</span>
      </div>
      <span className={`font-bold text-blue-600 ${textSizeClasses[size]}`}>
        QuoteBid
      </span>
    </div>
  );
} 