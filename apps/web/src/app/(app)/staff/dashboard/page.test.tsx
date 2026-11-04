import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StaffDashboardPage from './page';
import * as staffSelfClient from '@/lib/staff-self/staff-self-client';
import {
  resetFeatureFlagsCacheForTests,
  setFeatureFlagsFromSession,
} from '@/lib/features/feature-flags';

vi.mock('@/lib/staff-self/staff-self-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/staff-self/staff-self-client')>();
  return {
    ...actual,
    getStaffSelfDashboard: vi.fn(),
  };
});

describe('StaffDashboardPage', () => {
  it('renders dashboard summary for staff user', async () => {
    vi.spyOn(staffSelfClient, 'getStaffSelfDashboard').mockResolvedValue({
      staff: {
        id: 'staff-1',
        employeeCode: 'E1',
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: null,
        departmentName: 'Science',
      },
      localDate: '2026-09-26',
      todayAttendance: { date: '2026-09-26', status: 'PRESENT', checkInAt: null, checkOutAt: null },
      leaveBalances: [],
      pendingLeaveRequestCount: 1,
      recentLeaveRequests: [],
      unreadNotificationCount: 0,
    });

    render(<StaffDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/My dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Welcome back, Jane Doe/i)).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('hides attendance summary when attendance feature is disabled', async () => {
    setFeatureFlagsFromSession({ attendanceEnabled: false });
    vi.spyOn(staffSelfClient, 'getStaffSelfDashboard').mockResolvedValue({
      staff: {
        id: 'staff-1',
        employeeCode: 'E1',
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: null,
        departmentName: 'Science',
      },
      localDate: '2026-09-26',
      leaveBalances: [],
      pendingLeaveRequestCount: 1,
      recentLeaveRequests: [],
      unreadNotificationCount: 0,
    });

    render(<StaffDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/My dashboard/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Today's attendance/i)).not.toBeInTheDocument();
    resetFeatureFlagsCacheForTests();
  });

  it('shows attendance summary when feature is enabled and dashboard includes todayAttendance', async () => {
    setFeatureFlagsFromSession({ attendanceEnabled: true });
    vi.spyOn(staffSelfClient, 'getStaffSelfDashboard').mockResolvedValue({
      staff: {
        id: 'staff-1',
        employeeCode: 'E1',
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: null,
        departmentName: 'Science',
      },
      localDate: '2026-09-26',
      todayAttendance: { date: '2026-09-26', status: 'PRESENT', checkInAt: null, checkOutAt: null },
      leaveBalances: [],
      pendingLeaveRequestCount: 1,
      recentLeaveRequests: [],
      unreadNotificationCount: 0,
    });

    render(<StaffDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Today's attendance/i)).toBeInTheDocument();
    });
    resetFeatureFlagsCacheForTests();
  });
});
