import { useTheme } from '@/hooks/use-theme';
import LightSavedOpportunities from './light/saved-opportunities';
import DarkSavedOpportunities from './dark/saved-opportunities';
import LightNavbar from '@/components/light/navbar';
import DarkNavbar from '@/components/dark/navbar';

export default function SavedOpportunitiesWrapper() {
  const { theme } = useTheme();
  
  // Conditionally render based on theme
  if (theme === 'dark') {
    return (
      <>
        <DarkNavbar />
        <DarkSavedOpportunities />
      </>
    );
  }
  
  return (
    <>
      <LightNavbar />
      <LightSavedOpportunities />
    </>
  );
} 