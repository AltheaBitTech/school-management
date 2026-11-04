import { describe, expect, it } from 'vitest';
import { getUserDisplayName, getUserInitials, getUserRoleLabel } from '@/lib/auth/user-display';
import type { AuthUser } from '@/lib/auth/auth-client';

describe('user-display', () => {
  const baseUser: AuthUser = {
    id: 'user-1',
    email: 'admin@school.edu',
    organizationId: 'org-1',
    permissions: ['dashboard.view'],
    organization: { id: 'org-1', name: 'Demo School', code: 'demo', status: 'ACTIVE' },
  };

  it('uses staff profile name when available', () => {
    expect(
      getUserDisplayName({
        ...baseUser,
        staff: { firstName: 'Ada', lastName: 'Lovelace', displayName: null },
      }),
    ).toBe('Ada Lovelace');
  });

  it('falls back to the email prefix', () => {
    expect(getUserDisplayName(baseUser)).toBe('admin');
  });

  it('builds initials from display name', () => {
    expect(getUserInitials('Ada Lovelace')).toBe('AL');
    expect(getUserInitials('admin')).toBe('AD');
  });

  it('returns role label from role metadata when present', () => {
    expect(
      getUserRoleLabel({
        ...baseUser,
        role: { name: 'Principal' },
      }),
    ).toBe('Principal');
  });
});
