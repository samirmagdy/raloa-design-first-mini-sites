import type { CSSProperties } from 'react';
import { ThemeConfig } from '../services/repository';

const baseTheme = (theme: Omit<ThemeConfig, 'button' | 'typography'> & Partial<Pick<ThemeConfig, 'button' | 'typography'>>): ThemeConfig => ({
  button: { radius: 'full', variant: 'solid', shadow: 'soft' },
  typography: { family: 'Inter', weight: 600, scale: 'comfortable' },
  ...theme
});

export const themePresets: ThemeConfig[] = [
  baseTheme({ id: 'raloa-light', background: '#F8FAFC', card: '#FFFFFF', text: '#0F172A', mutedText: '#64748B', accent: '#5B5CF6' }),
  baseTheme({ id: 'midnight', background: '#0F172A', card: '#172033', text: '#F8FAFC', mutedText: '#CBD5E1', accent: '#818CF8', button: { radius: 'full', variant: 'solid', shadow: 'strong' } }),
  baseTheme({ id: 'paper', background: '#F7F3EC', card: '#FFFCF7', text: '#292524', mutedText: '#78716C', accent: '#C2410C', button: { radius: 'md', variant: 'outline', shadow: 'soft' }, typography: { family: 'Georgia', weight: 600, scale: 'comfortable' } }),
  baseTheme({ id: 'ocean', background: '#ECFEFF', card: '#FFFFFF', text: '#164E63', mutedText: '#0E7490', accent: '#0891B2' }),
  baseTheme({ id: 'meadow', background: '#F0FDF4', card: '#FFFFFF', text: '#14532D', mutedText: '#4D7C0F', accent: '#16A34A', button: { radius: 'md', variant: 'solid', shadow: 'soft' } }),
  baseTheme({ id: 'rose', background: '#FFF1F2', card: '#FFFFFF', text: '#4C0519', mutedText: '#9F1239', accent: '#E11D48' }),
  baseTheme({ id: 'lavender', background: '#FAF5FF', card: '#FFFFFF', text: '#2E1065', mutedText: '#7E22CE', accent: '#9333EA' }),
  baseTheme({ id: 'sand', background: '#FFFBEB', card: '#FFFFFF', text: '#451A03', mutedText: '#92400E', accent: '#D97706', button: { radius: 'sm', variant: 'solid', shadow: 'soft' } }),
  baseTheme({ id: 'graphite', background: '#27272A', card: '#3F3F46', text: '#FAFAFA', mutedText: '#D4D4D8', accent: '#A1A1AA', button: { radius: 'sm', variant: 'outline', shadow: 'none' } }),
  baseTheme({ id: 'skyline', background: '#EFF6FF', card: '#FFFFFF', text: '#172554', mutedText: '#475569', accent: '#2563EB' }),
  baseTheme({ id: 'mono', background: '#FFFFFF', card: '#FAFAFA', text: '#09090B', mutedText: '#52525B', accent: '#18181B', button: { radius: 'sm', variant: 'solid', shadow: 'none' }, typography: { family: 'Inter', weight: 700, scale: 'compact' } })
];

export const getThemePreset = (id: string) => themePresets.find((theme) => theme.id === id) ?? themePresets[0];

export const cloneTheme = (theme: ThemeConfig): ThemeConfig => JSON.parse(JSON.stringify(theme)) as ThemeConfig;

export const themeToCssVariables = (theme: ThemeConfig): CSSProperties => ({
  '--profile-background': theme.background,
  '--profile-card': theme.card,
  '--profile-text': theme.text,
  '--profile-muted': theme.mutedText,
  '--profile-accent': theme.accent,
  '--profile-radius': theme.button.radius === 'none' ? '0px' : theme.button.radius === 'sm' ? '0.75rem' : theme.button.radius === 'md' ? '1rem' : '9999px'
} as CSSProperties);
