'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import {
  clearSessionActivity,
  getLastSessionActivityAt,
  SESSION_IDLE_TIMEOUT_MS,
  touchSessionActivity,
} from '@/lib/auth/session-idle';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

export function SessionIdleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, signOut } = useAuthSession();

  useEffect(() => {
    if (!isAuthenticated) {
      clearSessionActivity();
      return;
    }

    touchSessionActivity();

    function onActivity(): void {
      touchSessionActivity();
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    const intervalId = window.setInterval(() => {
      const last = getLastSessionActivityAt();
      if (!last) {
        touchSessionActivity();
        return;
      }
      if (Date.now() - last >= SESSION_IDLE_TIMEOUT_MS) {
        clearSessionActivity();
        void signOut().finally(() => {
          router.replace('/login?reason=idle');
        });
      }
    }, 60_000);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, router, signOut]);

  return <>{children}</>;
}
