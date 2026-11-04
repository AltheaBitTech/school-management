'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import {
  isParentSelfServiceUser,
  isStaffSelfServiceUser,
  isStudentSelfServiceUser,
} from '@/lib/auth/routing';

export function StaffSelfRouteGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, isAuthenticated, user } = useAuthSession();

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user?.permissions) {
      return;
    }

    if (isStaffSelfServiceUser(user.permissions)) {
      if (pathname === '/' || pathname === '/onboarding') {
        router.replace('/staff/dashboard');
      }
      return;
    }

    if (isStudentSelfServiceUser(user.permissions)) {
      if (pathname === '/' || pathname === '/onboarding') {
        router.replace('/student/profile');
      }
      return;
    }

    if (isParentSelfServiceUser(user.permissions)) {
      if (pathname === '/' || pathname === '/onboarding') {
        router.replace('/parent');
      }
    }
  }, [isAuthenticated, isReady, pathname, router, user?.permissions]);

  return <>{children}</>;
}
