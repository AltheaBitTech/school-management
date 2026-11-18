import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { PrismaService } from '../prisma/prisma.service';

const TRIAL_CODE = 'TRIAL';
const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_ORGANIZATION_WINDOW_DAYS = 30;
const TRIAL_ENDING_WINDOW_DAYS = 14;
const RECENT_ORGANIZATIONS_LIMIT = 5;

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return this.prisma.plan.findMany({ where: { active: true }, orderBy: { studentLimit: 'asc' } });
  }

  async listSubscriptions() {
    const subscriptions = await this.prisma.organizationSubscription.findMany({
      include: { plan: true, organization: true },
      orderBy: { organization: { name: 'asc' } },
    });
    const counts = await this.countsByOrganization(subscriptions.map((row) => row.organizationId));
    return subscriptions.map((row) => ({
      organizationId: row.organizationId,
      organizationName: row.organization.name,
      organizationCode: row.organization.code,
      planCode: row.plan.code,
      planName: row.plan.name,
      status: row.status,
      studentCount: counts.students.get(row.organizationId) ?? 0,
      staffCount: counts.staff.get(row.organizationId) ?? 0,
      studentLimit: row.plan.studentLimit,
      staffLimit: row.plan.staffLimit,
    }));
  }

  async updateSubscription(organizationId: string, input: { planCode: string; status: SubscriptionStatus }) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException({ message: 'Institution not found' });
    }
    const plan = await this.prisma.plan.findUnique({ where: { code: input.planCode } });
    if (!plan || !plan.active) {
      throw new BadRequestException({ message: 'Choose Trial or Standard.' });
    }
    const subscription = await this.prisma.organizationSubscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId: plan.id,
        status: input.status,
      },
      update: { planId: plan.id, status: input.status },
      include: { plan: true },
    });
    return {
      organizationId,
      planCode: subscription.plan.code,
      status: subscription.status,
    };
  }

  async analytics(now: Date = new Date()) {
    const tenantWhere = { code: { not: PLATFORM_ORGANIZATION_CODE } };
    const newSince = new Date(now.getTime() - NEW_ORGANIZATION_WINDOW_DAYS * DAY_MS);
    const trialsEndBefore = new Date(now.getTime() + TRIAL_ENDING_WINDOW_DAYS * DAY_MS);

    const [
      organizations,
      subscriptions,
      pendingRegistrations,
      students,
      staff,
      newOrganizationsLast30Days,
      recentOrganizations,
      trialsEndingSoon,
    ] = await Promise.all([
      this.prisma.organization.groupBy({ by: ['status'], where: tenantWhere, _count: { _all: true } }),
      this.prisma.organizationSubscription.findMany({
        where: { organization: tenantWhere },
        include: { plan: true },
      }),
      this.prisma.organizationRegistrationRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.student.count(),
      this.prisma.staff.count(),
      this.prisma.organization.count({ where: { ...tenantWhere, createdAt: { gte: newSince } } }),
      this.prisma.organization.findMany({
        where: tenantWhere,
        orderBy: { createdAt: 'desc' },
        take: RECENT_ORGANIZATIONS_LIMIT,
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          createdAt: true,
          subscription: { select: { status: true, plan: { select: { code: true, name: true } } } },
        },
      }),
      this.prisma.organizationSubscription.count({
        where: {
          organization: tenantWhere,
          status: 'TRIAL',
          currentPeriodEnd: { gte: now, lte: trialsEndBefore },
        },
      }),
    ]);
    const byPlan: Record<string, number> = {};
    for (const row of subscriptions) {
      byPlan[row.plan.code] = (byPlan[row.plan.code] ?? 0) + 1;
    }
    return {
      organizationsByStatus: Object.fromEntries(organizations.map((row) => [row.status, row._count._all])),
      subscriptionsByPlan: byPlan,
      pendingRegistrations,
      totalStudents: students,
      totalStaff: staff,
      newOrganizationsLast30Days,
      trialsEndingSoon,
      recentOrganizations: recentOrganizations.map((org) => ({
        id: org.id,
        name: org.name,
        code: org.code,
        status: org.status,
        createdAt: org.createdAt,
        planCode: org.subscription?.plan.code ?? null,
        planName: org.subscription?.plan.name ?? null,
        subscriptionStatus: org.subscription?.status ?? null,
      })),
    };
  }

  async currentForOrganization(organizationId: string) {
    const subscription = await this.prisma.organizationSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (!subscription) {
      return {
        data: {
          planName: 'Trial',
          planCode: TRIAL_CODE,
          studentLimit: 50,
          staffLimit: 10,
          studentCount: 0,
          staffCount: 0,
          overStudentLimit: false,
          overStaffLimit: false,
        },
      };
    }
    const [studentCount, staffCount] = await Promise.all([
      this.prisma.student.count({ where: { organizationId } }),
      this.prisma.staff.count({ where: { organizationId } }),
    ]);
    return {
      data: {
        planName: subscription.plan.name,
        planCode: subscription.plan.code,
        studentLimit: subscription.plan.studentLimit,
        staffLimit: subscription.plan.staffLimit,
        studentCount,
        staffCount,
        overStudentLimit: studentCount > subscription.plan.studentLimit,
        overStaffLimit: staffCount > subscription.plan.staffLimit,
      },
    };
  }

  async ensureTrial(organizationId: string) {
    const existing = await this.prisma.organizationSubscription.findUnique({ where: { organizationId } });
    if (existing) return;
    const plan = await this.prisma.plan.findUnique({ where: { code: TRIAL_CODE } });
    if (!plan) return;
    await this.prisma.organizationSubscription.create({
      data: { organizationId, planId: plan.id, status: 'TRIAL' },
    });
  }

  private async countsByOrganization(organizationIds: string[]) {
    if (organizationIds.length === 0) {
      return { students: new Map<string, number>(), staff: new Map<string, number>() };
    }
    const [students, staff] = await Promise.all([
      this.prisma.student.groupBy({
        by: ['organizationId'],
        where: { organizationId: { in: organizationIds } },
        _count: { _all: true },
      }),
      this.prisma.staff.groupBy({
        by: ['organizationId'],
        where: { organizationId: { in: organizationIds } },
        _count: { _all: true },
      }),
    ]);
    return {
      students: new Map(students.map((row) => [row.organizationId, row._count._all])),
      staff: new Map(staff.map((row) => [row.organizationId, row._count._all])),
    };
  }
}
