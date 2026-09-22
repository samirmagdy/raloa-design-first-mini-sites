import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from './contracts/auth';
import type { RepositoryError, Result } from './contracts/result';
import type { RaloaRepository } from './repository';
import { createMockRepository } from './mock/mockRepository';

/**
 * The swap point. `httpRepository` will be constructed the same way once `/api/v1` exists; until
 * then a mock instance is the only one screens can ever reach, because they cannot import it by
 * name (enforced by scripts/architecture-check.mjs).
 */
const resolveRepository = (): RaloaRepository => {
  const configured = (import.meta.env?.VITE_REPOSITORY as string | undefined) ?? '';
  if (configured && configured !== 'mock') {
    // Intentionally loud: wiring an HTTP repository is a backend milestone, not a flag flip.
    throw new Error(`Repository "${configured}" is not implemented yet. Set VITE_REPOSITORY=mock or omit it.`);
  }
  return createMockRepository();
};

const RepositoryContext = createContext<RaloaRepository | null>(null);

export type SessionStatus = 'loading' | 'signed-in' | 'signed-out';

interface SessionValue {
  session: Session | null;
  status: SessionStatus;
  signIn: (email: string, password: string) => Promise<Result<Session>>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export const RepositoryProvider: React.FC<{ repository?: RaloaRepository; children: React.ReactNode }> = ({
  repository,
  children
}) => {
  const value = useMemo(() => repository ?? resolveRepository(), [repository]);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  const refresh = useCallback(async () => {
    const result = await value.auth.session();
    if (result.ok) {
      setSession(result.data);
      setStatus(result.data ? 'signed-in' : 'signed-out');
    } else {
      setSession(null);
      setStatus('signed-out');
    }
  }, [value]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await value.auth.signIn({ email, password });
    if (result.ok) {
      setSession(result.data);
      setStatus('signed-in');
    }
    return result;
  }, [value]);

  const signOut = useCallback(async () => {
    await value.auth.signOut();
    setSession(null);
    setStatus('signed-out');
  }, [value]);

  const sessionValue = useMemo<SessionValue>(
    () => ({ session, status, signIn, signOut, refresh }),
    [session, status, signIn, signOut, refresh]
  );

  return (
    <RepositoryContext.Provider value={value}>
      <SessionContext.Provider value={sessionValue}>{children}</SessionContext.Provider>
    </RepositoryContext.Provider>
  );
};

export const useRepository = (): RaloaRepository => {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('useRepository must be used inside <RepositoryProvider>.');
  return repository;
};

export const useSession = (): SessionValue => {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <RepositoryProvider>.');
  return value;
};

/** Route guard for the protected surfaces: Studio, Settings, Analytics. */
export const useRequireAuth = (onUnauthenticated?: () => void): {
  ready: boolean;
  error: RepositoryError | null;
  session: Session | null;
} => {
  const { status, session } = useSession();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (status === 'signed-out' && !redirected) {
      setRedirected(true);
      onUnauthenticated?.();
    }
  }, [status, redirected, onUnauthenticated]);

  return { ready: status === 'signed-in', error: null, session };
};
