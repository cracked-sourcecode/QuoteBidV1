import { useTheme } from '@/hooks/use-theme';
import LightOpportunityDetail from './light/opportunity-detail';
import DarkOpportunityDetail from './dark/opportunity-detail';
import LightNavbar from '@/components/light/navbar';
import DarkNavbar from '@/components/dark/navbar';

export default function OpportunityDetailWrapper() {
  const { theme } = useTheme();
  
  // Conditionally render based on theme
  if (theme === 'dark') {
    return (
      <>
        <DarkNavbar />
        <DarkOpportunityDetail />
      </>
    );
  }
  
  return (
    <>
      <LightNavbar />
      <LightOpportunityDetail />
    </>
  );
} 