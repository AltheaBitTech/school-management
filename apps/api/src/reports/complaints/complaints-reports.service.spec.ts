import { BadRequestException } from '@nestjs/common';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ComplaintsReportsService,
  computeAgeDays,
} from './complaints-reports.service';

describe('ComplaintsReportsService', () => {
  const prisma = {
    organization: { findUnique: jest.fn() },
    organizationSettings: { findUnique: jest.fn() },
    complaint: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    department: { findMany: jest.fn() },
    staff: { findMany: jest.fn() },
  };

  const service = new ComplaintsReportsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.organization.findUnique.mockResolvedValue({ code: 'demo-school' });
    prisma.organizationSettings.findUnique.mockResolvedValue({ timezone: 'UTC' });
    prisma.complaint.findMany.mockResolvedValue([]);
    prisma.complaint.count.mockResolvedValue(0);
    prisma.complaint.groupBy.mockResolvedValue([]);
    prisma.department.findMany.mockResolvedValue([]);
    prisma.staff.findMany.mockResolvedValue([]);
  });

  it('does not apply date filtering when no dates are provided', () => {
    const context = service.resolveDateContext({ page: 1, pageSize: 25 }, 'UTC');
    expect(context.dateFilterApplied).toBe(false);
    expect(context.fromDate).toBeNull();
  });

  it('rejects invalid date ranges', () => {
    expect(() =>
      service.resolveDateContext(
        { page: 1, pageSize: 25, startDate: '2026-09-30', endDate: '2026-09-01' },
        'UTC',
      ),
    ).toThrow(BadRequestException);
  });

  it('builds where with openOnly using dashboard open statuses', () => {
    const where = service.buildWhere(
      'org-1',
      { fromDate: null, toDate: null, dateFilterApplied: false },
      { page: 1, pageSize: 25, openOnly: true },
    );
    expect(where.status).toEqual({
      in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
    });
  });

  it('builds where with department via assignee staff', () => {
    const where = service.buildWhere(
      'org-1',
      { fromDate: null, toDate: null, dateFilterApplied: false },
      { page: 1, pageSize: 25, departmentId: 'dept-1' },
    );
    expect(where.assignedToStaff).toEqual({
      organizationId: 'org-1',
      departmentId: 'dept-1',
    });
  });

  it('aggregates summary counts from status groupBy', async () => {
    prisma.complaint.count.mockImplementation(async (args?: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};
      if (where.priority && typeof where.priority === 'object' && 'in' in where.priority) {
        return 2;
      }
      return 5;
    });

    prisma.complaint.groupBy.mockImplementation(async (args: { by: string[] }) => {
      if (args.by.includes('status')) {
        return [
          { status: ComplaintStatus.OPEN, _count: { _all: 2 } },
          { status: ComplaintStatus.ASSIGNED, _count: { _all: 1 } },
        ];
      }
      if (args.by.includes('priority')) {
        return [{ priority: ComplaintPriority.HIGH, _count: { _all: 1 } }];
      }
      return [{ category: ComplaintCategory.IT, _count: { _all: 3 } }];
    });

    const report = await service.generate('org-1', { page: 1, pageSize: 25 });

    expect(report.summary.totalComplaints).toBe(5);
    expect(report.summary.openComplaints).toBe(3);
    expect(report.summary.assignedComplaints).toBe(1);
    expect(report.summary.highPriorityComplaints).toBe(2);
    expect(report.breakdown.byStatus).toHaveLength(2);
  });
});

describe('computeAgeDays', () => {
  it('uses closedAt for closed complaints', () => {
    const createdAt = new Date('2026-09-01T00:00:00.000Z');
    const closedAt = new Date('2026-09-06T00:00:00.000Z');
    expect(computeAgeDays(createdAt, closedAt, ComplaintStatus.CLOSED)).toBe(5);
  });

  it('uses reference time for non-closed complaints', () => {
    const createdAt = new Date('2026-09-01T00:00:00.000Z');
    const reference = new Date('2026-09-04T12:00:00.000Z');
    expect(
      computeAgeDays(createdAt, null, ComplaintStatus.OPEN, reference),
    ).toBe(3);
  });
});
