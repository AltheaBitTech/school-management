export const NOTIFICATION_EVENT_KEYS = {
  LEAVE_APPROVED: 'leave.approved',
  LEAVE_REJECTED: 'leave.rejected',
} as const;

export type NotificationEventKey =
  (typeof NOTIFICATION_EVENT_KEYS)[keyof typeof NOTIFICATION_EVENT_KEYS];

export const NOTIFICATION_ERROR_CODES = {
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  INVALID_RECIPIENT: 'INVALID_NOTIFICATION_RECIPIENT',
} as const;
