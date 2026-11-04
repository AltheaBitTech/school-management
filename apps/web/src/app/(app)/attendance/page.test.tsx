import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithAppProviders } from '@/test/render-app';
import AttendancePage from '@/app/(app)/attendance/page';
import { ApiError } from '@/lib/api/client';

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn(),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
}));

vi.mock('@/lib/departments/departments-client', () => ({
  listDepartments: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } }),
}));

vi.mock('@/lib/attendance/attendance-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/attendance/attendance-client')>(
    '@/lib/attendance/attendance-client',
  );

  return {
    ...actual,
    listAttendance: vi.fn(),
    saveAttendanceForStaff: vi.fn(),
  };
});

import { listStaff } from '@/lib/staff/staff-client';
import { listAttendance } from '@/lib/attendance/attendance-client';
import {
  isAttendanceEnabled,
  resetFeatureFlagsCacheForTests,
  setFeatureFlagsFromSession,
} from '@/lib/features/feature-flags';

describe('AttendancePage', () => {
  it('shows a disabled notice when attendance is turned off', () => {
    setFeatureFlagsFromSession({ attendanceEnabled: false });
    renderWithAppProviders(<AttendancePage />);
    expect(screen.getByText(/Attendance is turned off/i)).toBeInTheDocument();
    resetFeatureFlagsCacheForTests();
    expect(isAttendanceEnabled()).toBe(true);
  });

  it('shows a loading state while attendance is being fetched', () => {
    vi.mocked(listStaff).mockReturnValue(new Promise(() => undefined));
    vi.mocked(listAttendance).mockReturnValue(new Promise(() => undefined));

    renderWithAppProviders(<AttendancePage />);

    expect(screen.getByLabelText('Loading attendance')).toBeInTheDocument();
  });

  it('renders staff rows for daily attendance', async () => {
    vi.mocked(listStaff).mockResolvedValue({
      data: [
        {
          id: 'staff-1',
          organizationId: 'org-1',
          employeeCode: 'emp-001',
          firstName: 'Anita',
          lastName: 'Desai',
          employmentStatus: 'ACTIVE',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
    vi.mocked(listAttendance).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    });

    renderWithAppProviders(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('Anita Desai')).toBeInTheDocument();
    });
  });

  it('shows an empty state when no active staff are available', async () => {
    vi.mocked(listStaff).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    });
    vi.mocked(listAttendance).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    });

    renderWithAppProviders(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText(/No active staff members found/i)).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listStaff).mockRejectedValue(new ApiError('Forbidden', 403));

    renderWithAppProviders(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
