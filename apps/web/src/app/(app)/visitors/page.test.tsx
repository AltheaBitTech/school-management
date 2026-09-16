import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VisitorsPage from '@/app/(app)/visitors/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/visitors/visitors-client', () => ({
  listVisitors: vi.fn(),
  formatVisitorStatus: (status: string) =>
    status === 'CHECKED_IN' ? 'Checked in' : 'Checked out',
  formatDateTime: (value: string) => value,
  getVisitorStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
  VISITOR_STATUSES: ['CHECKED_IN', 'CHECKED_OUT'],
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn().mockResolvedValue({
    data: [{ id: 'staff-1', firstName: 'Host', lastName: 'Staff', employmentStatus: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
}));

import { listVisitors } from '@/lib/visitors/visitors-client';

describe('VisitorsPage', () => {
  beforeEach(() => {
    vi.mocked(listVisitors).mockReset();
  });

  it('shows a loading state while visitors are being fetched', () => {
    vi.mocked(listVisitors).mockReturnValue(new Promise(() => undefined));
    render(<VisitorsPage />);
    expect(screen.getByLabelText('Loading visitors')).toBeInTheDocument();
  });

  it('renders visitor rows', async () => {
    vi.mocked(listVisitors).mockResolvedValue({
      data: [
        {
          id: 'visitor-1',
          visitorCode: 'VIS-000001',
          name: 'Ramesh Kumar',
          mobile: '9876543210',
          purpose: 'Meeting',
          hostStaffId: 'staff-1',
          checkInAt: '2026-09-16T10:00:00.000Z',
          checkOutAt: null,
          status: 'CHECKED_IN',
          createdByUserId: 'user-1',
          createdAt: '2026-09-16T10:00:00.000Z',
          updatedAt: '2026-09-16T10:00:00.000Z',
          hostStaff: {
            id: 'staff-1',
            employeeCode: 'EMP-1',
            firstName: 'Host',
            lastName: 'Staff',
          },
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });

    render(<VisitorsPage />);

    await waitFor(() => {
      expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
      expect(screen.getByText('VIS-000001')).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'Checked in' })).toBeInTheDocument();
    });
  });

  it('shows an empty state when no visitors are returned', async () => {
    vi.mocked(listVisitors).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
    });

    render(<VisitorsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No visitors found/i)).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listVisitors).mockRejectedValue(new ApiError('Forbidden', 403));
    render(<VisitorsPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
