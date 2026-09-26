import { ApiError } from '@/lib/api/client';

export function isFeeReportForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 403;
}
