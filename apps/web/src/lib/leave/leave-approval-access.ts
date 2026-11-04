import { hasPermission } from '@/lib/auth/routing';

export function canApproveOrRejectLeave(
  permissions: string[] | undefined,
  activeRoleCode: string | undefined,
): boolean {
  if (activeRoleCode !== 'PRINCIPAL') {
    return false;
  }

  return (
    hasPermission(permissions, 'leave.approve') && hasPermission(permissions, 'leave.reject')
  );
}

export function canActOnLeaveApprovalRequest(
  permissions: string[] | undefined,
  activeRoleCode: string | undefined,
  entityType: string,
): boolean {
  if (entityType === 'LEAVE') {
    return canApproveOrRejectLeave(permissions, activeRoleCode);
  }

  return hasPermission(permissions, 'approval.approve');
}
