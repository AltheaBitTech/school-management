import type { AuthUser } from '@/lib/auth/auth-client';
import { isOperationalDashboardUser, isStaffSelfServiceUser, isStudentSelfServiceUser } from '@/lib/auth/routing';
import { isPlatformOrganization } from '@/lib/navigation/platform';

export function getUserDisplayName(user: AuthUser): string {
  const staff = user.staff;
  if (staff) {
    const fromProfile = staff.displayName?.trim() || `${staff.firstName} ${staff.lastName}`.trim();
    if (fromProfile) {
      return fromProfile;
    }
  }

  const prefix = user.email.split('@')[0]?.trim();
  return prefix || user.email;
}

export function getUserInitials(displayName: string): string {
  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function getUserRoleLabel(user: AuthUser): string {
  if (user.role?.name?.trim()) {
    return user.role.name.trim();
  }
  if (isPlatformOrganization(user.organization?.code)) {
    return 'Platform administrator';
  }
  if (isStaffSelfServiceUser(user.permissions)) {
    return 'Staff member';
  }
  if (isStudentSelfServiceUser(user.permissions)) {
    return 'Student';
  }
  if (isOperationalDashboardUser(user.permissions)) {
    return 'School operations';
  }
  return 'User';
}
