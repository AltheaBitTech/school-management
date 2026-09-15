import { ComplaintStatus } from '@prisma/client';
import {
  getExpectedNextStatus,
  isValidComplaintStatusTransition,
} from './complaint-status.util';

describe('complaint-status.util', () => {
  it('returns the next status in the strict workflow', () => {
    expect(getExpectedNextStatus(ComplaintStatus.OPEN)).toBe(ComplaintStatus.ASSIGNED);
    expect(getExpectedNextStatus(ComplaintStatus.COMPLETED)).toBe(ComplaintStatus.CLOSED);
    expect(getExpectedNextStatus(ComplaintStatus.CLOSED)).toBeNull();
  });

  it('rejects skipped and backward transitions', () => {
    expect(
      isValidComplaintStatusTransition(ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS),
    ).toBe(false);
    expect(
      isValidComplaintStatusTransition(ComplaintStatus.IN_PROGRESS, ComplaintStatus.ASSIGNED),
    ).toBe(false);
    expect(
      isValidComplaintStatusTransition(ComplaintStatus.COMPLETED, ComplaintStatus.CLOSED),
    ).toBe(true);
  });
});
