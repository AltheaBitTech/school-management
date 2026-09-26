import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LeaveReportPage from '@/app/(app)/reports/leave/page';
import { isLeaveReportForbiddenError } from '@/lib/reports/leave-report-errors';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('status=PENDING_APPROVAL'),
}));

vi.mock('@/lib/reports/leave-reports-client', () => ({
  getLeaveReport: vi.fn(),
}));

vi.mock('@/lib/departments/departments-client', () => ({
  listDepartments: vi.fn().mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
  }),
}));

vi.mock('@/lib/leave/leave-client', () => ({
  listLeaveTypes: vi.fn().mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
  }),
  formatLeaveStatus: (status: string) => status.replace(/_/g, ' '),
}));

import { getLeaveReport } from '@/lib/reports/leave-reports-client';

describe('LeaveReportPage', () => {
  beforeEach(() => {
    vi.mocked(getLeaveReport).mockReset();
  });

  it('renders summary cards and leave rows', async () => {
    vi.mocked(getLeaveReport).mockResolvedValue({
      data: [
        {
          id: 'leave-1',
          staffId: 'staff-1',
          staffName: 'Leave Alice',
          employeeCode: 'E001',
          departmentId: null,
          departmentName: null,
          leaveTypeId: 'type-1',
          leaveTypeName: 'Casual Leave',
          startDate: '2026-09-25',
          endDate: '2026-09-27',
          duration: 3,
          status: 'APPROVED',
          approvalRequestId: 'apr-1',
          approvalStatus: 'APPROVED',
          submittedAt: '2026-09-20T10:00:00.000Z',
          decidedAt: '2026-09-21T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      summary: {
        fromDate: null,
        toDate: null,
        timezone: 'UTC',
        dateFilterApplied: false,
        totalRequests: 1,
        pending: 0,
        approved: 1,
        rejected: 0,
        employeesOnLeave: 1,
        leaveDaysApproved: 3,
      },
      breakdown: { byDepartment: [] },
      balances: null,
    });

    render(<LeaveReportPage />);
    await waitFor(() => expect(screen.getByText('Leave Alice')).toBeInTheDocument());
    expect(screen.getByText('Approved leave days in filter: 3')).toBeInTheDocument();
    expect(screen.getByText('Casual Leave')).toBeInTheDocument();
  });

  it('passes status filter from URL and shows empty state', async () => {
    vi.mocked(getLeaveReport).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      summary: {
        fromDate: null,
        toDate: null,
        timezone: 'UTC',
        dateFilterApplied: false,
        totalRequests: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        employeesOnLeave: 0,
        leaveDaysApproved: 0,
      },
      breakdown: { byDepartment: [] },
      balances: null,
    });

    render(<LeaveReportPage />);
    await waitFor(() =>
      expect(screen.getByText(/No leave requests match/i)).toBeInTheDocument(),
    );
    expect(vi.mocked(getLeaveReport).mock.calls[0]?.[0]).toMatchObject({
      status: 'PENDING_APPROVAL',
    });
  });

  it('shows API error state', async () => {
    vi.mocked(getLeaveReport).mockRejectedValue(new Error('Server error'));
    render(<LeaveReportPage />);
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });

  it('recognizes forbidden responses', () => {
    expect(isLeaveReportForbiddenError({ statusCode: 403 })).toBe(true);
    expect(isLeaveReportForbiddenError({ statusCode: 401 })).toBe(false);
  });
});
