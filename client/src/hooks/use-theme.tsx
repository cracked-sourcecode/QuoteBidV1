import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  refreshThemeFromDatabase: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with dark theme from localStorage or default to dark for new users
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('quotebid-theme');
    console.log('🎨 [THEME] Initial theme from localStorage:', saved);
    // Default to dark theme for new users (user_preferences.theme = "dark")
    return (saved === 'light' ? 'light' : 'dark') as Theme;
  });

  // Helper function to get user ID from localStorage
  const getUserId = () => {
    try {
      console.log('🎨 [THEME] Getting user ID from localStorage...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🎨 [THEME] No auth token in localStorage');
        return null;
      }
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🎨 [THEME] Decoded token payload:', payload);
      return payload.id;
    } catch (error) {
      console.log('🎨 [THEME] Error getting user ID:', error);
      return null;
    }
  };

  // Function to fetch theme from database
  const fetchThemeFromDatabase = async () => {
    const userId = getUserId();
    if (!userId) {
      console.log('🎨 [THEME] No user ID, skipping theme fetch');
      return null;
    }

    console.log('🎨 [THEME] Fetching theme from database for user:', userId);
    
    try {
      const response = await apiFetch(`/api/users/${userId}/preferences`);
      const preferences = await response.json();
      console.log('🎨 [THEME] ✅ Fetched preferences from database:', preferences);
      return preferences.theme || 'light';
    } catch (error) {
      console.log('🎨 [THEME] ❌ Failed to fetch theme from database:', error);
      return null;
    }
  };

  // Public method to refresh theme from database (can be called after login)
  const refreshThemeFromDatabase = async () => {
    console.log('🎨 [THEME] ===== REFRESH THEME FROM DATABASE =====');
    const dbTheme = await fetchThemeFromDatabase();
    if (dbTheme && dbTheme !== theme) {
      console.log('🎨 [THEME] Updating theme from database:', theme, '->', dbTheme);
      setThemeState(dbTheme);
      localStorage.setItem('quotebid-theme', dbTheme);
      document.documentElement.setAttribute('data-theme', dbTheme);
    } else {
      console.log('🎨 [THEME] Database theme matches current theme or fetch failed');
    }
  };

  // Load theme from database on mount and when user ID changes
  useEffect(() => {
    console.log('🎨 [THEME] Theme provider mounted, checking for saved theme...');
    
    // Small delay to ensure authentication is complete
    const timer = setTimeout(async () => {
      await refreshThemeFromDatabase();
    }, 100);

    // Listen for user login events to sync theme from database
    const handleUserLoggedIn = async () => {
      console.log('🎨 [THEME] User logged in event received, refreshing theme...');
      // Add a small delay to ensure the token is properly stored
      setTimeout(async () => {
        await refreshThemeFromDatabase();
      }, 200);
    };

    window.addEventListener('userLoggedIn', handleUserLoggedIn);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, []);

  // Update theme and sync to database
  const updateTheme = async (newTheme: Theme) => {
    console.log('🎨 [THEME] ===== UPDATE THEME CALLED =====');
    console.log('🎨 [THEME] updateTheme called with:', newTheme);
    
    console.log('🎨 [THEME] Theme changed to:', newTheme);
    setThemeState(newTheme);
    
    // Update localStorage
    localStorage.setItem('quotebid-theme', newTheme);
    console.log('🎨 [THEME] Updated localStorage');
    
    // Update document data-theme attribute
    document.documentElement.setAttribute('data-theme', newTheme);
    console.log('🎨 [THEME] Updated document data-theme attribute');
    
    // Save to database if user is logged in
    const userId = getUserId();
    if (!userId) {
      console.log('🎨 [THEME] No user ID, skipping database save');
      return;
    }

    console.log('🎨 [THEME] Starting database save for user:', userId);
    console.log('🎨 [THEME] About to make API call to /api/users/' + userId + '/preferences');
    
    try {
      const response = await apiFetch(`/api/users/${userId}/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: newTheme,
          notifications: true,
          language: 'en'
        }),
      });

      const result = await response.json();
      console.log('🎨 [THEME] ✅ Theme saved to database successfully:', result);
      
      // Update local state to match what was actually saved
      if (result.preferences && result.preferences.theme !== newTheme) {
        console.log('🎨 [THEME] Database returned different theme, syncing:', result.preferences.theme);
        setThemeState(result.preferences.theme);
        localStorage.setItem('quotebid-theme', result.preferences.theme);
        document.documentElement.setAttribute('data-theme', result.preferences.theme);
      }
    } catch (error) {
      console.log('🎨 [THEME] ❌ Failed to save theme to database:', error);
    }
  };

  const toggleTheme = () => {
    console.log('🎨 [THEME] ===== TOGGLE THEME CALLED =====');
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('🎨 [THEME] Current theme:', theme);
    console.log('🎨 [THEME] Switching to:', newTheme);
    
    const userId = getUserId();
    console.log('🎨 [THEME] getUserId() returned:', userId);
    
    updateTheme(newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    updateTheme(newTheme);
  };

  // Apply theme to document on every theme change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    console.log('🎨 [THEME] Applied theme to document:', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, refreshThemeFromDatabase }}>
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