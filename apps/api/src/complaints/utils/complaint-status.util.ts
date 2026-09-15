import { ComplaintStatus } from '@prisma/client';
import { COMPLAINT_STATUS_TRANSITIONS } from '../constants/complaint.constants';

export function getExpectedNextStatus(
  currentStatus: ComplaintStatus,
): ComplaintStatus | null {
  return COMPLAINT_STATUS_TRANSITIONS[currentStatus] ?? null;
}

export function isValidComplaintStatusTransition(
  currentStatus: ComplaintStatus,
  nextStatus: ComplaintStatus,
): boolean {
  return getExpectedNextStatus(currentStatus) === nextStatus;
}
