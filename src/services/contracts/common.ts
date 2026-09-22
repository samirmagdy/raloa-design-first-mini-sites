import type { Locale } from '../../types';

export type Id = string;

export type IsoDateTime = string;

export interface Versioned {
  version: number;
}

export interface Timestamped {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * D1 in docs/backend-plan.md: locale-keyed text so a third language is a registry change
 * instead of a new `*Ar` column on every field. A bare string means "same in every locale".
 */
export interface LocalizedString {
  en?: string;
  ar?: string;
}

export type LocalizedText = string | LocalizedString;

export const localize = (text: LocalizedText, locale: Locale): string => {
  if (typeof text === 'string') return text;
  return text[locale] ?? text.en ?? '';
};

export const nowIso = (): IsoDateTime => new Date().toISOString();

export const uid = (prefix: string): Id =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
