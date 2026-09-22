import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RepositoryError, Result } from './contracts/result';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed';

export interface AutosaveState {
  status: SaveStatus;
  dirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  error: RepositoryError | null;
  /** Immediate save: publish, navigation and the ⌘S shortcut all use this. */
  saveNow: () => Promise<boolean>;
  retry: () => Promise<boolean>;
  /** Drop the draft and go back to the last persisted value. */
  reset: () => void;
}

const sameValue = <T,>(left: T, right: T): boolean => {
  if (left === right) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

/**
 * The write path Phase 9 asks for, expressed against repository methods rather than localStorage:
 * debounce → persist(draft) → saved | failed(retryable). `onReset` restores the saved document, so
 * a failed save never leaves the user guessing what is actually stored.
 */
export const useAutosave = <T,>(input: {
  draft: T;
  saved: T;
  persist: (draft: T) => Promise<Result<unknown>>;
  onReset: () => void;
  onPersisted?: (result: Extract<Result<unknown>, { ok: true }>) => void;
  debounceMs?: number;
  enabled?: boolean;
}): AutosaveState => {
  const { draft, saved, persist, onReset, onPersisted, debounceMs = 700, enabled = true } = input;
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<RepositoryError | null>(null);
  const dirty = useMemo(() => !sameValue(draft, saved), [draft, saved]);

  const inFlight = useRef<Promise<boolean> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const timer = useRef<number | undefined>(undefined);

  const run = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;
    const payload = draftRef.current;
    setStatus('saving');
    const task = persistRef.current(payload)
      .then((result) => {
        if (result.ok) {
          onPersisted?.(result);
          setError(null);
          setLastSavedAt(new Date().toISOString());
          setStatus(sameValue(draftRef.current, payload) ? 'saved' : 'dirty');
          return true;
        }
        setError(result.error);
        setStatus('failed');
        return false;
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = task;
    return task;
  }, [onPersisted]);

  useEffect(() => {
    if (!enabled) return;
    if (!dirty) {
      setStatus((current) => (current === 'saving' ? current : lastSavedAt ? 'saved' : 'idle'));
      return;
    }
    setStatus('dirty');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void run();
    }, debounceMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [dirty, draft, debounceMs, enabled, run, lastSavedAt]);

  const saveNow = useCallback(async () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!dirty) return true;
    return run();
  }, [dirty, run]);

  const retry = useCallback(async () => {
    setError(null);
    return run();
  }, [run]);

  const reset = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    setError(null);
    setStatus('idle');
    onReset();
  }, [onReset]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  return {
    status: dirty ? status : lastSavedAt ? 'saved' : status === 'failed' ? 'failed' : 'idle',
    dirty,
    isSaving: status === 'saving',
    lastSavedAt,
    error,
    saveNow,
    retry,
    reset
  };
};

const clone = <T,>(value: T): T => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T);

/** Bounded undo stack for editor actions; 30 entries keeps memory flat without losing a session. */
export const useHistory = <T,>(initial: T) => {
  const [stack, setStack] = useState<{ past: T[]; present: T }>({ past: [], present: initial });

  const apply = useCallback((next: T, options: { record?: boolean } = {}) => {
    setStack((current) => ({
      past: options.record === false ? current.past : [...current.past.slice(-29), clone(current.present)],
      present: next
    }));
  }, []);

  const undo = useCallback((): T | null => {
    let restored: T | null = null;
    setStack((current) => {
      if (!current.past.length) return current;
      restored = current.past[current.past.length - 1];
      return { past: current.past.slice(0, -1), present: restored };
    });
    return restored;
  }, []);

  const reset = useCallback((value: T) => {
    setStack({ past: [], present: value });
  }, []);

  return { present: stack.present, apply, undo, canUndo: stack.past.length > 0, depth: stack.past.length, reset };
};
