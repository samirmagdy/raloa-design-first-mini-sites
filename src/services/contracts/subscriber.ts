import type { Id, IsoDateTime } from './common';

export type SubscriberStatus = 'pending' | 'active' | 'unsubscribed';

export interface Subscriber {
  id: Id;
  profileId: Id;
  email: string;
  status: SubscriberStatus;
  /** Where the signup happened, so the source is auditable after import. */
  source: { pageId?: Id; blockId?: Id };
  createdAt: IsoDateTime;
  confirmedAt?: IsoDateTime;
  unsubscribedAt?: IsoDateTime;
}

/** Double opt-in (M5): `subscribe` records a pending row and returns the confirmation token. */
export interface SubscribeIntent {
  profileId: Id;
  email: string;
  pageId?: Id;
  blockId?: Id;
  redirectUrl?: string;
}

export interface SubscribeResult {
  subscriberId: Id;
  status: SubscriberStatus;
  /** Mock-only: the real backend emails this link instead of returning it. */
  confirmationToken: string;
  demo: true;
}
