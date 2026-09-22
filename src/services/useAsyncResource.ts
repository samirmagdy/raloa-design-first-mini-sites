import { useCallback, useEffect, useRef, useState } from 'react';
import type { RepositoryError, Result } from './contracts/result';

export interface AsyncResource<T> {
  data: T | null;
  isLoading: boolean;
  isFetching: boolean;
  error: RepositoryError | null;
  /** Re-runs the loader; keeps `data` visible so tables do not flash. */
  reload: () => void;
  /** Same as reload, named for the failed-state button. */
  retry: () => void;
  setData: (updater: T | ((current: T | null) => T)) => void;
  clearError: () => void;
}

/**
 * Every screen reads through this so "loading, error, empty" is one behaviour instead of six
 * hand-rolled variants, and so a stale response can never land after the key changes.
 */
export const useAsyncResource = <T,>(
  loader: () => Promise<Result<T>>,
  deps: ReadonlyArray<unknown>,
  options: { enabled?: boolean } = {}
): AsyncResource<T> => {
  const enabled = options.enabled !== false;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<RepositoryError | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isFetching, setIsFetching] = useState(false);
  const [nonce, setNonce] = useState(0);
  const generation = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    const current = ++generation.current;
    setIsLoading(data === null);
    setIsFetching(data !== null);

    void loaderRef.current().then((result) => {
      if (current !== generation.current) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
      setIsFetching(false);
    });

    return () => {
      generation.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  const clearError = useCallback(() => setError(null), []);
  const update = useCallback((updater: T | ((current: T | null) => T)) => {
    setData((current) => (typeof updater === 'function' ? (updater as (value: T | null) => T)(current) : updater));
  }, []);

  return { data, isLoading, isFetching, error, reload, retry: reload, setData: update, clearError };
};
