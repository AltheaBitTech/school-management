import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VisitorsReportPage from '@/app/(app)/reports/visitors/page';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('date=2026-09-25'),
}));

vi.mock('@/lib/reports/visitors-reports-client', () => ({
  getVisitorsReport: vi.fn(),
}));

vi.mock('@/lib/departments/departments-client', () => ({
  listDepartments: vi.fn().mockResolvedValue({
    data: [{ id: 'dept-1', name: 'Admin', code: 'ADM', status: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
  listStaff: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'staff-1',
        organizationId: 'org-1',
        employeeCode: 'E001',
        firstName: 'Host',
        lastName: 'One',
        employmentStatus: 'ACTIVE',
      },
    ],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

vi.mock('@/lib/visitors/visitors-client', () => ({
  formatDateTime: (value: string) => value,
  formatVisitorStatus: (status: string) => status.replace(/_/g, ' '),
  VISITOR_STATUSES: ['CHECKED_IN', 'CHECKED_OUT'],
}));

import { getVisitorsReport } from '@/lib/reports/visitors-reports-client';

describe('VisitorsReportPage', () => {
  beforeEach(() => {
    vi.mocked(getVisitorsReport).mockReset();
  });

  it('renders summary cards and report rows', async () => {
    vi.mocked(getVisitorsReport).mockResolvedValue({
      data: [
        {
          id: 'v-1',
          visitorCode: 'VIS-001',
          name: 'Jane Guest',
          mobile: '9000000001',
          purpose: 'Meeting',
          hostStaffId: 'staff-1',
          hostName: 'Host One',
          departmentId: 'dept-1',
          departmentName: 'Admin',
          checkInAt: '2026-09-25T09:00:00.000Z',
          checkOutAt: null,
          status: 'CHECKED_IN',
          visitDate: '2026-09-25',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      summary: {
        fromDate: '2026-09-25',
        toDate: '2026-09-25',
        timezone: 'UTC',
        dateFilterApplied: true,
        scope: 'single_day',
        totalVisits: 1,
        checkedInVisits: 1,
        checkedOutVisits: 0,
        activeOnCampus: 1,
        checkedInOnSelectedDay: 1,
      },
      breakdown: {
        byStatus: [{ status: 'CHECKED_IN', count: 1 }],
        byPurpose: [{ purpose: 'Meeting', count: 1 }],
        byHost: [{ staffId: 'staff-1', staffName: 'Host One', total: 1, active: 1 }],
        byDepartment: [
          { departmentId: 'dept-1', departmentName: 'Admin', total: 1, active: 1 },
        ],
      },
    });

    render(<VisitorsReportPage />);

    await waitFor(() => {
      expect(screen.getByText('Visitor report')).toBeInTheDocument();
      expect(screen.getByText('Jane Guest')).toBeInTheDocument();
      expect(screen.getByText('Active on campus')).toBeInTheDocument();
    });

    expect(getVisitorsReport).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-09-25' }),
    );
  });

  it('shows empty state when no rows match', async () => {
    vi.mocked(getVisitorsReport).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      summary: {
        fromDate: null,
        toDate: null,
        timezone: 'UTC',
        dateFilterApplied: false,
        scope: 'none',
        totalVisits: 0,
        checkedInVisits: 0,
        checkedOutVisits: 0,
        activeOnCampus: 0,
        checkedInOnSelectedDay: null,
      },
      breakdown: {
        byStatus: [],
        byPurpose: [],
        byHost: [],
        byDepartment: [],
      },
    });

    render(<VisitorsReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/No visitors match the selected filters/i)).toBeInTheDocument();
    });
  });
});
