import { useTheme } from '@/hooks/use-theme';
import LightMyPitches from './light/my-pitches';
import DarkMyPitches from './dark/my-pitches';
import LightNavbar from '@/components/light/navbar';
import DarkNavbar from '@/components/dark/navbar';

export default function MyPitchesWrapper() {
  const { theme } = useTheme();
  
  // Conditionally render based on theme
  if (theme === 'dark') {
    return (
      <>
        <DarkNavbar />
        <DarkMyPitches />
      </>
    );
  }
  
  return (
    <>
      <LightNavbar />
      <LightMyPitches />
    </>
  );
} 