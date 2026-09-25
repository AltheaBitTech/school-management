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

vi.mock('@/lib/dashboard/dashboard-client', () => ({
  getDashboardSummary: vi.fn(),
  getGreetingLabel: (period: string) =>
    period === 'morning' ? 'Good morning' : period === 'afternoon' ? 'Good afternoon' : 'Good evening',
  formatDashboardDate: () => 'Thursday, September 25, 2026',
}));

import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import { getDashboardSummary } from '@/lib/dashboard/dashboard-client';

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(useAuthSession).mockReset();
    vi.mocked(getDashboardSummary).mockReset();
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
    expect(getDashboardSummary).not.toHaveBeenCalled();
  });

  it('renders dashboard summary metrics for an authenticated user', async () => {
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
    vi.mocked(getDashboardSummary).mockResolvedValue({
      organization: {
        id: 'org-1',
        name: 'Demo School',
        code: 'demo',
        timezone: 'UTC',
      },
      generatedAt: '2026-09-25T12:00:00.000Z',
      localDate: '2026-09-25',
      greetingPeriod: 'afternoon',
      metrics: {
        students: 40,
        activeStaff: 12,
        todayAttendance: {
          date: '2026-09-25',
          activeStaff: 12,
          marked: 10,
          present: 8,
          absent: 2,
          unmarked: 2,
        },
        outstandingFees: {
          totalOutstanding: 60,
          feeCount: 1,
        },
        pendingLeave: 3,
        pendingApprovals: 1,
        openComplaints: 2,
        visitorsToday: {
          checkedInToday: 4,
          activeOnCampus: 2,
        },
        upcomingEvents: [],
        recentNotices: [],
        unreadNotifications: 0,
      },
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Good afternoon')).toBeInTheDocument();
      expect(screen.getByText('Demo School')).toBeInTheDocument();
      expect(screen.getByText('40')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('₹60.00')).toBeInTheDocument();
      expect(screen.getByText('Pending leave')).toBeInTheDocument();
      expect(screen.getByText('3 requiring attention')).toBeInTheDocument();
    });
  });

  it('shows an error state when dashboard summary fails', async () => {
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
    vi.mocked(getDashboardSummary).mockRejectedValue(new Error('Dashboard unavailable'));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard unavailable')).toBeInTheDocument();
    });
  });
});
