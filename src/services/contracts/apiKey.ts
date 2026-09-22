import type { Id, IsoDateTime } from './common';

export type ApiKeyScope = 'profiles:read' | 'profiles:write' | 'analytics:read' | 'subscribers:read';

export interface ApiKey {
  id: Id;
  profileId: Id;
  name: string;
  scopes: ApiKeyScope[];
  /** Only the prefix is stored; `raloa_live_ab12…` style. */
  prefix: string;
  createdAt: IsoDateTime;
  lastUsedAt: IsoDateTime | null;
  expiresAt: IsoDateTime | null;
  revokedAt: IsoDateTime | null;
}

/** The full token is returned exactly once, by `create` (Phase 21 reveal-once UI). */
export interface CreatedApiKey extends ApiKey {
  token: string;
}
