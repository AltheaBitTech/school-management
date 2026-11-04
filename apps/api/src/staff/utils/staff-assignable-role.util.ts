import { ORGANIZATION_ROLE_CODES } from '../../permissions/constants/system-roles';

/** Roles that may be assigned when provisioning staff login (not student self-service). */
export function isStaffLoginAssignableRoleCode(roleCode: string): boolean {
  return roleCode !== ORGANIZATION_ROLE_CODES.STUDENT;
}

export function assertStaffLoginAssignableRoleCode(roleCode: string): void {
  if (!isStaffLoginAssignableRoleCode(roleCode)) {
    throw new Error('STUDENT role cannot be assigned to staff login accounts');
  }
}
