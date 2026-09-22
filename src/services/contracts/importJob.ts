import type { Id, IsoDateTime, LocalizedText } from './common';
import type { BlockType } from './block';

export type ImportSource = 'linktree' | 'urlswerv' | 'raloa-json';

export type ImportJobStatus = 'idle' | 'validating' | 'fetching' | 'parsing' | 'ready' | 'failed' | 'committed';

export type ImportProgress = 0 | 25 | 50 | 75 | 100;

export interface ImportItem {
  id: Id;
  kind: 'page' | 'block';
  type?: BlockType;
  title: LocalizedText;
  subtitle?: LocalizedText;
  url?: string;
  /** Set when the target profile already has a block with the same URL. */
  duplicateOf?: Id;
  selected: boolean;
}

export interface ImportPreview {
  jobId: Id;
  source: ImportSource;
  handle: string;
  sourceUrl: string;
  items: ImportItem[];
  warnings: LocalizedText[];
}

export interface ImportJob {
  id: Id;
  source: ImportSource;
  input: string;
  status: ImportJobStatus;
  progress: ImportProgress;
  preview?: ImportPreview;
  error?: string;
  createdAt: IsoDateTime;
  committedAt?: IsoDateTime;
}

export interface ImportCommitResult {
  jobId: Id;
  createdPages: number;
  createdBlocks: number;
  skippedDuplicates: number;
}
