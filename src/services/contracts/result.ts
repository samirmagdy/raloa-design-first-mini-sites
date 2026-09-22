import type { LocalizedText } from './common';

/**
 * D5 in docs/backend-plan.md: every repository call can fail, and the failure carries a code the
 * UI can branch on plus text it can render without a translation lookup table. `source` is
 * deliberately absent — it was a mock-only concept living in the shared interface.
 */
export type RepositoryErrorCode =
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'unsupported'
  | 'network'
  | 'server';

export interface RepositoryFieldError {
  field: string;
  message: LocalizedText;
}

export interface RepositoryError {
  code: RepositoryErrorCode;
  message: LocalizedText;
  fields?: RepositoryFieldError[];
  /** Set on `conflict` so the caller can offer "reload the saved version". */
  currentVersion?: number;
  /** Retrying is safe for these codes; the UI shows Retry only when true. */
  retryable?: boolean;
  /** Diagnostic detail for the console, never rendered as user copy. */
  detail?: string;
}

export type Result<T, E = RepositoryError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export const ok = <T,>(data: T): Result<T, never> => ({ ok: true, data });

export const fail = <E,>(error: E): Result<never, E> => ({ ok: false, error });

export const repositoryError = (
  code: RepositoryErrorCode,
  message: LocalizedText,
  extra: Omit<Partial<RepositoryError>, 'code' | 'message'> = {}
): RepositoryError => ({
  code,
  message,
  retryable: code === 'network' || code === 'server' || code === 'rate_limited',
  ...extra
});

export type Cursor = string;

export interface PageRequest {
  cursor?: Cursor;
  limit?: number;
  query?: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: Cursor | null;
  total: number;
}
