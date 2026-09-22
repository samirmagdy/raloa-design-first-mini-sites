import type { Id, IsoDateTime, LocalizedText, Timestamped, Versioned } from './common';
import type { ThemeConfig } from './theme';

export interface ProfileSocial {
  id: Id;
  platform: string;
  url: string;
  label?: LocalizedText;
  enabled: boolean;
}

export interface ProfileSeo {
  title?: LocalizedText;
  description?: LocalizedText;
  ogImageMediaId?: Id;
  ogImageUrl?: string;
  indexable: boolean;
}

export type PlanId = 'free' | 'creator' | 'business';

export interface ProfileUsage {
  plan: PlanId;
  profilesUsed: number;
  profileLimit: number;
  pagesUsed: number;
  pageLimit: number;
  blocksUsed: number;
  blockLimit: number;
  monthlyVisits: number;
  visitLimit: number;
}

/** D1: `roleAr` / `bioAr` column-suffixes collapse into locale-keyed fields. */
export interface PublicProfile extends Versioned, Timestamped {
  id: Id;
  ownerId: Id;
  username: string;
  displayName: string;
  role: LocalizedText;
  bio: LocalizedText;
  avatarUrl: string;
  avatarMediaId?: Id;
  verified: boolean;
  published: boolean;
  theme: ThemeConfig;
  seo: ProfileSeo;
  socials: ProfileSocial[];
}

export type UsernameAvailability = 'available' | 'taken' | 'reserved' | 'invalid';

export interface ProfileSummary {
  id: Id;
  username: string;
  displayName: string;
  role: LocalizedText;
  avatarUrl: string;
  published: boolean;
  verified: boolean;
  pageId: Id;
  pageTitle: LocalizedText;
  visibleBlocks: number;
  updatedAt: IsoDateTime;
}
