import { describe, expect, it, vi } from 'vitest';
import { getAttendanceReport } from './attendance-reports-client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }),
  },
}));

import { apiClient } from '@/lib/api/client';

describe('getAttendanceReport', () => {
  it('builds query parameters for date and filters', async () => {
    await getAttendanceReport({
      date: '2026-09-25',
      departmentId: 'dept-1',
      status: 'PRESENT',
      page: 2,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/reports/attendance?date=2026-09-25&departmentId=dept-1&status=PRESENT&page=2',
      { auth: true },
    );
  });
});
