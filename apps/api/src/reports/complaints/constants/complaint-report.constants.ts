export const COMPLAINT_REPORT_ERROR_CODES = {
  ORGANIZATION_NOT_FOUND: 'COMPLAINT_REPORT_ORGANIZATION_NOT_FOUND',
  PLATFORM_ORGANIZATION: 'COMPLAINT_REPORT_PLATFORM_ORGANIZATION',
  INVALID_DATE_RANGE: 'COMPLAINT_REPORT_INVALID_DATE_RANGE',
} as const;

export const COMPLAINT_REPORT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Age buckets use whole days from createdAt to closedAt (if CLOSED) or report generation time. */
export const COMPLAINT_AGE_BUCKETS = [
  { key: '0_2', label: '0–2 days', minDays: 0, maxDays: 2 },
  { key: '3_7', label: '3–7 days', minDays: 3, maxDays: 7 },
  { key: '8_30', label: '8–30 days', minDays: 8, maxDays: 30 },
  { key: '30_PLUS', label: '30+ days', minDays: 31, maxDays: null },
] as const;

export const HIGH_COMPLAINT_PRIORITIES = ['HIGH', 'CRITICAL'] as const;
