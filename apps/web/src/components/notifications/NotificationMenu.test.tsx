import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationMenu } from '@/components/notifications/NotificationMenu';
import { ApiError } from '@/lib/api/client';

vi.mock('@/lib/auth/session', () => ({
  getAccessToken: vi.fn(),
}));

vi.mock('@/lib/notifications/notifications-client', () => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  formatNotificationCreatedAt: (createdAt: string) => `Formatted ${createdAt}`,
  countUnreadNotifications: (notifications: Array<{ readAt?: string | null }>) =>
    notifications.filter((notification) => !notification.readAt).length,
  formatUnreadBadgeCount: (unreadCount: number) => (unreadCount > 9 ? '9+' : String(unreadCount)),
}));

import { getAccessToken } from '@/lib/auth/session';
import { listNotifications, markNotificationRead } from '@/lib/notifications/notifications-client';

const unreadNotification = {
  id: 'notification-1',
  channel: 'IN_APP' as const,
  eventKey: 'leave.approved' as const,
  title: 'Leave request approved',
  body: 'Your Casual Leave request has been approved.',
  status: 'SENT' as const,
  readAt: null,
  metadata: null,
  requestId: 'req-1',
  createdAt: '2026-09-19T08:00:00.000Z',
};

const readNotification = {
  ...unreadNotification,
  id: 'notification-2',
  title: 'Leave request rejected',
  eventKey: 'leave.rejected' as const,
  body: 'Your Casual Leave request has been rejected.',
  readAt: '2026-09-19T09:00:00.000Z',
};

function openNotificationMenu(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
}

describe('NotificationMenu', () => {
  beforeEach(() => {
    vi.mocked(getAccessToken).mockReset();
    vi.mocked(listNotifications).mockReset();
    vi.mocked(markNotificationRead).mockReset();
    vi.mocked(getAccessToken).mockReturnValue('access-token');
  });

  it('does not render when there is no access token', () => {
    vi.mocked(getAccessToken).mockReturnValue(null);

    render(<NotificationMenu />);

    expect(screen.queryByRole('button', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(listNotifications).not.toHaveBeenCalled();
  });

  it('shows a loading state while notifications are being fetched', async () => {
    vi.mocked(listNotifications).mockReturnValue(new Promise(() => undefined));

    render(<NotificationMenu />);
    openNotificationMenu();

    expect(await screen.findByLabelText('Loading notifications')).toBeInTheDocument();
  });

  it('shows an empty state when there are no notifications', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    render(<NotificationMenu />);
    openNotificationMenu();

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  it('renders notifications in the popover', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      data: [unreadNotification, readNotification],
      meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    });

    render(<NotificationMenu />);
    openNotificationMenu();

    await waitFor(() => {
      expect(screen.getByText('Leave request approved')).toBeInTheDocument();
      expect(screen.getByText('Leave request rejected')).toBeInTheDocument();
      expect(
        screen.getByText('Your Casual Leave request has been approved.'),
      ).toBeInTheDocument();
    });
  });

  it('shows unread badge count for unread notifications only', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      data: [unreadNotification, readNotification],
      meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    });

    render(<NotificationMenu />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('does not count read notifications in the unread badge', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      data: [readNotification],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    render(<NotificationMenu />);

    await waitFor(() => {
      expect(listNotifications).toHaveBeenCalled();
    });

    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('calls mark-read when an unread notification is clicked', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      data: [unreadNotification],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    vi.mocked(markNotificationRead).mockResolvedValue({
      ...unreadNotification,
      readAt: '2026-09-19T10:00:00.000Z',
    });

    render(<NotificationMenu />);
    openNotificationMenu();

    await waitFor(() => {
      expect(screen.getByText('Leave request approved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Leave request approved'));

    await waitFor(() => {
      expect(markNotificationRead).toHaveBeenCalledWith('notification-1');
    });
  });

  it('updates unread badge after a successful mark-read', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      data: [unreadNotification],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    vi.mocked(markNotificationRead).mockResolvedValue({
      ...unreadNotification,
      readAt: '2026-09-19T10:00:00.000Z',
    });

    render(<NotificationMenu />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    openNotificationMenu();

    await waitFor(() => {
      expect(screen.getByText('Leave request approved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Leave request approved'));

    await waitFor(() => {
      const badge = screen
        .getByRole('button', { name: 'Notifications', hidden: true })
        .querySelector('.MuiBadge-badge');
      expect(badge).toHaveClass('MuiBadge-invisible');
    });
  });

  it('keeps notification unread when mark-read fails', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      data: [unreadNotification],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    vi.mocked(markNotificationRead).mockRejectedValue(new ApiError('Failed to mark read', 500));

    render(<NotificationMenu />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    openNotificationMenu();

    await waitFor(() => {
      expect(screen.getByText('Leave request approved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Leave request approved'));

    await waitFor(() => {
      expect(screen.getByText('Failed to mark read')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('does not call mark-read for already-read notifications', async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      data: [readNotification],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    render(<NotificationMenu />);
    openNotificationMenu();

    await waitFor(() => {
      expect(screen.getByText('Leave request rejected')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Leave request rejected'));

    expect(markNotificationRead).not.toHaveBeenCalled();
  });
});
