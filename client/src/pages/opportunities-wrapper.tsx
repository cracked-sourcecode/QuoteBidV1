import { useTheme } from '@/hooks/use-theme';
import LightOpportunities from './light/opportunities';
import DarkOpportunities from './dark/opportunities';
import LightNavbar from '@/components/light/navbar';
import DarkNavbar from '@/components/dark/navbar';

export default function OpportunitiesWrapper() {
  const { theme } = useTheme();
  
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