import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VisitorDetailPage from '@/app/(app)/visitors/[id]/page';
import { ApiError } from '@/lib/api/client';
import { renderWithAppProviders } from '@/test/render-app';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'visitor-1' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/visitors/visitors-client', () => ({
  getVisitor: vi.fn(),
  checkOutVisitor: vi.fn(),
  formatVisitorStatus: (status: string) =>
    status === 'CHECKED_IN' ? 'Checked in' : 'Checked out',
  formatDateTime: (value: string) => value,
  getVisitorStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
}));

import { checkOutVisitor, getVisitor } from '@/lib/visitors/visitors-client';

const baseVisitor = {
  id: 'visitor-1',
  visitorCode: 'VIS-000001',
  name: 'Ramesh Kumar',
  mobile: '9876543210',
  purpose: 'Meeting',
  hostStaffId: 'staff-1',
  checkInAt: '2026-09-16T10:00:00.000Z',
  checkOutAt: null,
  status: 'CHECKED_IN' as const,
  createdByUserId: 'user-1',
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z',
  hostStaff: {
    id: 'staff-1',
    employeeCode: 'EMP-1',
    firstName: 'Host',
    lastName: 'Staff',
  },
  history: [
    {
      id: 'history-1',
      eventType: 'CHECKED_IN' as const,
      comment: 'Visitor checked in',
      createdAt: '2026-09-16T10:00:00.000Z',
      actorUser: { id: 'user-1', email: 'admin@example.com' },
    },
  ],
};

describe('VisitorDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getVisitor).mockReset();
    vi.mocked(checkOutVisitor).mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows a loading state while visitor detail is fetched', () => {
    vi.mocked(getVisitor).mockReturnValue(new Promise(() => undefined));
    renderWithAppProviders(<VisitorDetailPage />);
    expect(screen.getByLabelText('Loading visitor')).toBeInTheDocument();
  });

  it('renders visitor detail and history', async () => {
    vi.mocked(getVisitor).mockResolvedValue(baseVisitor);
    renderWithAppProviders(<VisitorDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ramesh Kumar' })).toBeInTheDocument();
      expect(screen.getByText(/Visitor checked in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Check out$/i })).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(getVisitor).mockRejectedValue(new ApiError('Forbidden', 403));
    renderWithAppProviders(<VisitorDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('shows a not found state on 404 responses', async () => {
    vi.mocked(getVisitor).mockRejectedValue(new ApiError('Not found', 404));
    renderWithAppProviders(<VisitorDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Visitor not found/i)).toBeInTheDocument();
    });
  });

  it('checks out a visitor and reloads detail', async () => {
    vi.mocked(getVisitor)
      .mockResolvedValueOnce(baseVisitor)
      .mockResolvedValueOnce({
        ...baseVisitor,
        status: 'CHECKED_OUT',
        checkOutAt: '2026-09-16T11:00:00.000Z',
        history: [
          ...baseVisitor.history,
          {
            id: 'history-2',
            eventType: 'CHECKED_OUT' as const,
            comment: 'Visitor checked out',
            createdAt: '2026-09-16T11:00:00.000Z',
            actorUser: { id: 'user-1', email: 'admin@example.com' },
          },
        ],
      });
    vi.mocked(checkOutVisitor).mockResolvedValue({
      ...baseVisitor,
      status: 'CHECKED_OUT',
      checkOutAt: '2026-09-16T11:00:00.000Z',
    });

    renderWithAppProviders(<VisitorDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Check out$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Check out$/i }));

    const confirmButtons = screen.getAllByRole('button', { name: /^Check out$/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      expect(checkOutVisitor).toHaveBeenCalledWith('visitor-1');
    });
  });

  it('shows a conflict message on checkout 409 responses', async () => {
    vi.mocked(getVisitor).mockResolvedValue(baseVisitor);
    vi.mocked(checkOutVisitor).mockRejectedValue(new ApiError('Conflict', 409));

    renderWithAppProviders(<VisitorDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Check out$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Check out$/i }));

    const confirmButtons = screen.getAllByRole('button', { name: /^Check out$/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      expect(
        screen.getByText(/already checked out or checkout is no longer available/i),
      ).toBeInTheDocument();
    });
  });
});
