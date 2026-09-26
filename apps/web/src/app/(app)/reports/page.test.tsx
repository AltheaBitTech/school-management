import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReportsHubPage from '@/app/(app)/reports/page';

const useAuthSessionMock = vi.fn();

vi.mock('@/components/providers/AuthSessionProvider', () => ({
  useAuthSession: () => useAuthSessionMock(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ReportsHubPage', () => {
  beforeEach(() => {
    useAuthSessionMock.mockReturnValue({
      isReady: true,
      user: {
        permissions: [
          'report.attendance.view',
          'report.leave.view',
          'report.fees.view',
          'report.complaints.view',
        ],
      },
    });
  });

  it('renders grouped report cards with correct links', () => {
    render(<ReportsHubPage />);

    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.queryByText('Events & campus')).not.toBeInTheDocument();

    const openLinks = screen.getAllByRole('link', { name: 'Open report' });
    expect(openLinks).toHaveLength(4);
    expect(openLinks.map((link) => link.getAttribute('href'))).toEqual(
      expect.arrayContaining([
        '/reports/attendance',
        '/reports/leave',
        '/reports/complaints',
        '/reports/fees',
      ]),
    );
    expect(openLinks.some((link) => link.getAttribute('href') === '/reports/visitors')).toBe(
      false,
    );
  });

  it('hides unauthorized reports', () => {
    useAuthSessionMock.mockReturnValue({
      isReady: true,
      user: { permissions: ['report.visitors.view'] },
    });

    render(<ReportsHubPage />);

    expect(screen.getByText('Visitors')).toBeInTheDocument();
    expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open report' }).getAttribute('href'),
    ).toBe('/reports/visitors');
  });

  it('shows empty state when the user has no report permissions', () => {
    useAuthSessionMock.mockReturnValue({
      isReady: true,
      user: { permissions: ['staff.self.view'] },
    });

    render(<ReportsHubPage />);

    expect(screen.getByText(/No reports are available for your account/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open report' })).not.toBeInTheDocument();
  });
});
