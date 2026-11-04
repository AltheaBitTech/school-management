import { describe, expect, it } from 'vitest';
import { canApproveOrRejectLeave, canActOnLeaveApprovalRequest } from './leave-approval-access';

describe('leave approval access', () => {
  it('allows only the Principal role to approve or reject leave', () => {
    const permissions = ['leave.approve', 'leave.reject'];

    expect(canApproveOrRejectLeave(permissions, 'PRINCIPAL')).toBe(true);
    expect(canApproveOrRejectLeave(permissions, 'SCHOOL_ADMIN')).toBe(false);
  });

  it('keeps generic approval permissions separate from leave decisions', () => {
    const permissions = ['approval.approve'];

    expect(canActOnLeaveApprovalRequest(permissions, 'SCHOOL_ADMIN', 'PURCHASE')).toBe(true);
    expect(canActOnLeaveApprovalRequest(permissions, 'SCHOOL_ADMIN', 'LEAVE')).toBe(false);
  });
});
