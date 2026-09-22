import type { Id, IsoDateTime, LocalizedText, Versioned } from './common';

/**
 * D2/D3 in docs/backend-plan.md. `hidden`, `scheduled`, `highlighted`, `badge` and `icon` used to
 * be members of this union, which made a hidden link unrepresentable. They are block *state* now;
 * this union only answers "what is this block".
 */
export type BlockType =
  | 'link'
  | 'section'
  | 'folder'
  | 'rich-text'
  | 'spacer'
  | 'image'
  | 'gallery'
  | 'carousel'
  | 'audio'
  | 'mp3'
  | 'video'
  | 'direct-video'
  | 'youtube'
  | 'vimeo'
  | 'tiktok'
  | 'spotify'
  | 'apple-music'
  | 'soundcloud'
  | 'newsletter'
  | 'contact-form'
  | 'faq'
  | 'testimonial'
  | 'product'
  | 'event'
  | 'map'
  | 'location'
  | 'phone'
  | 'email'
  | 'calendly'
  | 'file-download'
  | 'music-pre-save'
  | 'instagram-grid'
  | 'password-gate';

export type BlockConfigValue = string | number | boolean | string[];

export type BlockConfig = Record<string, BlockConfigValue>;

/** D1: block text is locale-keyed like profile text is. */
export interface ProfileBlock extends Versioned {
  id: Id;
  pageId: Id;
  /** Set for blocks nested inside a `folder`; position is scoped to the parent. */
  parentId: Id | null;
  type: BlockType;
  title?: LocalizedText;
  subtitle?: LocalizedText;
  content?: LocalizedText;
  url?: string;
  /** Validated against the block registry, both in the editor and server-side. */
  config: BlockConfig;
  position: number;
  visible: boolean;
  schedule?: { startsAt?: IsoDateTime; endsAt?: IsoDateTime };
  emphasis?: 'none' | 'highlight';
  badge?: { label?: LocalizedText; icon?: string };
  /** Hydrated by the repository for folder children; the wire format uses `parentId`. */
  children?: ProfileBlock[];
}

/** Legacy shapes still present in localStorage under older keys. */
export interface LegacyProfileBlock {
  id: string;
  type: BlockType | 'hidden' | 'scheduled' | 'highlighted' | 'badge' | 'icon';
  title?: LocalizedText;
  subtitle?: LocalizedText;
  url?: string;
  content?: LocalizedText;
  data?: BlockConfig;
  visible?: boolean;
  children?: LegacyProfileBlock[];
}

export interface ScheduleWindow {
  startsAt?: IsoDateTime;
  endsAt?: IsoDateTime;
}

export const isBlockInWindow = (schedule: ScheduleWindow | undefined, at: number = Date.now()): boolean => {
  if (!schedule) return true;
  if (schedule.startsAt && at < Date.parse(schedule.startsAt)) return false;
  if (schedule.endsAt && at > Date.parse(schedule.endsAt)) return false;
  return true;
};
