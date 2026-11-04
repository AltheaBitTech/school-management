export type ComplaintReadScope =
  | { mode: 'organization' }
  | { mode: 'creator'; userId: string }
  | { mode: 'assignee'; staffId: string | null };

export function complaintScopeWhere(scope?: ComplaintReadScope): {
  createdByUserId?: string;
  assignedToStaffId?: string;
  id?: { in: string[] };
} {
  if (!scope || scope.mode === 'organization') {
    return {};
  }

  if (scope.mode === 'creator') {
    return { createdByUserId: scope.userId };
  }

  if (!scope.staffId) {
    return { id: { in: [] } };
  }

  return { assignedToStaffId: scope.staffId };
}

export function complaintMatchesScope(
  complaint: { createdByUserId: string; assignedToStaffId: string | null },
  scope?: ComplaintReadScope,
): boolean {
  if (!scope || scope.mode === 'organization') {
    return true;
  }

  if (scope.mode === 'creator') {
    return complaint.createdByUserId === scope.userId;
  }

  return Boolean(scope.staffId) && complaint.assignedToStaffId === scope.staffId;
}
