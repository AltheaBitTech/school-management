import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

const mockSession = vi.hoisted(() => ({ permissions: [] as string[] }));

vi.mock('@/components/providers/AuthSessionProvider', () => ({
  useAuthSession: () => ({
    isReady: true,
    isAuthenticated: true,
    user: {
      id: 'user-1',
      email: 'admin@school.edu',
      organizationId: 'org-1',
      permissions: mockSession.permissions.length > 0 ? mockSession.permissions : adminPermissions,
      organization: { id: 'org-1', name: 'Demo School', code: 'demo', status: 'ACTIVE' },
    },
    signOut: vi.fn(),
  }),
  useOptionalAuthSession: () => null,
}));

function renderShell(permissions: string[] = []) {
  mockSession.permissions = permissions;
  return render(
    <AppShell>
      <div>Page content</div>
    </AppShell>,
  );
}

function navLinks(name: string) {
  return screen.queryAllByRole('link', { name });
}

const defaultStudentPermissions = [
  'student.self.view',
  'student.self.fee.view',
  'student.self.fee.receipt.download',
  'student.self.certificate.download',
  'notice.view',
  'event.view',
  'student.self.transport.view',
];

describe('AppShell', () => {
  afterEach(() => {
    cleanup();
    mockSession.permissions = [];
  });


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
    expect(screen.getAllByText('Operations').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Sign out' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');
    expect(screen.queryByRole('link', { name: 'Attendance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance reports' })).not.toBeInTheDocument();
  });

  it('shows features granted to the student role beyond the fixed portal menu', () => {
    renderShell([...defaultStudentPermissions, 'complaint.view']);

    expect(navLinks('My Profile').length).toBeGreaterThan(0);
    expect(navLinks('Complaints')[0]).toHaveAttribute('href', '/complaints');
    expect(screen.getAllByText('More').length).toBeGreaterThan(0);
  });

  it('keeps the default student menu unchanged', () => {
    renderShell(defaultStudentPermissions);

    expect(screen.queryByText('More')).not.toBeInTheDocument();
    expect(navLinks('Notices')).toHaveLength(1);
  });

  it('does not duplicate portal entries when extra features are granted', () => {
    renderShell([...defaultStudentPermissions, 'complaint.view']);

    expect(navLinks('Notices')).toHaveLength(1);
    expect(navLinks('Events')).toHaveLength(1);
  });

  it('shows features granted to the parent role', () => {
    renderShell(['parent.portal.view', 'notice.view', 'document.view']);

    expect(navLinks('My children').length).toBeGreaterThan(0);
    expect(navLinks('Documents')[0]).toHaveAttribute('href', '/documents');
  });

  it('does not duplicate staff self-service items in the extra group', () => {
    renderShell(['staff.self.view', 'staff.self.leave.view', 'complaint.view', 'notice.view', 'asset.view']);

    expect(navLinks('My dashboard').length).toBeGreaterThan(0);
    expect(navLinks('Assets')[0]).toHaveAttribute('href', '/assets');
    expect(navLinks('Complaints')).toHaveLength(1);
    expect(navLinks('Notices')).toHaveLength(1);
  });
});
