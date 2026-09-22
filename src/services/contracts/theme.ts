export type ThemeRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export type ThemeShadow = 'none' | 'soft' | 'strong';

export interface ThemeOverlay {
  opacity: number;
  blur: number;
}

export interface ThemeConfig {
  id: string;
  background: string;
  card: string;
  text: string;
  mutedText: string;
  accent: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  overlay?: ThemeOverlay;
  customCss?: string;
  branding?: { showLogo: boolean; showFooter: boolean };
  button: {
    radius: ThemeRadius;
    variant: 'solid' | 'outline' | 'soft';
    shadow: ThemeShadow;
  };
  cardStyle?: {
    radius: ThemeRadius;
    border: 'none' | 'soft' | 'strong';
    shadow: ThemeShadow;
  };
  typography: {
    family: string;
    weight: number;
    scale: 'compact' | 'comfortable' | 'large';
  };
}

export const RADIUS_PX: Record<ThemeRadius, string> = {
  none: '0px',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1.25rem',
  full: '9999px'
};
