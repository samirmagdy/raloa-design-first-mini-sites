import type { Id, IsoDateTime } from './common';

export type IntegrationKind = 'instagram' | 'ga4' | 'meta_pixel';

export type IntegrationState = 'disconnected' | 'connected' | 'error';

export type SyncState = 'idle' | 'syncing' | 'failed';

export interface IntegrationAccount {
  handle: string;
  avatarUrl?: string;
  connectedAt: IsoDateTime;
}

/**
 * `demo` is not optional. Phase 20's gate is that mock connections never read as real, and the
 * badge is the only thing standing between a fake `syncState` and a creator believing their
 * Instagram is wired up.
 */
export interface Integration {
  id: Id;
  profileId: Id;
  kind: IntegrationKind;
  state: IntegrationState;
  enabled: boolean;
  account?: IntegrationAccount;
  lastSyncAt?: IsoDateTime;
  syncState: SyncState;
  /** GA4 measurement id or Meta Pixel id. */
  trackingId?: string;
  /** Grid block settings derived from the connected account. */
  instagramGrid?: { mediaCount: number; captionLinks: boolean };
  detail?: string;
  demo: true;
}
