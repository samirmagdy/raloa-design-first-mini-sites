import type { AnalyticsEvent } from '../contracts/analytics';
import type { ApiKey } from '../contracts/apiKey';
import type { ProfileBlock } from '../contracts/block';
import type { CustomDomain } from '../contracts/domain';
import type { FormDefinition, FormSubmission } from '../contracts/form';
import type { ImportJob } from '../contracts/importJob';
import type { Integration } from '../contracts/integration';
import type { MediaAsset } from '../contracts/media';
import type { ProfilePage } from '../contracts/page';
import type { PublicProfile } from '../contracts/profile';
import type { Subscriber } from '../contracts/subscriber';
import type { Session } from '../contracts/auth';

export type PageRecord = Omit<ProfilePage, 'blocks'>;

/**
 * Collection-per-aggregate mirrors the Postgres layout the backend plan describes, so the mock
 * cache and the server cache hold the same things. `raloa.mock.repository.v1` stored one whole
 * document per profile and is migrated on first read.
 */
export interface RaloaDatabase {
  schemaVersion: number;
  session: Session | null;
  profiles: PublicProfile[];
  pages: PageRecord[];
  blocks: ProfileBlock[];
  media: MediaAsset[];
  events: AnalyticsEvent[];
  forms: FormDefinition[];
  submissions: FormSubmission[];
  subscribers: Subscriber[];
  domains: CustomDomain[];
  integrations: Integration[];
  apiKeys: ApiKey[];
  /** Full tokens live outside the record so `create` can be reveal-once. */
  issuedTokens: Record<string, string>;
  importJobs: ImportJob[];
  activeProfileId: string | null;
}

export const DATABASE_KEY = 'raloa.db.v2';
export const LEGACY_REPOSITORY_KEY = 'raloa.mock.repository.v1';
export const NETWORK_KEY = 'raloa.mock.network';
export const SCHEMA_VERSION = 2;

/** Injected failure modes so loading, error and retry states exist before there is a server. */
export type NetworkMode = 'normal' | 'slow' | 'flaky' | 'offline';
