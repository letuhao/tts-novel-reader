/**
 * Dark Mode Hook
 * Manages dark mode state and persistence
 */
import { useState, useEffect } from 'react';

export function useDarkMode(): [boolean, (enabled: boolean) => void] {
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      return stored === 'true';
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const setDarkMode = (enabled: boolean): void => {
    setDarkModeState(enabled);
  };

  return [darkMode, setDarkMode];
}

