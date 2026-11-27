import { SYSTEM_PERMISSIONS, SystemPermissionDefinition } from './system-permissions';

/**
 * Groups the permission catalog into modules ("features") for the role editor.
 * Order matters: the first matching group wins, so more specific prefixes come first.
 */
interface PermissionGroupDefinition {
  key: string;
  label: string;
  matches: (code: string) => boolean;
}

const startsWithAny =
  (...prefixes: string[]) =>
  (code: string): boolean =>
    prefixes.some((prefix) => code.startsWith(prefix));

const PERMISSION_GROUP_DEFINITIONS: PermissionGroupDefinition[] = [
  { key: 'reports', label: 'Reports', matches: startsWithAny('report.') },
  {
    key: 'student_self',
    label: 'Student portal (self-service)',
    matches: startsWithAny('student.self.'),
  },
  { key: 'parent', label: 'Parent portal', matches: startsWithAny('parent.') },
  {
    key: 'staff_self',
    label: 'Staff self-service',
    matches: startsWithAny('staff.self.'),
  },
  {
    key: 'student_attendance',
    label: 'Student attendance',
    matches: startsWithAny('student.attendance.'),
  },
  { key: 'students', label: 'Students', matches: startsWithAny('student.') },
  { key: 'staff', label: 'Staff', matches: startsWithAny('staff.') },
  { key: 'departments', label: 'Departments', matches: startsWithAny('department.') },
  { key: 'classes', label: 'Classes & sections', matches: startsWithAny('class.') },
  { key: 'attendance', label: 'Staff attendance', matches: startsWithAny('attendance.') },
  { key: 'leave', label: 'Leave', matches: startsWithAny('leave.') },
  { key: 'complaints', label: 'Complaints', matches: startsWithAny('complaint.') },
  { key: 'visitors', label: 'Visitors', matches: startsWithAny('visitor.') },
  { key: 'notices', label: 'Notices', matches: startsWithAny('notice.') },
  { key: 'events', label: 'Events & activities', matches: startsWithAny('event.') },
  { key: 'assets', label: 'Assets', matches: startsWithAny('asset.') },
  { key: 'transport', label: 'Transport', matches: startsWithAny('transport.') },
  { key: 'fees', label: 'Fees', matches: startsWithAny('fee.') },
  { key: 'documents', label: 'Documents & files', matches: startsWithAny('document.', 'file.') },
  { key: 'approvals', label: 'Approvals', matches: startsWithAny('approval.') },
  {
    key: 'administration',
    label: 'Administration',
    matches: startsWithAny('role.', 'user.', 'organization.', 'dashboard.', 'audit.'),
  },
];

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: SystemPermissionDefinition[];
}

/** Permission codes that can never be granted to an organization role. */
export function isPlatformPermission(code: string): boolean {
  return code.startsWith('platform.');
}

export const ASSIGNABLE_ORGANIZATION_PERMISSIONS: SystemPermissionDefinition[] =
  SYSTEM_PERMISSIONS.filter((permission) => !isPlatformPermission(permission.code));

export const ASSIGNABLE_ORGANIZATION_PERMISSION_CODES = new Set(
  ASSIGNABLE_ORGANIZATION_PERMISSIONS.map((permission) => permission.code),
);

export function groupPermissions(
  permissions: SystemPermissionDefinition[] = ASSIGNABLE_ORGANIZATION_PERMISSIONS,
): PermissionGroup[] {
  const groups = PERMISSION_GROUP_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    permissions: [] as SystemPermissionDefinition[],
  }));
  const other: PermissionGroup = { key: 'other', label: 'Other', permissions: [] };

  for (const permission of permissions) {
    const index = PERMISSION_GROUP_DEFINITIONS.findIndex((definition) =>
      definition.matches(permission.code),
    );
    (index === -1 ? other : groups[index]).permissions.push(permission);
  }

  return [...groups, other].filter((group) => group.permissions.length > 0);
}
