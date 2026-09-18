import { ApprovalRequestStatus } from '@prisma/client';
import {
  APPROVAL_ERROR_CODES,
  isTerminalApprovalStatus,
  TERMINAL_APPROVAL_STATUSES,
} from './approval.constants';

describe('approval.constants', () => {
  it('identifies terminal approval statuses', () => {
    for (const status of TERMINAL_APPROVAL_STATUSES) {
      expect(isTerminalApprovalStatus(status)).toBe(true);
    }

    expect(isTerminalApprovalStatus(ApprovalRequestStatus.PENDING)).toBe(false);
  });

  it('exposes stable approval error codes', () => {
    expect(APPROVAL_ERROR_CODES.APPROVAL_SELF_APPROVAL).toBe('APPROVAL_SELF_APPROVAL');
    expect(APPROVAL_ERROR_CODES.APPROVAL_NOT_PENDING).toBe('APPROVAL_NOT_PENDING');
  });
});
