'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, logout, refreshSession, type AuthUser } from '@/lib/auth/auth-client';
import { clearAccessToken, getAccessToken } from '@/lib/auth/session';
import { setFeatureFlagsFromSession } from '@/lib/features/feature-flags';

interface AuthSessionContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  signOut: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    function onSessionExpired(): void {
      setUser(null);
    }

    window.addEventListener('campusops:session-expired', onSessionExpired);
    return () => {
      window.removeEventListener('campusops:session-expired', onSessionExpired);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate(): Promise<void> {
      try {
        if (!getAccessToken()) {
          await refreshSession();
        }
        const currentUser = await getCurrentUser();
        if (!cancelled) {
          setFeatureFlagsFromSession(currentUser.features);
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setFeatureFlagsFromSession(undefined);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await logout();
    } catch {
      clearAccessToken();
    } finally {
      setUser(null);
      setFeatureFlagsFromSession(undefined);
    }
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      isReady,
      isAuthenticated: Boolean(user),
      user,
      signOut,
    }),
    [isReady, signOut, user],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return context;
}

export function useOptionalAuthSession(): AuthSessionContextValue | null {
  return useContext(AuthSessionContext);
}

export function AuthSessionOverride({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
  const value = useMemo<AuthSessionContextValue>(
    () => ({
      isReady: true,
      isAuthenticated: Boolean(user),
      user,
      signOut: async () => undefined,
    }),
    [user],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
