import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/layout/AppShell';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/staff',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/notifications/NotificationMenu', () => ({
  NotificationMenu: () => <button type="button">Notifications</button>,
}));

const adminPermissions = [
  'dashboard.view',
  'staff.view',
  'student.view',
  'department.view',
  'leave.view',
  'approval.view',
  'complaint.view',
  'visitor.view',
  'notice.view',
  'event.view',
  'asset.view',
  'fee.view',
  'document.view',
  'report.attendance.view',
];

vi.mock('@/components/providers/AuthSessionProvider', () => ({
  useAuthSession: () => ({
    isReady: true,
    isAuthenticated: true,
    user: {
      id: 'user-1',
      email: 'admin@school.edu',
      organizationId: 'org-1',
      permissions: adminPermissions,
      organization: { id: 'org-1', name: 'Demo School', code: 'demo', status: 'ACTIVE' },
    },
    signOut: vi.fn(),
  }),
}));

describe('AppShell', () => {
  it('shows grouped navigation, the active module, and the authenticated user', () => {
    render(
      <AppShell>
        <div>Page content</div>
      </AppShell>,
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.getAllByText('Staff').length).toBeGreaterThan(0);
    expect(screen.getAllByText('People').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Workflows').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0);
    expect(screen.getAllByText('School operations').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Sign out' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');
    expect(screen.queryByRole('link', { name: 'Attendance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance reports' })).not.toBeInTheDocument();
  });
});
