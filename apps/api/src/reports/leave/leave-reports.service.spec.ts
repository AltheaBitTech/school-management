import { BadRequestException } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveReportsService } from './leave-reports.service';

describe('LeaveReportsService', () => {
  const prisma = {
    organization: { findUnique: jest.fn() },
    organizationSettings: { findUnique: jest.fn() },
    leaveRequest: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    department: { findMany: jest.fn() },
    leaveBalance: { findMany: jest.fn() },
  };

  const service = new LeaveReportsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.organization.findUnique.mockResolvedValue({ code: 'demo-school' });
    prisma.organizationSettings.findUnique.mockResolvedValue({ timezone: 'UTC' });
    prisma.leaveRequest.findMany.mockResolvedValue([]);
    prisma.leaveRequest.count.mockResolvedValue(0);
    prisma.leaveRequest.groupBy.mockResolvedValue([]);
    prisma.leaveRequest.aggregate.mockResolvedValue({ _sum: { duration: new Decimal(0) } });
    prisma.department.findMany.mockResolvedValue([]);
    prisma.leaveBalance.findMany.mockResolvedValue([]);
  });

  it('skips date filtering when only status is provided', () => {
    const context = service.resolveDateContext(
      { page: 1, pageSize: 25, status: LeaveRequestStatus.PENDING_APPROVAL },
      'UTC',
    );
    expect(context.dateFilterApplied).toBe(false);
    expect(context.fromDate).toBeNull();
  });

  it('defaults to organization local day when no filters are provided', () => {
    const context = service.resolveDateContext({ page: 1, pageSize: 25 }, 'Asia/Kolkata');
    expect(context.dateFilterApplied).toBe(true);
    expect(context.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rejects conflicting date parameters', () => {
    expect(() =>
      service.resolveDateContext(
        { page: 1, pageSize: 25, date: '2026-09-25', startDate: '2026-09-01' },
        'UTC',
      ),
    ).toThrow(BadRequestException);
  });

  it('aggregates summary counts from leave request status', async () => {
    prisma.leaveRequest.count.mockResolvedValue(4);
    prisma.leaveRequest.groupBy.mockResolvedValue([
      { status: LeaveRequestStatus.PENDING_APPROVAL, _count: { _all: 2 } },
      { status: LeaveRequestStatus.APPROVED, _count: { _all: 1 } },
      { status: LeaveRequestStatus.REJECTED, _count: { _all: 1 } },
    ]);
    prisma.leaveRequest.aggregate.mockResolvedValue({ _sum: { duration: new Decimal(3) } });
    prisma.leaveRequest.findMany.mockImplementation((args: { distinct?: string[] }) => {
      if (args?.distinct) {
        return Promise.resolve([{ staffId: 's1' }]);
      }
      return Promise.resolve([]);
    });

    const report = await service.generate('org-1', {
      page: 1,
      pageSize: 25,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    expect(report.summary.totalRequests).toBe(4);
    expect(report.summary.pending).toBe(2);
    expect(report.summary.approved).toBe(1);
    expect(report.summary.rejected).toBe(1);
    expect(report.summary.leaveDaysApproved).toBe(3);
    expect(report.summary.employeesOnLeave).toBe(1);
  });
});
