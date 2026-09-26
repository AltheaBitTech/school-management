import { describe, expect, it } from 'vitest';
import {
  isOperationalDashboardUser,
  isStaffSelfServiceUser,
  resolveHomePath,
} from '@/lib/auth/routing';

describe('auth routing', () => {
  it('routes school admins to the operational dashboard', () => {
    const permissions = ['dashboard.view', 'staff.self.view'];
    expect(isOperationalDashboardUser(permissions)).toBe(true);
    expect(isStaffSelfServiceUser(permissions)).toBe(false);
    expect(resolveHomePath(permissions)).toBe('/');
  });

  it('routes staff-only users to staff dashboard', () => {
    const permissions = ['staff.self.view', 'staff.self.leave.view'];
    expect(isStaffSelfServiceUser(permissions)).toBe(true);
    expect(resolveHomePath(permissions)).toBe('/staff/dashboard');
  });
});
