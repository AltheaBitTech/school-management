import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NoticesPage from '@/app/(app)/notices/page';
import { AuthSessionOverride } from '@/components/providers/AuthSessionProvider';
import { ApiError } from '@/lib/api/client';
import type { AuthUser } from '@/lib/auth/auth-client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/notices/notices-client', () => ({
  listNotices: vi.fn(),
  formatNoticeStatus: (status: string) => status.charAt(0) + status.slice(1).toLowerCase(),
  NOTICE_STATUSES: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'],
}));

import { listNotices } from '@/lib/notices/notices-client';

describe('NoticesPage', () => {
  beforeEach(() => {
    vi.mocked(listNotices).mockReset();
  });

  it('shows a loading state while notices are being fetched', () => {
    vi.mocked(listNotices).mockReturnValue(new Promise(() => undefined));
    render(<NoticesPage />);
    expect(screen.getByLabelText('Loading notices')).toBeInTheDocument();
  });

  it('renders notice rows', async () => {
    vi.mocked(listNotices).mockResolvedValue({
      data: [
        {
          id: 'notice-1',
          title: 'Parent meeting',
          content: 'Meeting on Friday.',
          status: 'PUBLISHED',
          createdByUserId: 'user-1',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
          publishedAt: '2026-09-01T10:00:00.000Z',
          audiences: [{ id: 'aud-1', audienceType: 'ENTIRE_ORGANIZATION' }],
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });

    render(<NoticesPage />);

    await waitFor(() => {
      expect(screen.getByText('Parent meeting')).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'Published' })).toBeInTheDocument();
    });
  });

  it('shows an empty state when no notices are returned', async () => {
    vi.mocked(listNotices).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
    });

    render(<NoticesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No notices found/i)).toBeInTheDocument();
    });
  });

  it('hides New notice when the active role cannot publish', async () => {
    vi.mocked(listNotices).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
    });
    const teacher: AuthUser = {
      id: 'teacher-1',
      email: 'teacher@school.example',
      organizationId: 'org-1',
      permissions: ['notice.view', 'event.view', 'complaint.create'],
      role: { name: 'Teacher', code: 'TEACHER' },
    };

    render(
      <AuthSessionOverride user={teacher}>
        <NoticesPage />
      </AuthSessionOverride>,
    );

    await waitFor(() => {
      expect(screen.getByText(/not part of this role/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'New notice' })).not.toBeInTheDocument();
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listNotices).mockRejectedValue(new ApiError('Forbidden', 403));
    render(<NoticesPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
