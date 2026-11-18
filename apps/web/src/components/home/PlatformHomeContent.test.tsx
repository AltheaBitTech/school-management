import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PlatformHomeContent } from '@/components/home/PlatformHomeContent';
import { ApiError } from '@/lib/api/client';
import type { PlatformAnalytics } from '@/lib/platform/platform-client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/platform/platform-client', () => ({
  getPlatformAnalytics: vi.fn(),
}));

import { getPlatformAnalytics } from '@/lib/platform/platform-client';

const PERMISSIONS = ['platform.organization.view'];

function buildAnalytics(overrides: Partial<PlatformAnalytics> = {}): PlatformAnalytics {
  return {
    organizationsByStatus: { ACTIVE: 7, SUSPENDED: 2 },
    subscriptionsByPlan: { TRIAL: 5, STANDARD: 4 },
    pendingRegistrations: 3,
    totalStudents: 1250,
    totalStaff: 140,
    newOrganizationsLast30Days: 4,
    trialsEndingSoon: 1,
    recentOrganizations: [
      {
        id: 'org-1',
        name: 'Green Valley School',
        code: 'green-valley',
        status: 'ACTIVE',
        createdAt: '2026-11-10T00:00:00.000Z',
        planCode: 'TRIAL',
        planName: 'Trial',
        subscriptionStatus: 'TRIAL',
      },
    ],
    ...overrides,
  };
}

describe('PlatformHomeContent', () => {
  beforeEach(() => {
    vi.mocked(getPlatformAnalytics).mockReset();
  });

  it('shows live platform metrics and recent schools', async () => {
    vi.mocked(getPlatformAnalytics).mockResolvedValue(buildAnalytics());

    render(<PlatformHomeContent userEmail="admin@campusops.test" permissions={PERMISSIONS} />);

    expect(await screen.findByText('Active schools')).toBeInTheDocument();
    expect(screen.getByText('9 total')).toBeInTheDocument();
    expect(screen.getByText('Pending registrations', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('Green Valley School')).toBeInTheDocument();
    expect(screen.getByText('Institutions by plan')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.queryByText('org-1')).not.toBeInTheDocument();
  });

  it('shows an empty message when no schools have joined', async () => {
    vi.mocked(getPlatformAnalytics).mockResolvedValue(
      buildAnalytics({ recentOrganizations: [], subscriptionsByPlan: {}, organizationsByStatus: {} }),
    );

    render(<PlatformHomeContent userEmail="admin@campusops.test" permissions={PERMISSIONS} />);

    expect(await screen.findByText(/No schools have joined yet/)).toBeInTheDocument();
    expect(screen.getByText('No subscriptions yet.')).toBeInTheDocument();
  });

  it('shows an error with retry when metrics fail to load', async () => {
    vi.mocked(getPlatformAnalytics)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(buildAnalytics());

    render(<PlatformHomeContent userEmail="admin@campusops.test" permissions={PERMISSIONS} />);

    expect(await screen.findByText(/Could not load platform metrics/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Active schools')).toBeInTheDocument());
    expect(getPlatformAnalytics).toHaveBeenCalledTimes(2);
  });

  it('shows a permission message on 403', async () => {
    vi.mocked(getPlatformAnalytics).mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));

    render(<PlatformHomeContent userEmail="admin@campusops.test" permissions={PERMISSIONS} />);

    expect(await screen.findByText('Access denied')).toBeInTheDocument();
  });

  it('does not fetch metrics without the view permission', () => {
    render(<PlatformHomeContent userEmail="admin@campusops.test" permissions={[]} />);

    expect(getPlatformAnalytics).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Create institution' })).toHaveAttribute('href', '/organizations/new');
  });
});
