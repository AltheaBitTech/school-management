import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HomePage from '@/app/(app)/page';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/providers/AuthSessionProvider', () => ({
  useAuthSession: vi.fn(),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn(),
}));
vi.mock('@/lib/students/students-client', () => ({
  listStudents: vi.fn(),
}));
vi.mock('@/lib/complaints/complaints-client', () => ({
  listComplaints: vi.fn(),
}));
vi.mock('@/lib/visitors/visitors-client', () => ({
  listVisitors: vi.fn(),
}));
vi.mock('@/lib/events/events-client', () => ({
  listEvents: vi.fn(),
}));
vi.mock('@/lib/fees/fees-client', () => ({
  listStudentFees: vi.fn(),
  formatCurrency: (value: number) => `₹${value.toFixed(2)}`,
}));
vi.mock('@/lib/leave/leave-client', () => ({
  listLeaveRequests: vi.fn(),
}));
vi.mock('@/lib/approvals/approvals-client', () => ({
  listApprovalRequests: vi.fn(),
}));
vi.mock('@/lib/notifications/notifications-client', () => ({
  listNotifications: vi.fn(),
  countUnreadNotifications: () => 0,
}));

import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import { listStaff } from '@/lib/staff/staff-client';
import { listStudents } from '@/lib/students/students-client';
import { listComplaints } from '@/lib/complaints/complaints-client';
import { listVisitors } from '@/lib/visitors/visitors-client';
import { listEvents } from '@/lib/events/events-client';
import { listStudentFees } from '@/lib/fees/fees-client';
import { listLeaveRequests } from '@/lib/leave/leave-client';
import { listApprovalRequests } from '@/lib/approvals/approvals-client';
import { listNotifications } from '@/lib/notifications/notifications-client';

const emptyPage = { data: [], meta: { page: 1, pageSize: 1, total: 0, totalPages: 0 } };

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(useAuthSession).mockReset();
    vi.mocked(listStaff).mockReset();
    vi.mocked(listStudents).mockReset();
    vi.mocked(listComplaints).mockReset();
    vi.mocked(listVisitors).mockReset();
    vi.mocked(listEvents).mockReset();
    vi.mocked(listStudentFees).mockReset();
    vi.mocked(listLeaveRequests).mockReset();
    vi.mocked(listApprovalRequests).mockReset();
    vi.mocked(listNotifications).mockReset();
  });

  it('shows a landing page when the user is not authenticated', async () => {
    vi.mocked(useAuthSession).mockReturnValue({
      isReady: true,
      isAuthenticated: false,
      user: null,
      signOut: vi.fn(),
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Register School' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument();
    });
    expect(listStaff).not.toHaveBeenCalled();
  });

  it('renders real module counts for an authenticated user', async () => {
    vi.mocked(useAuthSession).mockReturnValue({
      isReady: true,
      isAuthenticated: true,
      user: {
        id: 'user-1',
        email: 'admin@school.edu',
        organizationId: 'org-1',
        organization: { id: 'org-1', name: 'Demo School', code: 'demo', status: 'ACTIVE' },
      },
      signOut: vi.fn(),
    });
    vi.mocked(listStaff).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 1, total: 12, totalPages: 12 },
    });
    vi.mocked(listStudents).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 1, total: 40, totalPages: 40 },
    });
    vi.mocked(listComplaints).mockResolvedValue(emptyPage);
    vi.mocked(listVisitors).mockResolvedValue(emptyPage);
    vi.mocked(listEvents).mockResolvedValue(emptyPage);
    vi.mocked(listStudentFees).mockResolvedValue({
      data: [
        {
          id: 'fee-1',
          studentId: 'student-1',
          feeStructureId: 'structure-1',
          assignedAmount: 100,
          paidAmount: 40,
          outstandingAmount: 60,
          status: 'PARTIALLY_PAID',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    vi.mocked(listLeaveRequests).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 1, total: 3, totalPages: 3 },
    });
    vi.mocked(listApprovalRequests).mockResolvedValue(emptyPage);
    vi.mocked(listNotifications).mockResolvedValue(emptyPage);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
      expect(screen.getByText('₹60.00')).toBeInTheDocument();
      expect(screen.getByText('3 pending approval')).toBeInTheDocument();
    });
  });
});
