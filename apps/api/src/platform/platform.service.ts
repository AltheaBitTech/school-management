import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TRIAL_CODE = 'TRIAL';

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
      throw new NotFoundException({ message: 'School not found' });
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

  async analytics() {
    const [organizations, subscriptions, pendingRegistrations, students, staff] = await Promise.all([
      this.prisma.organization.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.organizationSubscription.findMany({ include: { plan: true } }),
      this.prisma.organizationRegistrationRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.student.count(),
      this.prisma.staff.count(),
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
