import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LeavePage from '@/app/(app)/leave/page';
import { ApiError } from '@/lib/api/client';

vi.mock('@/components/providers/AuthSessionProvider', () => ({
  useAuthSession: () => ({
    user: {
      id: 'admin-1',
      permissions: ['leave.view', 'leave.create'],
      role: { code: 'SCHOOL_ADMIN', name: 'School Admin' },
    },
  }),
  useOptionalAuthSession: () => null,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/leave/leave-client', () => ({
  listLeaveRequests: vi.fn(),
  approveLeaveRequest: vi.fn(),
  rejectLeaveRequest: vi.fn(),
  formatLeaveStatus: (status: string) => status.replace(/_/g, ' '),
  getStaffDisplayNameFromLeave: (staff?: { firstName: string; lastName: string }) =>
    staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown staff',
}));

import { listLeaveRequests } from '@/lib/leave/leave-client';

describe('LeavePage', () => {
  beforeEach(() => {
    vi.mocked(listLeaveRequests).mockReset();
  });

  it('shows a loading state while leave requests are being fetched', () => {
    vi.mocked(listLeaveRequests).mockReturnValue(new Promise(() => undefined));
    render(<LeavePage />);
    expect(screen.getByLabelText('Loading leave requests')).toBeInTheDocument();
  });

  it('renders pending leave requests', async () => {
    vi.mocked(listLeaveRequests).mockResolvedValue({
      data: [
        {
          id: 'req-1',
          organizationId: 'org-1',
          staffId: 'staff-1',
          leaveTypeId: 'type-1',
          startDate: '2026-09-01',
          endDate: '2026-09-02',
          duration: 2,
          status: 'PENDING_APPROVAL',
          submittedAt: '2026-08-20T00:00:00.000Z',
          createdAt: '2026-08-20T00:00:00.000Z',
          updatedAt: '2026-08-20T00:00:00.000Z',
          staff: {
            id: 'staff-1',
            employeeCode: 'emp-001',
            firstName: 'Anita',
            lastName: 'Desai',
          },
          leaveType: { id: 'type-1', name: 'Casual Leave', code: 'casual' },
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });

    render(<LeavePage />);

    await waitFor(() => {
      expect(screen.getByText('Anita Desai')).toBeInTheDocument();
      expect(screen.getByText('Awaiting Principal')).toBeInTheDocument();
    });
  });

  it('shows an empty state when no leave requests are returned', async () => {
    vi.mocked(listLeaveRequests).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
    });

    render(<LeavePage />);

    await waitFor(() => {
      expect(screen.getByText(/No leave requests found/i)).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listLeaveRequests).mockRejectedValue(new ApiError('Forbidden', 403));
    render(<LeavePage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
