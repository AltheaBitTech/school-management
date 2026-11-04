import type { OrganizationRole } from '@/lib/rbac/roles-client';

/** Roles that can be assigned when creating staff logins (excludes Student). */
export function filterStaffAssignableRoles(roles: OrganizationRole[]): OrganizationRole[] {
  return roles.filter((role) => role.code !== 'STUDENT');
}
