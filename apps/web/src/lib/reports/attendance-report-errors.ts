import { ApiError } from '@/lib/api/client';

export function isAttendanceReportForbiddenError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'statusCode' in error
    ? (error as { statusCode?: number }).statusCode === 403
    : error instanceof ApiError && error.statusCode === 403;
}
