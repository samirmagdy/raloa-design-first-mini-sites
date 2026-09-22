import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { cloneTheme, getThemePreset, themeToCssVariables } from './themeRegistry';
import { ThemeConfig } from '../services/repository';

interface ThemeContextValue {
  theme: ThemeConfig;
  savedTheme: ThemeConfig;
  updateTheme: (patch: Partial<ThemeConfig>) => void;
  selectPreset: (id: string) => void;
  saveTheme: () => void;
  resetTheme: () => void;
  setBackgroundMedia: (type: 'image' | 'video', url?: string) => void;
  setCustomCss: (css: string) => void;
  customCssWarning: string | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const MAX_CUSTOM_CSS_LENGTH = 4000;

const validateCustomCss = (css: string): string | null => {
  if (css.length > MAX_CUSTOM_CSS_LENGTH) return `Custom CSS is limited to ${MAX_CUSTOM_CSS_LENGTH} characters.`;
  if (/<\/?style|javascript:|expression\s*\(|@import/i.test(css)) return 'This CSS contains an unsupported or unsafe rule.';
  return null;
};

export const ThemeProvider: React.FC<{ initialTheme?: ThemeConfig; storageKey?: string; children: React.ReactNode }> = ({
  initialTheme,
  storageKey,
  children
}) => {
  const fallback = initialTheme ?? getThemePreset('raloa-light');
  const [savedTheme, setSavedTheme] = useState(() => cloneTheme(fallback));
  const [theme, setTheme] = useState(() => cloneTheme(fallback));

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as ThemeConfig;
      setSavedTheme(parsed);
      setTheme(cloneTheme(parsed));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const customCssWarning = validateCustomCss(theme.customCss ?? '');
  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    savedTheme,
    updateTheme: (patch) => setTheme((current) => ({ ...current, ...patch })),
    selectPreset: (id) => setTheme(cloneTheme(getThemePreset(id))),
    saveTheme: () => {
      const next = cloneTheme(theme);
      setSavedTheme(next);
      if (storageKey && typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(next));
    },
    resetTheme: () => setTheme(cloneTheme(savedTheme)),
    setBackgroundMedia: (type, url) => setTheme((current) => ({ ...current, [type === 'image' ? 'backgroundImage' : 'backgroundVideo']: url })),
    setCustomCss: (css) => setTheme((current) => ({ ...current, customCss: css.slice(0, MAX_CUSTOM_CSS_LENGTH) })),
    customCssWarning
  }), [customCssWarning, savedTheme, storageKey, theme]);

  return (
    <ThemeContext.Provider value={value}>
      <div style={themeToCssVariables(theme)}>
        {theme.customCss && !customCssWarning && <style data-raloa-custom-theme="true">{theme.customCss}</style>}
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
};
