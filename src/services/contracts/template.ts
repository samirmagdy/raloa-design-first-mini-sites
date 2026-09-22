import type { Id, LocalizedText } from './common';
import type { BlockConfig, BlockType } from './block';
import type { ThemeConfig } from './theme';

export type TemplateCategory = 'Portfolio' | 'Creator' | 'Business' | 'Music' | 'Personal' | 'Store';

export interface TemplateBlockSeed {
  type: BlockType;
  title?: LocalizedText;
  subtitle?: LocalizedText;
  content?: LocalizedText;
  url?: string;
  config?: BlockConfig;
  children?: TemplateBlockSeed[];
}

export interface TemplatePageSeed {
  title: LocalizedText;
  slug: string;
  blocks: TemplateBlockSeed[];
}

export interface Template {
  id: Id;
  name: LocalizedText;
  tagline: LocalizedText;
  category: TemplateCategory;
  tags: string[];
  /** Which profiles a template is presented as fitting; drives the onboarding picker. */
  audience: LocalizedText[];
  theme: ThemeConfig;
  pages: TemplatePageSeed[];
  previewImage: string;
  isFeatured: boolean;
}

/** What `templates.apply` reports back so the UI can promise the right thing about their data. */
export interface TemplateApplyResult {
  profileId: Id;
  replacedPages: number;
  replacedBlocks: number;
  preservedFields: Array<'identity' | 'socials' | 'seo' | 'media'>;
}
