import type { CSSProperties } from 'react';
import { RADIUS_PX, type ThemeConfig } from '../services/contracts/theme';

const baseTheme = (
  theme: Omit<ThemeConfig, 'button' | 'typography' | 'cardStyle'> &
    Partial<Pick<ThemeConfig, 'button' | 'typography' | 'cardStyle'>>
): ThemeConfig => ({
  button: { radius: 'full', variant: 'solid', shadow: 'soft' },
  cardStyle: { radius: 'lg', border: 'soft', shadow: 'soft' },
  typography: { family: 'Inter', weight: 600, scale: 'comfortable' },
  ...theme
});

export const themePresets: ThemeConfig[] = [
  baseTheme({ id: 'raloa-light', background: '#F8FAFC', card: '#FFFFFF', text: '#0F172A', mutedText: '#64748B', accent: '#5B5CF6' }),
  baseTheme({ id: 'midnight', background: '#0F172A', card: '#172033', text: '#F8FAFC', mutedText: '#CBD5E1', accent: '#818CF8', button: { radius: 'full', variant: 'solid', shadow: 'strong' } }),
  baseTheme({ id: 'paper', background: '#F7F3EC', card: '#FFFCF7', text: '#292524', mutedText: '#78716C', accent: '#C2410C', button: { radius: 'md', variant: 'outline', shadow: 'soft' }, cardStyle: { radius: 'none', border: 'strong', shadow: 'none' }, typography: { family: 'Georgia', weight: 600, scale: 'comfortable' } }),
  baseTheme({ id: 'ocean', background: '#ECFEFF', card: '#FFFFFF', text: '#164E63', mutedText: '#0E7490', accent: '#0891B2' }),
  baseTheme({ id: 'meadow', background: '#F0FDF4', card: '#FFFFFF', text: '#14532D', mutedText: '#4D7C0F', accent: '#16A34A', button: { radius: 'md', variant: 'solid', shadow: 'soft' } }),
  baseTheme({ id: 'rose', background: '#FFF1F2', card: '#FFFFFF', text: '#4C0519', mutedText: '#9F1239', accent: '#E11D48' }),
  baseTheme({ id: 'lavender', background: '#FAF5FF', card: '#FFFFFF', text: '#2E1065', mutedText: '#7E22CE', accent: '#9333EA' }),
  baseTheme({ id: 'sand', background: '#FFFBEB', card: '#FFFFFF', text: '#451A03', mutedText: '#92400E', accent: '#D97706', button: { radius: 'sm', variant: 'solid', shadow: 'soft' } }),
  baseTheme({ id: 'graphite', background: '#27272A', card: '#3F3F46', text: '#FAFAFA', mutedText: '#D4D4D8', accent: '#A1A1AA', button: { radius: 'sm', variant: 'outline', shadow: 'none' } }),
  baseTheme({ id: 'skyline', background: '#EFF6FF', card: '#FFFFFF', text: '#172554', mutedText: '#475569', accent: '#2563EB' }),
  baseTheme({ id: 'mono', background: '#FFFFFF', card: '#FAFAFA', text: '#09090B', mutedText: '#52525B', accent: '#18181B', button: { radius: 'sm', variant: 'solid', shadow: 'none' }, cardStyle: { radius: 'none', border: 'soft', shadow: 'none' }, typography: { family: 'Inter', weight: 700, scale: 'compact' } })
];

export const getThemePreset = (id: string): ThemeConfig => themePresets.find((theme) => theme.id === id) ?? themePresets[0];

export const cloneTheme = (theme: ThemeConfig): ThemeConfig =>
  typeof structuredClone === 'function' ? structuredClone(theme) : (JSON.parse(JSON.stringify(theme)) as ThemeConfig);

const SHADOWS: Record<string, string> = {
  none: 'none',
  soft: '0 8px 24px rgba(15, 23, 42, 0.06)',
  strong: '0 20px 48px rgba(15, 23, 42, 0.18)'
};

const TYPE_SCALE: Record<string, { body: string; title: string; ratio: string }> = {
  compact: { body: '0.8125rem', title: '1.375rem', ratio: '1.05' },
  comfortable: { body: '0.9375rem', title: '1.5rem', ratio: '1.15' },
  large: { body: '1.0625rem', title: '1.75rem', ratio: '1.25' }
};

/** The renderer reads only these variables, so a theme change repaints without a reload. */
export const themeToCssVariables = (theme: ThemeConfig): CSSProperties => {
  const scale = TYPE_SCALE[theme.typography.scale] ?? TYPE_SCALE.comfortable;
  return {
    '--profile-background': theme.background,
    '--profile-card': theme.card,
    '--profile-text': theme.text,
    '--profile-muted': theme.mutedText,
    '--profile-accent': theme.accent,
    '--profile-radius': RADIUS_PX[theme.button.radius],
    '--profile-card-radius': RADIUS_PX[theme.cardStyle?.radius ?? 'lg'],
    '--profile-card-border': theme.cardStyle?.border === 'none' ? '0px' : theme.cardStyle?.border === 'strong' ? '1.5px' : '1px',
    '--profile-card-shadow': SHADOWS[theme.cardStyle?.shadow ?? 'soft'],
    '--profile-button-shadow': SHADOWS[theme.button.shadow],
    '--profile-button-padding': theme.button.variant === 'solid' ? '0.95rem' : '0.9rem',
    '--profile-body': scale.body,
    '--profile-title': scale.title,
    '--profile-line-height': scale.ratio,
    '--profile-font': `${theme.typography.family}, Inter, ui-sans-serif, system-ui, sans-serif`,
    '--profile-weight': String(theme.typography.weight)
  } as CSSProperties;
};
