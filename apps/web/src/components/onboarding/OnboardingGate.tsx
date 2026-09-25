'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import {
  getOnboardingState,
  shouldRedirectToOnboarding,
} from '@/lib/onboarding/onboarding-client';
import { isForbiddenError, isUnauthorizedError } from '@/lib/auth/auth-client';

interface OnboardingGateProps {
  children: React.ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, isAuthenticated } = useAuthSession();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkOnboarding(): Promise<void> {
      if (!isReady) {
        return;
      }

      if (!isAuthenticated) {
        if (!cancelled) {
          setIsChecking(false);
        }
        return;
      }

      try {
        const state = await getOnboardingState();
        if (cancelled) {
          return;
        }

        if (shouldRedirectToOnboarding(state) && pathname !== '/onboarding') {
          router.replace('/onboarding');
          return;
        }

        if (!shouldRedirectToOnboarding(state) && pathname === '/onboarding') {
          router.replace('/');
          return;
        }
      } catch (error) {
        if (!cancelled && !isUnauthorizedError(error) && !isForbiddenError(error)) {
          // Allow dashboard access when onboarding state cannot be loaded for legacy tenants.
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }

    void checkOnboarding();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isReady, pathname, router]);

  if (!isReady || (isAuthenticated && isChecking)) {
    return null;
  }

  return <>{children}</>;
}
