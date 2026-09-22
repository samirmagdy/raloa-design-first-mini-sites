import type { Id, LocalizedText, Timestamped, Versioned } from './common';
import type { ProfileBlock } from './block';

export type PageVisibility = 'public' | 'draft' | 'unlisted';

export interface ProfilePage extends Versioned, Timestamped {
  id: Id;
  profileId: Id;
  title: LocalizedText;
  /** Unique within a profile; `''` is not allowed and `'@'`-unsafe characters are rejected. */
  slug: string;
  description: LocalizedText;
  published: boolean;
  visibility: PageVisibility;
  position: number;
  /**
   * Hydrated on read so screens can render a page in one call. Writes go through
   * `repository.blocks.*` (D4), never by saving a whole document.
   */
  blocks: ProfileBlock[];
}

export interface PageDraft {
  title: LocalizedText;
  slug: string;
  description: LocalizedText;
  visibility: PageVisibility;
}
