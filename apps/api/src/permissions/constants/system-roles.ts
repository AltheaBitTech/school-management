export const PLATFORM_ROLE_CODES = {
  SAAS_SUPER_ADMIN: 'SAAS_SUPER_ADMIN',
} as const;

export const ORGANIZATION_ROLE_CODES = {
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
} as const;

export interface SystemRoleDefinition {
  code: string;
  name: string;
  permissions: string[];
}

export const PLATFORM_ROLE_DEFINITIONS: SystemRoleDefinition[] = [
  {
    code: PLATFORM_ROLE_CODES.SAAS_SUPER_ADMIN,
    name: 'SaaS Super Admin',
    permissions: ['platform.organization.view', 'platform.organization.create', 'platform.role.assign', 'audit.view'],
  },
];

export const ORGANIZATION_ROLE_DEFINITIONS: SystemRoleDefinition[] = [
  {
    code: ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN,
    name: 'School Admin',
    permissions: [
      'role.view',
      'role.assign',
      'user.create',
      'student.view',
      'student.create',
      'student.update',
      'student.delete',
      'department.view',
      'department.create',
      'department.update',
      'department.deactivate',
      'staff.view',
      'staff.create',
      'staff.update',
      'staff.deactivate',
      'attendance.view',
      'attendance.mark',
      'attendance.update',
      'complaint.view',
      'complaint.create',
      'complaint.assign',
      'complaint.update',
      'complaint.close',
      'leave.view',
      'leave.create',
      'leave.approve',
      'leave.reject',
      'leave.configure_types',
      'leave.manage_balances',
      'visitor.view',
      'visitor.create',
      'visitor.checkout',
      'notice.view',
      'notice.create',
      'notice.update',
      'notice.publish',
      'notice.archive',
      'asset.view',
      'asset.create',
      'asset.update',
      'asset.assign',
      'asset.transfer',
      'asset.maintenance',
      'asset.retire',
      'file.view',
      'file.create',
      'file.delete',
      'document.view',
      'document.generate',
      'document.download',
      'approval.view',
      'approval.submit',
      'approval.approve',
      'approval.reject',
      'approval.cancel',
      'approval.configure',
      'event.view',
      'event.create',
      'event.update',
      'event.cancel',
      'event.complete',
      'event.archive',
      'event.manage_participants',
      'event.manage_venues',
      'report.event.view',
      'audit.view',
    ],
  },
];
