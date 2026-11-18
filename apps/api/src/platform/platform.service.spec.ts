import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformService } from './platform.service';

describe('PlatformService.analytics', () => {
  const now = new Date('2026-11-18T12:00:00.000Z');
  const day = 24 * 60 * 60 * 1000;

  function buildPrisma() {
    return {
      organization: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'ACTIVE', _count: { _all: 3 } },
          { status: 'SUSPENDED', _count: { _all: 1 } },
        ]),
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Green Valley School',
            code: 'green-valley',
            status: 'ACTIVE',
            createdAt: new Date('2026-11-10T00:00:00.000Z'),
            subscription: { status: 'TRIAL', plan: { code: 'TRIAL', name: 'Trial' } },
          },
          {
            id: 'org-2',
            name: 'Hill Side',
            code: 'hill-side',
            status: 'ACTIVE',
            createdAt: new Date('2026-11-01T00:00:00.000Z'),
            subscription: null,
          },
        ]),
      },
      organizationSubscription: {
        findMany: jest.fn().mockResolvedValue([
          { plan: { code: 'TRIAL' } },
          { plan: { code: 'TRIAL' } },
          { plan: { code: 'STANDARD' } },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
      organizationRegistrationRequest: { count: jest.fn().mockResolvedValue(4) },
      student: { count: jest.fn().mockResolvedValue(120) },
      staff: { count: jest.fn().mockResolvedValue(30) },
    };
  }

  it('returns tenant metrics, recent schools, and trial counts', async () => {
    const prisma = buildPrisma();
    const service = new PlatformService(prisma as unknown as PrismaService);

    const result = await service.analytics(now);

    expect(result).toEqual({
      organizationsByStatus: { ACTIVE: 3, SUSPENDED: 1 },
      subscriptionsByPlan: { TRIAL: 2, STANDARD: 1 },
      pendingRegistrations: 4,
      totalStudents: 120,
      totalStaff: 30,
      newOrganizationsLast30Days: 2,
      trialsEndingSoon: 1,
      recentOrganizations: [
        {
          id: 'org-1',
          name: 'Green Valley School',
          code: 'green-valley',
          status: 'ACTIVE',
          createdAt: new Date('2026-11-10T00:00:00.000Z'),
          planCode: 'TRIAL',
          planName: 'Trial',
          subscriptionStatus: 'TRIAL',
        },
        {
          id: 'org-2',
          name: 'Hill Side',
          code: 'hill-side',
          status: 'ACTIVE',
          createdAt: new Date('2026-11-01T00:00:00.000Z'),
          planCode: null,
          planName: null,
          subscriptionStatus: null,
        },
      ],
    });
  });

  it('excludes the platform organization from tenant metrics', async () => {
    const prisma = buildPrisma();
    const service = new PlatformService(prisma as unknown as PrismaService);
    const tenantWhere = { code: { not: PLATFORM_ORGANIZATION_CODE } };

    await service.analytics(now);

    expect(prisma.organization.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: tenantWhere }));
    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: tenantWhere, take: 5, orderBy: { createdAt: 'desc' } }),
    );
    expect(prisma.organizationSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organization: tenantWhere } }),
    );
  });

  it('uses a 30-day window for new schools and a 14-day window for ending trials', async () => {
    const prisma = buildPrisma();
    const service = new PlatformService(prisma as unknown as PrismaService);

    await service.analytics(now);

    expect(prisma.organization.count).toHaveBeenCalledWith({
      where: {
        code: { not: PLATFORM_ORGANIZATION_CODE },
        createdAt: { gte: new Date(now.getTime() - 30 * day) },
      },
    });
    expect(prisma.organizationSubscription.count).toHaveBeenCalledWith({
      where: {
        organization: { code: { not: PLATFORM_ORGANIZATION_CODE } },
        status: 'TRIAL',
        currentPeriodEnd: { gte: now, lte: new Date(now.getTime() + 14 * day) },
      },
    });
  });
});
