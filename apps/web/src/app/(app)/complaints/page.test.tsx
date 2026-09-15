import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ComplaintsPage from '@/app/(app)/complaints/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/complaints/complaints-client', () => ({
  listComplaints: vi.fn(),
  formatComplaintStatus: (status: string) => status.replace(/_/g, ' '),
  formatComplaintCategory: (category: string) => category,
  formatComplaintPriority: (priority: string) => priority,
  getStaffDisplayName: (staff?: { firstName: string; lastName: string }) =>
    staff ? `${staff.firstName} ${staff.lastName}` : 'Unassigned',
  COMPLAINT_STATUSES: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'],
  COMPLAINT_PRIORITIES: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } }),
}));

import { listComplaints } from '@/lib/complaints/complaints-client';

describe('ComplaintsPage', () => {
  beforeEach(() => {
    vi.mocked(listComplaints).mockReset();
  });

  it('shows a loading state while complaints are being fetched', () => {
    vi.mocked(listComplaints).mockReturnValue(new Promise(() => undefined));
    render(<ComplaintsPage />);
    expect(screen.getByLabelText('Loading complaints')).toBeInTheDocument();
  });

  it('renders complaint rows', async () => {
    vi.mocked(listComplaints).mockResolvedValue({
      data: [
        {
          id: 'cmp-1',
          organizationId: 'org-1',
          complaintCode: 'cmp-000001',
          title: 'Broken projector',
          description: 'Projector does not turn on.',
          category: 'IT',
          priority: 'HIGH',
          status: 'OPEN',
          createdByUserId: 'user-1',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });

    render(<ComplaintsPage />);

    await waitFor(() => {
      expect(screen.getByText('Broken projector')).toBeInTheDocument();
      expect(screen.getByText('cmp-000001')).toBeInTheDocument();
    });
  });

  it('shows an empty state when no complaints are returned', async () => {
    vi.mocked(listComplaints).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
    });

    render(<ComplaintsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No complaints found/i)).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listComplaints).mockRejectedValue(new ApiError('Forbidden', 403));
    render(<ComplaintsPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
