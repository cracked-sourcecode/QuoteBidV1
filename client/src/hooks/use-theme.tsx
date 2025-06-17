import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/apiFetch';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  refreshThemeFromDatabase: () => Promise<void>;
  isInitialized: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('quotebid-theme');
    return (saved === 'light' ? 'light' : 'dark') as Theme;
  });
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper function to get user ID from localStorage
  const getUserId = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch (error) {
      return null;
    }
  }, []);

  // Function to fetch theme from database
  const fetchThemeFromDatabase = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return null;

    try {
      const response = await apiFetch(`/api/users/${userId}/preferences`);
      const preferences = await response.json();
      return preferences.theme || 'light';
    } catch (error) {
      return null;
    }
  }, [getUserId]);

  // Apply theme to document immediately (synchronous)
  const applyThemeToDocument = useCallback((newTheme: Theme) => {
    // Apply with smooth transition
    document.documentElement.style.transition = 'background-color 150ms ease-in-out, color 150ms ease-in-out';
    document.documentElement.setAttribute('data-theme', newTheme);
    
    const bgColor = newTheme === 'light' ? '#ffffff' : '#0f172a';
    const textColor = newTheme === 'light' ? '#374151' : '#e2e8f0';
    
    document.documentElement.style.setProperty('background-color', bgColor, 'important');
    document.documentElement.style.setProperty('color', textColor, 'important');
    
    if (document.body) {
      document.body.style.setProperty('background-color', bgColor, 'important');
      document.body.style.setProperty('color', textColor, 'important');
    }
    
    // Remove transition after a brief moment to prevent interference
    setTimeout(() => {
      document.documentElement.style.transition = '';
    }, 200);
  }, []);

  // Public method to refresh theme from database
  const refreshThemeFromDatabase = useCallback(async () => {
    const dbTheme = await fetchThemeFromDatabase();
    if (dbTheme && dbTheme !== theme) {
      setThemeState(dbTheme);
      localStorage.setItem('quotebid-theme', dbTheme);
      applyThemeToDocument(dbTheme);
    }
  }, [fetchThemeFromDatabase, theme, applyThemeToDocument]);

  // Update theme and sync to database
  const updateTheme = useCallback(async (newTheme: Theme) => {
    // Apply immediately for responsive feel
    setThemeState(newTheme);
    localStorage.setItem('quotebid-theme', newTheme);
    applyThemeToDocument(newTheme);
    
    // Save to database in background (non-blocking)
    const userId = getUserId();
    if (userId) {
      try {
        await apiFetch(`/api/users/${userId}/preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: newTheme,
            notifications: true,
            language: 'en'
          }),
        });
      } catch (error) {
        // Silent fail - don't disrupt user experience
        console.warn('Failed to save theme to database:', error);
      }
    }
  }, [getUserId, applyThemeToDocument]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    updateTheme(newTheme);
  }, [theme, updateTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    updateTheme(newTheme);
  }, [updateTheme]);

  // Single initialization effect
  useEffect(() => {
    // Apply initial theme immediately
    applyThemeToDocument(theme);
    
    // Set up login listener for theme sync
    const handleUserLoggedIn = () => {
      setTimeout(() => {
        refreshThemeFromDatabase();
      }, 300);
    };

    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    
    // Mark as initialized after a brief moment
    const initTimer = setTimeout(() => {
      setIsInitialized(true);
    }, 150);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
      clearTimeout(initTimer);
    };
  }, []); // Only run once on mount

  // Apply theme changes immediately when theme state changes
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme, applyThemeToDocument]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme, 
      refreshThemeFromDatabase, 
      isInitialized 
    }}>
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