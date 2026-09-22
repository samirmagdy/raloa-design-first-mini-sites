import type { Id, IsoDateTime } from './common';
import type { PlanId } from './profile';

export interface SessionUser {
  id: Id;
  email: string;
  displayName: string;
  plan: PlanId;
  createdAt: IsoDateTime;
}

export interface Session {
  user: SessionUser;
  signedInAt: IsoDateTime;
  /** Mock sessions expire locally so the expired-session path exists before there is a cookie. */
  expiresAt: IsoDateTime;
}

export interface Credentials {
  email: string;
  password: string;
}

export type AuthMode = 'signin' | 'signup';
