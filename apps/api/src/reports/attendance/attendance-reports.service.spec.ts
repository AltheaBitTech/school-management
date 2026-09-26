import { BadRequestException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceReportsService } from './attendance-reports.service';

describe('AttendanceReportsService', () => {
  const prisma = {
    organization: { findUnique: jest.fn() },
    organizationSettings: { findUnique: jest.fn() },
    staffAttendance: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    staff: { count: jest.fn() },
    department: { findMany: jest.fn() },
  };

  const service = new AttendanceReportsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.organization.findUnique.mockResolvedValue({ code: 'demo-school' });
    prisma.organizationSettings.findUnique.mockResolvedValue({ timezone: 'Asia/Kolkata' });
    prisma.staffAttendance.findMany.mockResolvedValue([]);
    prisma.staffAttendance.count.mockResolvedValue(0);
    prisma.staffAttendance.groupBy.mockResolvedValue([]);
    prisma.staff.count.mockResolvedValue(5);
    prisma.department.findMany.mockResolvedValue([]);
  });

  it('rejects conflicting date parameters', () => {
    expect(() =>
      service.resolveDateRange(
        { page: 1, pageSize: 25, date: '2026-09-25', startDate: '2026-09-01' },
        'UTC',
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects an invalid date range', () => {
    expect(() =>
      service.resolveDateRange(
        { page: 1, pageSize: 25, startDate: '2026-09-30', endDate: '2026-09-01' },
        'UTC',
      ),
    ).toThrow(BadRequestException);
  });

  it('defaults to the organization local date when no dates are provided', () => {
    const result = service.resolveDateRange({ page: 1, pageSize: 25 }, 'Asia/Kolkata');
    expect(result.scope).toBe('single_day');
    expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.toDate).toBe(result.fromDate);
  });

  it('calculates single-day attendance percentage from active staff', async () => {
    prisma.staffAttendance.count.mockResolvedValue(4);
    prisma.staffAttendance.groupBy.mockResolvedValue([
      { status: AttendanceStatus.PRESENT, _count: { _all: 3 } },
      { status: AttendanceStatus.ABSENT, _count: { _all: 1 } },
    ]);

    const report = await service.generate('org-1', {
      page: 1,
      pageSize: 25,
      date: '2026-09-25',
    });

    expect(report.summary.scope).toBe('single_day');
    expect(report.summary.activeStaff).toBe(5);
    expect(report.summary.totalMarked).toBe(4);
    expect(report.summary.present).toBe(3);
    expect(report.summary.absent).toBe(1);
    expect(report.summary.unmarked).toBe(1);
    expect(report.summary.attendancePercentage).toBe(60);
  });

  it('calculates date-range attendance percentage from marked records', async () => {
    prisma.staffAttendance.count.mockResolvedValue(10);
    prisma.staffAttendance.groupBy.mockResolvedValue([
      { status: AttendanceStatus.PRESENT, _count: { _all: 7 } },
      { status: AttendanceStatus.ABSENT, _count: { _all: 3 } },
    ]);

    const report = await service.generate('org-1', {
      page: 1,
      pageSize: 25,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    expect(report.summary.scope).toBe('date_range');
    expect(report.summary.activeStaff).toBeNull();
    expect(report.summary.unmarked).toBeNull();
    expect(report.summary.attendancePercentage).toBe(70);
  });
});
