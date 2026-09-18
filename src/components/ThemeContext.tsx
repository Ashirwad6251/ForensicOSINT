import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ThemeKey = 'tactical' | 'matrix' | 'cyberpunk' | 'light';

type ThemeMeta = {
  key: ThemeKey;
  label: string;
  description: string;
  swatch: string[];
};

export const themeList: ThemeMeta[] = [
  { key: 'tactical', label: 'Tactical Dark', description: 'Slate + Cyan', swatch: ['#0f172a', '#22d3ee', '#10b981'] },
  { key: 'matrix', label: 'Matrix Green', description: 'Black + Neon Green', swatch: ['#000000', '#00ff41', '#0d0d0d'] },
  { key: 'cyberpunk', label: 'Cyberpunk Alert', description: 'Violet + Magenta', swatch: ['#1a0a2e', '#ff00ff', '#ffaa00'] },
  { key: 'light', label: 'Light Evidence', description: 'White + Blue', swatch: ['#f8fafc', '#0891b2', '#059669'] },
];

type ThemeContextValue = {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'forensicosint-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>('tactical');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
    if (saved && themeList.some((t) => t.key === saved)) {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: ThemeKey) => setThemeState(t);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
