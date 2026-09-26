import { BadRequestException } from '@nestjs/common';
import { VisitorStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VisitorsReportsService } from './visitors-reports.service';

describe('VisitorsReportsService', () => {
  const prisma = {
    organization: { findUnique: jest.fn() },
    organizationSettings: { findUnique: jest.fn() },
    visitor: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    staff: { findMany: jest.fn() },
    department: { findMany: jest.fn() },
  };

  const service = new VisitorsReportsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.organization.findUnique.mockResolvedValue({ code: 'demo-school' });
    prisma.organizationSettings.findUnique.mockResolvedValue({ timezone: 'UTC' });
    prisma.visitor.findMany.mockResolvedValue([]);
    prisma.visitor.count.mockResolvedValue(0);
    prisma.visitor.groupBy.mockResolvedValue([]);
    prisma.staff.findMany.mockResolvedValue([]);
    prisma.department.findMany.mockResolvedValue([]);
  });

  it('rejects conflicting date parameters', () => {
    expect(() =>
      service.resolveDateContext(
        { page: 1, pageSize: 25, date: '2026-09-25', startDate: '2026-09-01' },
        'UTC',
      ),
    ).toThrow(BadRequestException);
  });

  it('applies single-day check-in filter using organization timezone boundaries', () => {
    const context = service.resolveDateContext(
      { page: 1, pageSize: 25, date: '2026-09-25' },
      'UTC',
    );
    expect(context.dateFilterApplied).toBe(true);
    expect(context.scope).toBe('single_day');
    expect(context.checkInStartUtc?.toISOString()).toBe('2026-09-25T00:00:00.000Z');
    expect(context.checkInEndUtc?.toISOString()).toBe('2026-09-26T00:00:00.000Z');
  });

  it('builds where with host and department filters', () => {
    const where = service.buildWhere(
      'org-1',
      { fromDate: null, toDate: null, dateFilterApplied: false, scope: 'none' },
      { page: 1, pageSize: 25, hostStaffId: 'staff-1', departmentId: 'dept-1' },
    );
    expect(where.hostStaffId).toBe('staff-1');
    expect(where.hostStaff).toEqual({ organizationId: 'org-1', departmentId: 'dept-1' });
  });

  it('aggregates summary from status groupBy', async () => {
    prisma.visitor.count.mockImplementation(async (args?: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};
      if (where.status === VisitorStatus.CHECKED_IN && !where.checkInAt) {
        return 4;
      }
      return 3;
    });

    prisma.visitor.groupBy.mockImplementation(async (args: { by: string[] }) => {
      if (args.by.includes('status')) {
        return [
          { status: VisitorStatus.CHECKED_IN, _count: { _all: 2 } },
          { status: VisitorStatus.CHECKED_OUT, _count: { _all: 1 } },
        ];
      }
      return [{ purpose: 'Meeting', _count: { _all: 3 } }];
    });

    const report = await service.generate('org-1', {
      page: 1,
      pageSize: 25,
      date: '2026-09-25',
    });

    expect(report.summary.totalVisits).toBe(3);
    expect(report.summary.checkedInVisits).toBe(2);
    expect(report.summary.checkedOutVisits).toBe(1);
    expect(report.summary.activeOnCampus).toBe(4);
    expect(report.summary.checkedInOnSelectedDay).toBe(3);
  });
});
