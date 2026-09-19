import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import StaffDetailPage from '@/app/(app)/staff/[id]/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'staff-1' }),
}));

vi.mock('@/lib/attendance/attendance-client', () => ({
  listAttendance: vi.fn().mockResolvedValue({ data: [] }),
  formatAttendanceStatus: (status: string) => status,
}));

vi.mock('@/lib/rbac/roles-client', () => ({
  listOrganizationRoles: vi.fn(),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  getStaff: vi.fn(),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
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

  it('shows Create Login when userId is null', async () => {
    render(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Rajesh Kumar')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Create Login' })).toBeInTheDocument();
    expect(screen.getByText('Not provisioned')).toBeInTheDocument();
  });

  it('hides Create Login when login is already linked', async () => {
    vi.mocked(getStaff).mockResolvedValue({
      ...baseStaff,
      userId: 'user-1',
    });

    render(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Linked')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Create Login' })).not.toBeInTheDocument();
  });

  it('provisions login successfully from the dialog', async () => {
    vi.mocked(provisionStaffLogin).mockResolvedValue({
      staff: { ...baseStaff, userId: 'user-1' },
      loginEmail: 'rajesh.kumar@example.com',
    });

    render(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Login' })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Create Login' })[0]!);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Login' })).toBeInTheDocument();
    });

    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeTruthy();
    fireEvent.change(passwordInput!, { target: { value: 'TemporaryPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Login' }));

    await waitFor(() => {
      expect(provisionStaffLogin).toHaveBeenCalledWith('staff-1', {
        email: 'rajesh.kumar@example.com',
        password: 'TemporaryPass123!',
        roleId: 'role-1',
      });
      expect(screen.getByText(/Login account created for rajesh.kumar@example.com/i)).toBeInTheDocument();
    });
  });

  it('shows validation/error state when provisioning fails', async () => {
    vi.mocked(provisionStaffLogin).mockRejectedValue(
      new ApiError('A user with this email already exists in the organization', 409),
    );

    render(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Login' })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Create Login' })[0]!);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Login' })).toBeInTheDocument();
    });

    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeTruthy();
    fireEvent.change(passwordInput!, { target: { value: 'TemporaryPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Login' }));

    await waitFor(() => {
      expect(
        screen.getByText('A user with this email already exists in the organization'),
      ).toBeInTheDocument();
    });
  });

  it('shows forbidden state when staff detail cannot be loaded', async () => {
    vi.mocked(getStaff).mockRejectedValue(new ApiError('Forbidden', 403));

    render(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });
  });

  it('shows role loading error state in the dialog', async () => {
    vi.mocked(listOrganizationRoles).mockRejectedValue(new ApiError('Forbidden', 403));

    render(<StaffDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Login' })).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Create Login' })[0]!);
    });

    await waitFor(() => {
      expect(
        screen.getByText('You do not have permission to view organization roles.'),
      ).toBeInTheDocument();
    });
  });
});
