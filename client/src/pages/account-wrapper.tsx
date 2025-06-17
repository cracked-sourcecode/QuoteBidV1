import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/use-theme';
import LightAccount from './light/account';
import DarkAccount from './dark/account';
import LightNavbar from '@/components/light/navbar';
import DarkNavbar from '@/components/dark/navbar';
import { Loader2 } from 'lucide-react';

export default function AccountWrapper() {
  const { theme } = useTheme();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Shorter initialization since theme provider is optimized
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading screen with theme-appropriate colors during initialization
  if (isInitializing) {
    return (
      <div className={`flex justify-center items-center min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex flex-col items-center">
          <Loader2 className={`h-8 w-8 animate-spin mb-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Loading account...</p>
        </div>
      </div>
    );
  }
  
  // Conditionally render based on theme
  if (theme === 'dark') {
    return (
      <>
        <DarkNavbar />
        <DarkAccount />
      </>
    );
  }
  
  return (
    <>
      <LightNavbar />
      <LightAccount />
    </>
  );
} 