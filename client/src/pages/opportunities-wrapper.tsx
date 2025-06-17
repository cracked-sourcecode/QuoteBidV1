import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/use-theme';
import LightOpportunities from './light/opportunities';
import DarkOpportunities from './dark/opportunities';
import LightNavbar from '@/components/light/navbar';
import DarkNavbar from '@/components/dark/navbar';
import { Loader2 } from 'lucide-react';

export default function OpportunitiesWrapper() {
  const { theme } = useTheme();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Brief initialization period to ensure smooth theme application
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading screen with theme-appropriate colors during initialization
  if (isInitializing) {
    return (
      <div className={`flex justify-center items-center min-h-screen transition-colors duration-150 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex flex-col items-center">
          <Loader2 className={`h-8 w-8 animate-spin mb-3 transition-colors duration-150 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
          <p className={`text-sm transition-colors duration-150 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Loading opportunities...</p>
        </div>
      </div>
    );
  }
  
  // Conditionally render based on theme
  if (theme === 'dark') {
    return (
      <>
        <DarkNavbar />
        <DarkOpportunities />
      </>
    );
  }
  
  return (
    <>
      <LightNavbar />
      <LightOpportunities />
    </>
  );
} 