import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ComplaintsReportPage from '@/app/(app)/reports/complaints/page';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('openOnly=true'),
}));

vi.mock('@/lib/reports/complaints-reports-client', () => ({
  getComplaintsReport: vi.fn(),
}));

vi.mock('@/lib/departments/departments-client', () => ({
  listDepartments: vi.fn().mockResolvedValue({
    data: [{ id: 'dept-1', name: 'Facilities', code: 'FAC', status: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'staff-1',
        employeeCode: 'E001',
        firstName: 'Assignee',
        lastName: 'One',
        displayName: null,
        status: 'ACTIVE',
      },
    ],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

import { getComplaintsReport } from '@/lib/reports/complaints-reports-client';

describe('ComplaintsReportPage', () => {
  beforeEach(() => {
    vi.mocked(getComplaintsReport).mockReset();
  });

  it('renders summary cards and report rows', async () => {
    vi.mocked(getComplaintsReport).mockResolvedValue({
      data: [
        {
          id: 'c-1',
          complaintCode: 'CMP-001',
          title: 'Broken AC',
          category: 'ELECTRICAL',
          priority: 'HIGH',
          status: 'OPEN',
          departmentId: null,
          departmentName: null,
          assigneeStaffId: null,
          assigneeName: null,
          createdAt: '2026-09-20T10:00:00.000Z',
          ageDays: 2,
          closedAt: null,
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      summary: {
        fromDate: null,
        toDate: null,
        timezone: 'UTC',
        dateFilterApplied: false,
        totalComplaints: 1,
        openComplaints: 1,
        assignedComplaints: 0,
        inProgressComplaints: 0,
        completedComplaints: 0,
        closedComplaints: 0,
        highPriorityComplaints: 1,
      },
      breakdown: {
        byStatus: [{ status: 'OPEN', count: 1 }],
        byPriority: [{ priority: 'HIGH', count: 1 }],
        byCategory: [{ category: 'ELECTRICAL', count: 1 }],
        byDepartment: [],
        byAssignee: [],
      },
      ageing: [{ key: '0_2', label: '0–2 days', count: 1 }],
    });

    render(<ComplaintsReportPage />);

    await waitFor(() => {
      expect(screen.getByText('Complaints report')).toBeInTheDocument();
      expect(screen.getByText('Broken AC')).toBeInTheDocument();
      expect(screen.getByText('High priority')).toBeInTheDocument();
      expect(screen.getByText('Ageing (non-closed)')).toBeInTheDocument();
    });

    expect(getComplaintsReport).toHaveBeenCalledWith(
      expect.objectContaining({ openOnly: true }),
    );
  });

  it('shows empty state when no rows match', async () => {
    vi.mocked(getComplaintsReport).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      summary: {
        fromDate: null,
        toDate: null,
        timezone: 'UTC',
        dateFilterApplied: false,
        totalComplaints: 0,
        openComplaints: 0,
        assignedComplaints: 0,
        inProgressComplaints: 0,
        completedComplaints: 0,
        closedComplaints: 0,
        highPriorityComplaints: 0,
      },
      breakdown: {
        byStatus: [],
        byPriority: [],
        byCategory: [],
        byDepartment: [],
        byAssignee: [],
      },
      ageing: [],
    });

    render(<ComplaintsReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/No complaints match the selected filters/i)).toBeInTheDocument();
    });
  });
});
