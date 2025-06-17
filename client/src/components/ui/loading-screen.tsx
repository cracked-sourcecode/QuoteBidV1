import { Loader2 } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

interface LoadingScreenProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingScreen({ 
  message = "Loading...", 
  size = 'md',
  className = ""
}: LoadingScreenProps) {
  const { theme } = useTheme();
  
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-10 w-10'
  };
  
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`
      flex items-center justify-center min-h-[60vh] w-full
      transition-colors duration-150
      ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}
      ${className}
    `}>
      <div className="flex flex-col items-center space-y-4">
        <Loader2 
          className={`
            ${sizeClasses[size]} animate-spin
            ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}
          `} 
        />
        <p className={`
          ${textSizeClasses[size]} font-medium transition-colors duration-150
          ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}
        `}>
          {message}
        </p>
      </div>
    </div>
  );
}

// Full-screen loading variant for pages
export function FullScreenLoading({ 
  message = "Loading...", 
  size = 'lg' 
}: LoadingScreenProps) {
  const { theme } = useTheme();
  
  return (
    <div className={`
      fixed inset-0 flex items-center justify-center z-50
      transition-colors duration-150
      ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}
    `}>
      <LoadingScreen message={message} size={size} />
    </div>
  );
}

// Compact loading for components
export function CompactLoading({ 
  message = "Loading...", 
  size = 'sm' 
}: LoadingScreenProps) {
  const { theme } = useTheme();
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5', 
    lg: 'h-6 w-6'
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 
        className={`
          ${sizeClasses[size]} animate-spin
          ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}
        `}
      />
      <span className={`
        text-sm transition-colors duration-150
        ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}
      `}>
        {message}
      </span>
    </div>
  );
} 