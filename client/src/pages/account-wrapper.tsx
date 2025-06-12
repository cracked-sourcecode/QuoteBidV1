import { useTheme } from '@/hooks/use-theme';
import LightAccount from './light/account';
import DarkAccount from './dark/account';
import LightNavbar from '@/components/light/navbar';
import DarkNavbar from '@/components/dark/navbar';

export default function AccountWrapper() {
  const { theme } = useTheme();
  
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