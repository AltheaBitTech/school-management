/**
 * Global permission catalog for CampusOps.
 * Format: resource.action
 */
export interface SystemPermissionDefinition {
  code: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: SystemPermissionDefinition[] = [
  { code: 'audit.view', description: 'View audit logs' },
  { code: 'role.view', description: 'View roles within an organization' },
  { code: 'role.assign', description: 'Assign organization-scoped roles to users' },
  { code: 'platform.organization.view', description: 'View organizations at platform level' },
  { code: 'platform.organization.create', description: 'Create organizations at platform level' },
  { code: 'platform.role.assign', description: 'Assign platform-scoped roles to users' },
  { code: 'student.view', description: 'View students' },
  { code: 'student.create', description: 'Create students' },
  { code: 'student.update', description: 'Update students' },
  { code: 'student.delete', description: 'Delete students' },
  { code: 'department.view', description: 'View departments' },
  { code: 'department.create', description: 'Create departments' },
  { code: 'department.update', description: 'Update departments' },
  { code: 'department.deactivate', description: 'Deactivate departments' },
  { code: 'staff.view', description: 'View staff' },
  { code: 'staff.create', description: 'Create staff' },
  { code: 'staff.update', description: 'Update staff' },
  { code: 'staff.deactivate', description: 'Deactivate staff' },
  { code: 'attendance.view', description: 'View staff attendance' },
  { code: 'attendance.mark', description: 'Mark staff attendance' },
  { code: 'attendance.update', description: 'Update staff attendance' },
  { code: 'complaint.view', description: 'View complaints' },
  { code: 'complaint.create', description: 'Create complaints' },
  { code: 'complaint.assign', description: 'Assign complaints' },
  { code: 'complaint.update', description: 'Update complaints' },
  { code: 'complaint.close', description: 'Close complaints' },
  { code: 'leave.view', description: 'View leave requests' },
  { code: 'leave.create', description: 'Create leave requests' },
  { code: 'leave.approve', description: 'Approve leave requests' },
  { code: 'leave.reject', description: 'Reject leave requests' },
  { code: 'leave.configure_types', description: 'Configure leave types' },
  { code: 'leave.manage_balances', description: 'Manage leave balances' },
  { code: 'visitor.view', description: 'View visitors' },
  { code: 'visitor.create', description: 'Create visitors' },
  { code: 'visitor.checkout', description: 'Check out visitors' },
  { code: 'notice.view', description: 'View notices' },
  { code: 'notice.create', description: 'Create notices' },
  { code: 'notice.update', description: 'Update notices' },
  { code: 'notice.publish', description: 'Publish notices' },
  { code: 'notice.archive', description: 'Archive notices' },
  { code: 'asset.view', description: 'View assets' },
  { code: 'asset.create', description: 'Create assets' },
  { code: 'asset.update', description: 'Update assets' },
  { code: 'asset.assign', description: 'Assign assets' },
  { code: 'asset.transfer', description: 'Transfer assets' },
  { code: 'asset.maintenance', description: 'Manage asset maintenance' },
  { code: 'asset.retire', description: 'Retire assets' },
  { code: 'document.view', description: 'View documents' },
  { code: 'document.generate', description: 'Generate documents' },
  { code: 'document.download', description: 'Download documents' },
  { code: 'approval.view', description: 'View approvals' },
  { code: 'approval.act', description: 'Act on approvals' },
];

export const SYSTEM_PERMISSION_CODES = SYSTEM_PERMISSIONS.map((permission) => permission.code);
