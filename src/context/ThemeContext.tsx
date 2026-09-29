import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'cyber-emerald' | 'lava-orange' | 'electric-cyan' | 'light-slate';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  label: string;
  tagline: string;
  isLight: boolean;
  previewBg: string;
  previewAccent: string;
  accentHex: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  accentGlow: string;
  badgeBg: string;
  headerAccent: string;
  buttonPrimary: string;
  navActive: string;
}

export const THEME_CONFIGS: Record<AppTheme, ThemeConfig> = {
  'cyber-emerald': {
    id: 'cyber-emerald',
    name: 'Cyber Emerald',
    label: 'Esmeralda Neon',
    tagline: 'Alta energia, contraste atlético moderno e foco esportivo.',
    isLight: false,
    previewBg: '#091312',
    previewAccent: '#10b981',
    accentHex: '#10b981',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500',
    accentBorder: 'border-emerald-500/40',
    accentGlow: 'shadow-emerald-500/20',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    headerAccent: 'text-emerald-400',
    buttonPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/20',
    navActive: 'text-emerald-400',
  },
  'lava-orange': {
    id: 'lava-orange',
    name: 'Lava Orange',
    label: 'Laranja Vulcânico',
    tagline: 'Inspiração de pista e corrida sob sol intenso e HIIT vigoroso.',
    isLight: false,
    previewBg: '#180e0a',
    previewAccent: '#f97316',
    accentHex: '#f97316',
    accentText: 'text-orange-400',
    accentBg: 'bg-orange-500',
    accentBorder: 'border-orange-500/40',
    accentGlow: 'shadow-orange-500/20',
    badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    headerAccent: 'text-orange-400',
    buttonPrimary: 'bg-orange-500 hover:bg-orange-400 text-slate-950 font-black shadow-orange-500/20',
    navActive: 'text-orange-400',
  },
  'electric-cyan': {
    id: 'electric-cyan',
    name: 'Electric Cyan',
    label: 'Ciano Elétrico',
    tagline: 'Estilo cockpit futurista, visual de relógio esportivo e ritmo aeróbico.',
    isLight: false,
    previewBg: '#09111b',
    previewAccent: '#06b6d4',
    accentHex: '#06b6d4',
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500',
    accentBorder: 'border-cyan-500/40',
    accentGlow: 'shadow-cyan-500/20',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    headerAccent: 'text-cyan-400',
    buttonPrimary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-cyan-500/20',
    navActive: 'text-cyan-400',
  },
  'light-slate': {
    id: 'light-slate',
    name: 'Light Athletic',
    label: 'Claro / Daylight',
    tagline: 'Modo claro esportivo limpo, ideal para corridas sob luz solar intensa.',
    isLight: true,
    previewBg: '#f8fafc',
    previewAccent: '#059669',
    accentHex: '#059669',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-600',
    accentBorder: 'border-emerald-600/30',
    accentGlow: 'shadow-emerald-600/20',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    headerAccent: 'text-emerald-600',
    buttonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-600/20',
    navActive: 'text-emerald-600',
  },
};

interface ThemeContextValue {
  theme: AppTheme;
  themeConfig: ThemeConfig;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'cyber-emerald',
  themeConfig: THEME_CONFIGS['cyber-emerald'],
  setTheme: () => {},
});

const THEME_STORAGE_KEY = 'ritmo_interval_app_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
      if (saved && THEME_CONFIGS[saved]) {
        return saved;
      }
    }
    return 'cyber-emerald';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const themeConfig = THEME_CONFIGS[theme];

  return (
    <ThemeContext.Provider value={{ theme, themeConfig, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
