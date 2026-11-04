'use client';

import { useEffect } from 'react';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import { refreshSession } from '@/lib/auth/auth-client';
import { getAccessExpiresAt } from '@/lib/auth/session';

const CHECK_MS = 15_000;
const REFRESH_LEAD_MS = 60_000;

export function SessionRefreshProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthSession();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      const expiresAt = getAccessExpiresAt();
      if (expiresAt > 0 && Date.now() >= expiresAt - REFRESH_LEAD_MS) {
        void refreshSession().catch(() => undefined);
      }
    }, CHECK_MS);

    return () => window.clearInterval(timer);
  }, [isAuthenticated]);

  return <>{children}</>;
}
