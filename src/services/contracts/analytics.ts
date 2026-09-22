import type { Id, IsoDateTime, LocalizedText } from './common';

export type AnalyticsRange = '7d' | '30d' | '90d';

export type AnalyticsEventType = 'view' | 'click' | 'form_submit' | 'subscribe' | 'unsubscribe';

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/** The events table: every dashboard number is derived from rows like this, not seeded text. */
export interface AnalyticsEvent {
  id: Id;
  profileId: Id;
  pageId?: Id;
  blockId?: Id;
  type: AnalyticsEventType;
  occurredAt: IsoDateTime;
  /** Anonymous per-visitor key; the backend hashes an IP+UA salt, the mock a random id. */
  visitorKey: string;
  referrer?: string;
  utm?: UtmParams;
}

/**
 * `views`, `uniqueVisitors`, `linkClicks` and `timeline` keep the shape already in use so the
 * public contract is free (see docs/backend-plan.md, M5); the rest is additive.
 */
export interface AnalyticsSnapshot {
  range: AnalyticsRange;
  views: number;
  uniqueVisitors: number;
  linkClicks: number;
  formSubmissions: number;
  clickThroughRate: number;
  timeline: Array<{ date: string; views: number; clicks: number }>;
  topLinks: Array<{ blockId: Id; title: LocalizedText; clicks: number; clickThroughRate: number }>;
  referrers: Array<{ host: string; views: number }>;
  campaigns: Array<{ utmSource: string; utmCampaign: string; views: number; clicks: number }>;
  generatedAt: IsoDateTime;
}

export interface AnalyticsRequest {
  profileId: Id;
  range: AnalyticsRange;
  from?: string;
  to?: string;
}
