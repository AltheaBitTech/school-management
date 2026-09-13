import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmploymentStatus, PrismaClient } from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DepartmentsService } from '../departments/departments.service';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { StaffService } from './staff.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Staff integration', () => {
  let prisma: PrismaClient;
  let staffService: StaffService;
  let departmentsService: DepartmentsService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let deptAId: string;
  let deptBId: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    for (const permission of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: { description: permission.description },
        create: permission,
      });
    }

    const orgA = await prisma.organization.create({
      data: { name: 'Staff School A', code: `staff-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Staff School B', code: `staff-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const deptA = await prisma.department.create({
      data: { organizationId: orgAId, name: 'Teaching', code: 'teaching' },
    });
    const deptB = await prisma.department.create({
      data: { organizationId: orgBId, name: 'Teaching', code: 'teaching' },
    });
    deptAId = deptA.id;
    deptBId = deptB.id;

    const userA = await prisma.user.create({
      data: { organizationId: orgAId, email: `staff-user-a-${Date.now()}@example.com` },
    });
    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `staff-user-b-${Date.now()}@example.com` },
    });
    userAId = userA.id;
    userBId = userB.id;

    departmentsService = new DepartmentsService(prisma as unknown as PrismaService);
    staffService = new StaffService(prisma as unknown as PrismaService, departmentsService);
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.department.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('creates staff with department assignment and retrieves by tenant scope', async () => {
    const created = await staffService.create(orgAId, {
      employeeCode: 'emp-001',
      firstName: 'Anita',
      lastName: 'Desai',
      departmentId: deptAId,
      email: 'anita.desai@example.com',
    });

    expect(created.organizationId).toBe(orgAId);
    expect(created.departmentId).toBe(deptAId);
    expect(created.employmentStatus).toBe(EmploymentStatus.ACTIVE);

    const fetched = await staffService.findById(orgAId, created.id);
    expect(fetched.firstName).toBe('Anita');
    expect(fetched.department?.code).toBe('teaching');
  });

  it('supports pagination, search, and department filtering within a tenant', async () => {
    await staffService.create(orgBId, {
      employeeCode: 'emp-search',
      firstName: 'Searchable',
      lastName: 'Person',
      departmentId: deptBId,
    });

    const filtered = await staffService.list(orgBId, {
      page: 1,
      pageSize: 10,
      departmentId: deptBId,
      search: 'searchable',
      sortBy: 'firstName',
      sortOrder: 'asc',
    });

    expect(filtered.meta.total).toBeGreaterThanOrEqual(1);
    expect(filtered.data.some((item) => item.firstName === 'Searchable')).toBe(true);
  });

  it('rejects duplicate employee codes within the same organization', async () => {
    await staffService.create(orgAId, {
      employeeCode: 'dup-code',
      firstName: 'First',
      lastName: 'Staff',
    });

    await expect(
      staffService.create(orgAId, {
        employeeCode: 'dup-code',
        firstName: 'Second',
        lastName: 'Staff',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks cross-tenant reads and updates', async () => {
    const staffA = await staffService.create(orgAId, {
      employeeCode: 'cross-read',
      firstName: 'Cross',
      lastName: 'Read',
    });

    await expect(staffService.findById(orgBId, staffA.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(
      staffService.update(orgBId, staffA.id, { firstName: 'Blocked' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks cross-tenant department assignment', async () => {
    await expect(
      staffService.create(orgAId, {
        employeeCode: 'bad-dept',
        firstName: 'Bad',
        lastName: 'Department',
        departmentId: deptBId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks cross-tenant user linking', async () => {
    await expect(
      staffService.create(orgAId, {
        employeeCode: 'bad-user',
        firstName: 'Bad',
        lastName: 'User',
        userId: userBId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deactivates staff using lifecycle semantics', async () => {
    const staff = await staffService.create(orgAId, {
      employeeCode: 'deactivate-me',
      firstName: 'Offboard',
      lastName: 'Candidate',
    });

    const deactivated = await staffService.deactivate(orgAId, staff.id);
    expect(deactivated.employmentStatus).toBe(EmploymentStatus.OFFBOARDED);
    expect(deactivated.lastWorkingDate).not.toBeNull();
  });

  it('denies staff create permission when staff.create is missing', async () => {
    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['staff.view']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
