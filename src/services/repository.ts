export type RepositoryResult<T> = {
  data: T;
  source: 'fixture' | 'local';
};

export type BlockType =
  | 'link'
  | 'section'
  | 'folder'
  | 'rich-text'
  | 'spacer'
  | 'audio'
  | 'video'
  | 'image'
  | 'gallery'
  | 'carousel'
  | 'newsletter'
  | 'contact-form'
  | 'faq'
  | 'testimonial'
  | 'product'
  | 'event'
  | 'map'
  | 'phone'
  | 'email';

export interface ProfileSocial {
  id: string;
  platform: string;
  url: string;
  enabled: boolean;
}

export interface ProfileBlock {
  id: string;
  type: BlockType;
  title?: string;
  subtitle?: string;
  url?: string;
  content?: string;
  visible: boolean;
  children?: ProfileBlock[];
}

export interface ProfilePage {
  id: string;
  title: string;
  description: string;
  published: boolean;
  blocks: ProfileBlock[];
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
  overlay?: { opacity: number; blur: number };
  customCss?: string;
  branding?: { showLogo: boolean; showFooter: boolean };
  button: {
    radius: 'none' | 'sm' | 'md' | 'full';
    variant: 'solid' | 'outline' | 'soft';
    shadow: 'none' | 'soft' | 'strong';
  };
  typography: {
    family: string;
    weight: number;
    scale: 'compact' | 'comfortable' | 'large';
  };
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  role: string;
  roleAr: string;
  bio: string;
  bioAr: string;
  avatarUrl: string;
  verified: boolean;
  published: boolean;
  theme: ThemeConfig;
  pages: ProfilePage[];
  socials: ProfileSocial[];
}

export interface AnalyticsSnapshot {
  views: number;
  uniqueVisitors: number;
  linkClicks: number;
  timeline: Array<{ date: string; views: number; clicks: number }>;
}

export interface RaloaRepository {
  listProfiles(): Promise<RepositoryResult<PublicProfile[]>>;
  getProfile(username: string): Promise<RepositoryResult<PublicProfile | null>>;
  saveProfile(profile: PublicProfile): Promise<RepositoryResult<PublicProfile>>;
  getAnalytics(username: string): Promise<RepositoryResult<AnalyticsSnapshot>>;
}
