'use client';

import { useOptionalAuthSession } from '@/components/providers/AuthSessionProvider';
import { hasPermission } from '@/lib/auth/routing';

/**
 * Permission check for buttons and forms.
 * Pages rendered outside the session provider (unit tests) keep their actions visible.
 * A signed-in session hides an action the active role does not have.
 */
export function useCan(permission: string): boolean {
  const session = useOptionalAuthSession();
  if (!session) {
    return true;
  }
  if (!session.isReady || !session.user) {
    return false;
  }
  return hasPermission(session.user.permissions, permission);
}

export function useCanEvery(permissions: string[]): boolean {
  const session = useOptionalAuthSession();
  if (!session) {
    return true;
  }
  if (!session.isReady || !session.user) {
    return false;
  }
  return permissions.every((permission) => hasPermission(session.user?.permissions, permission));
}
