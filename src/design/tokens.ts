/**
 * JS-side mirror of the `@theme` block in src/index.css. CSS owns the utility classes; this file
 * owns the numbers JavaScript needs (device frames, chart series, canvas exports) so a value never
 * exists twice with different spellings.
 */
export const designTokens = {
  colors: {
    ink: '#0F172A',
    muted: '#64748B',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    line: '#E2E8F0',
    accent: '#5B5CF6',
    accentSoft: '#EEF0FE',
    success: '#059669',
    warning: '#B45309',
    danger: '#E11D48'
  },
  radii: {
    control: '0.75rem',
    card: '1rem',
    panel: '1.5rem',
    pill: '9999px'
  },
  shadows: {
    card: '0 8px 24px rgba(15, 23, 42, 0.06)',
    raised: '0 20px 48px rgba(15, 23, 42, 0.14)'
  },
  spacing: {
    base: 4,
    stack: 20,
    gutter: 24
  },
  type: {
    body: '0.9375rem',
    title: '1.5rem',
    display: 'clamp(2.5rem, 6vw, 4.5rem)'
  },
  touchTarget: 44,
  breakpoints: {
    xs: 320,
    mobile: 375,
    largeMobile: 414,
    tablet: 768,
    laptop: 1024,
    desktop: 1280,
    wide: 1440,
    ultrawide: 1920
  }
} as const;

export type DeviceKey = 'mobile' | 'tablet' | 'desktop';

export interface DeviceFrame {
  key: DeviceKey;
  label: { en: string; ar: string };
  width: number;
  height: number;
  /** Chrome around the viewport: bezel radius and notch behaviour. */
  chrome: 'notch' | 'none';
  scaleOptions: number[];
}

export const deviceFrames: Record<DeviceKey, DeviceFrame> = {
  mobile: {
    key: 'mobile',
    label: { en: 'Phone', ar: 'جوّال' },
    width: 390,
    height: 844,
    chrome: 'notch',
    scaleOptions: [0.6, 0.75, 0.9, 1]
  },
  tablet: {
    key: 'tablet',
    label: { en: 'Tablet', ar: 'لوحي' },
    width: 834,
    height: 1112,
    chrome: 'none',
    scaleOptions: [0.45, 0.6, 0.75, 0.9]
  },
  desktop: {
    key: 'desktop',
    label: { en: 'Desktop', ar: 'سطح مكتب' },
    width: 1280,
    height: 800,
    chrome: 'none',
    scaleOptions: [0.3, 0.4, 0.55, 0.7]
  }
};

/** Shared by the analytics bars and the QR/export canvases. */
export const chartPalette = [designTokens.colors.accent, '#8B5CF6', '#0EA5E9', designTokens.colors.success, '#F59E0B'];

export const CONTRAST_MINIMUM = { body: 4.5, large: 3 } as const;

const parseHex = (hex: string): [number, number, number] | null => {
  const value = hex.trim().replace('#', '');
  const expanded = value.length === 3 ? value.split('').map((character) => character + character).join('') : value;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;
  return [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16)) as [number, number, number];
};

const channel = (value: number): number => {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (hex: string): number => {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [red, green, blue] = rgb.map(channel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/** Used by the theme editor to warn before a creator ships unreadable contrast (Phase 22). */
export const contrastRatio = (foreground: string, background: string): number => {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};
