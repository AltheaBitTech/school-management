import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import StaffDetailPage from '@/app/(app)/staff/[id]/page';
import { ApiError } from '@/lib/api/client';
import { renderWithAppProviders } from '@/test/render-app';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'staff-1' }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/attendance/attendance-client', () => ({
  listAttendance: vi.fn().mockResolvedValue({ data: [] }),
  formatAttendanceStatus: (status: string) => status,
}));

vi.mock('@/lib/leave/leave-client', () => ({
  listLeaveBalances: vi.fn().mockResolvedValue({ data: [] }),
  listLeaveRequests: vi.fn().mockResolvedValue({ data: [] }),
  listLeaveTypes: vi.fn().mockResolvedValue({ data: [] }),
  formatLeaveStatus: (status: string) => status.replace(/_/g, ' '),
}));

vi.mock('@/lib/rbac/roles-client', () => ({
  listOrganizationRoles: vi.fn(),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  getStaff: vi.fn(),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
  getStaffInitials: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName[0] ?? ''}${staff.lastName[0] ?? ''}`.toUpperCase(),
  deactivateStaff: vi.fn(),
  provisionStaffLogin: vi.fn(),
}));

import { listOrganizationRoles } from '@/lib/rbac/roles-client';
import { getStaff, provisionStaffLogin } from '@/lib/staff/staff-client';

const baseStaff = {
  id: 'staff-1',
  organizationId: 'org-1',
  employeeCode: 'emp-001',
  userId: null,
  firstName: 'Rajesh',
  lastName: 'Kumar',
  email: 'rajesh.kumar@example.com',
  employmentStatus: 'ACTIVE' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('StaffDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getStaff).mockReset();
    vi.mocked(listOrganizationRoles).mockReset();
    vi.mocked(provisionStaffLogin).mockReset();
    vi.mocked(getStaff).mockResolvedValue(baseStaff);
    vi.mocked(listOrganizationRoles).mockResolvedValue([
      { id: 'role-1', code: 'SCHOOL_ADMIN', name: 'School Admin' },
    ]);
  });

  it('shows Send Invite when userId is null', async () => {
    renderWithAppProviders(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Rajesh Kumar')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /send invite/i })).toBeInTheDocument();
    expect(screen.getByText('Not provisioned')).toBeInTheDocument();
  });

  it('hides Send Invite when login is already linked', async () => {
    vi.mocked(getStaff).mockResolvedValue({
      ...baseStaff,
      userId: 'user-1',
    });

    renderWithAppProviders(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Linked')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /send invite/i })).not.toBeInTheDocument();
  });

  it('provisions login successfully from the dialog', async () => {
    vi.mocked(provisionStaffLogin).mockResolvedValue({
      staff: { ...baseStaff, userId: 'user-1' },
      loginEmail: 'rajesh.kumar@example.com',
      inviteUrl: 'https://app.example/reset-password?token=abc&isInvite=true',
      inviteExpiresAt: '2024-01-02T00:00:00.000Z',
    });

    renderWithAppProviders(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send invite/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /send invite/i })[0]!);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Send login invite' })).toBeInTheDocument();
    });

    expect(document.querySelector('input[type="password"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(provisionStaffLogin).toHaveBeenCalledWith('staff-1', {
        email: 'rajesh.kumar@example.com',
        roleId: 'role-1',
      });
      expect(screen.getByRole('heading', { name: /Login created for Rajesh Kumar/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://app.example/reset-password?token=abc&isInvite=true')).toBeInTheDocument();
    });
  });

  it('shows validation/error state when provisioning fails', async () => {
    vi.mocked(provisionStaffLogin).mockRejectedValue(
      new ApiError('A user with this email already exists in the organization', 409),
    );

    renderWithAppProviders(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send invite/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /send invite/i })[0]!);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Send login invite' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(
        screen.getByText('A user with this email already exists in the organization'),
      ).toBeInTheDocument();
    });
  });

  it('shows forbidden state when staff detail cannot be loaded', async () => {
    vi.mocked(getStaff).mockRejectedValue(new ApiError('Forbidden', 403));

    renderWithAppProviders(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });
  });

  it('shows role loading error state in the dialog', async () => {
    vi.mocked(listOrganizationRoles).mockRejectedValue(new ApiError('Forbidden', 403));

    renderWithAppProviders(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send invite/i })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /send invite/i })[0]!);
    });

    await waitFor(() => {
      expect(
        screen.getByText('You do not have permission to view organization roles.'),
      ).toBeInTheDocument();
    });
  });
});
