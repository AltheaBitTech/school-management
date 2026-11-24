import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AttendanceReportPage from '@/app/(app)/reports/attendance/page';
import { isAttendanceReportForbiddenError } from '@/lib/reports/attendance-report-errors';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('date=2026-09-25'),
}));

vi.mock('@/lib/reports/attendance-reports-client', () => ({
  getAttendanceReport: vi.fn(),
}));

vi.mock('@/lib/departments/departments-client', () => ({
  listDepartments: vi.fn().mockResolvedValue({
    data: [{ id: 'dept-1', name: 'Science', code: 'SCI', status: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

import { getAttendanceReport } from '@/lib/reports/attendance-reports-client';
import {
  resetFeatureFlagsCacheForTests,
  setFeatureFlagsFromSession,
} from '@/lib/features/feature-flags';

describe('AttendanceReportPage', () => {
  beforeEach(() => {
    vi.mocked(getAttendanceReport).mockReset();
  });

  it('renders summary cards and report rows', async () => {
    vi.mocked(getAttendanceReport).mockResolvedValue({
      data: [
        {
          id: 'att-1',
          attendanceDate: '2026-09-25',
          staffId: 'staff-1',
          staffName: 'Alice Admin',
          employeeCode: 'E001',
          departmentId: 'dept-1',
          departmentName: 'Science',
          status: 'PRESENT',
          checkInAt: '2026-09-25T04:00:00.000Z',
          checkOutAt: '2026-09-25T12:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      summary: {
        scope: 'single_day',
        fromDate: '2026-09-25',
        toDate: '2026-09-25',
        timezone: 'Asia/Kolkata',
        activeStaff: 2,
        totalMarked: 1,
        present: 1,
        absent: 0,
        unmarked: 1,
        attendancePercentage: 50,
        byStatus: { PRESENT: 1 },
      },
      breakdown: {
        byDepartment: [
          {
            departmentId: 'dept-1',
            departmentName: 'Science',
            total: 1,
            present: 1,
            absent: 0,
            attendancePercentage: 100,
          },
        ],
      },
    });

    render(<AttendanceReportPage />);
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument());
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('Science').length).toBeGreaterThan(0);
  });

  it('passes filters to the report client and shows empty state', async () => {
    vi.mocked(getAttendanceReport).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      summary: {
        scope: 'single_day',
        fromDate: '2026-09-25',
        toDate: '2026-09-25',
        timezone: 'UTC',
        activeStaff: 0,
        totalMarked: 0,
        present: 0,
        absent: 0,
        unmarked: 0,
        attendancePercentage: null,
        byStatus: {},
      },
      breakdown: { byDepartment: [] },
    });

    render(<AttendanceReportPage />);
    await waitFor(() =>
      expect(screen.getByText(/No staff attendance records match/i)).toBeInTheDocument(),
    );
    expect(vi.mocked(getAttendanceReport).mock.calls[0]?.[0]).toMatchObject({ date: '2026-09-25' });
  });

  it('shows API error state', async () => {
    vi.mocked(getAttendanceReport).mockRejectedValue(new Error('Server error'));
    render(<AttendanceReportPage />);
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });

  it('recognizes forbidden responses', () => {
    expect(isAttendanceReportForbiddenError({ statusCode: 403 })).toBe(true);
    expect(isAttendanceReportForbiddenError({ statusCode: 401 })).toBe(false);
  });

  it('does not load report data when attendance is disabled', () => {
    setFeatureFlagsFromSession({ attendanceEnabled: false });
    render(<AttendanceReportPage />);
    expect(screen.getByText(/Attendance is turned off/i)).toBeInTheDocument();
    expect(vi.mocked(getAttendanceReport)).not.toHaveBeenCalled();
    resetFeatureFlagsCacheForTests();
  });
});
