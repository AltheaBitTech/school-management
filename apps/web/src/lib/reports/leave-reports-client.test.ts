import { describe, expect, it, vi } from 'vitest';
import { getLeaveReport } from './leave-reports-client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }),
  },
}));

import { apiClient } from '@/lib/api/client';

describe('getLeaveReport', () => {
  it('builds query parameters for status and date range', async () => {
    await getLeaveReport({
      status: 'PENDING_APPROVAL',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      page: 1,
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/reports/leave?startDate=2026-09-01&endDate=2026-09-30&status=PENDING_APPROVAL&page=1',
      { auth: true },
    );
  });
});
