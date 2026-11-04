import { describe, expect, it } from 'vitest';
import {
  isOperationalDashboardUser,
  isStaffSelfServiceUser,
  isParentSelfServiceUser,
  isStudentSelfServiceUser,
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

  it('routes student-only users to student profile', () => {
    const permissions = ['student.self.view', 'student.self.fee.view'];
    expect(isStudentSelfServiceUser(permissions)).toBe(true);
    expect(resolveHomePath(permissions)).toBe('/student/profile');
  });

  it('routes parent users to the parent portal', () => {
    const permissions = ['parent.portal.view', 'notice.view'];
    expect(isParentSelfServiceUser(permissions)).toBe(true);
    expect(resolveHomePath(permissions)).toBe('/parent');
  });
});
