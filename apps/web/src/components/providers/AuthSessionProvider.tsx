'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, logout, refreshSession, type AuthUser } from '@/lib/auth/auth-client';
import { clearAccessToken, getAccessToken } from '@/lib/auth/session';

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
    let cancelled = false;

    async function hydrate(): Promise<void> {
      try {
        if (!getAccessToken()) {
          await refreshSession();
        }
        const currentUser = await getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
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
