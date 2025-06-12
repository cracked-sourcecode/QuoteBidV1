import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with light theme (current default)
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first, default to light
    const saved = localStorage.getItem('quotebid-theme');
    return (saved as Theme) || 'light';
  });

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('quotebid-theme', theme);
    
    // Add theme class to document root for future CSS targeting
    document.documentElement.setAttribute('data-theme', theme);
    
    // For now, we preserve the current light theme styling
    // Dark theme implementation will come later
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 