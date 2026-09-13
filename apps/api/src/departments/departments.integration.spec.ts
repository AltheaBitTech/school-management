import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DepartmentStatus, PrismaClient } from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { DepartmentsService } from './departments.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Departments integration', () => {
  let prisma: PrismaClient;
  let departmentsService: DepartmentsService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;

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
      data: { name: 'Dept School A', code: `dept-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Dept School B', code: `dept-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    departmentsService = new DepartmentsService(prisma as unknown as PrismaService);
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.department.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('creates, retrieves, and updates departments within a tenant', async () => {
    const created = await departmentsService.create(orgAId, {
      name: 'Mathematics',
      code: 'math',
    });

    expect(created.organizationId).toBe(orgAId);
    expect(created.code).toBe('math');
    expect(created.status).toBe(DepartmentStatus.ACTIVE);

    const fetched = await departmentsService.findById(orgAId, created.id);
    expect(fetched.name).toBe('Mathematics');

    const updated = await departmentsService.update(orgAId, created.id, {
      name: 'Mathematics Department',
    });
    expect(updated.name).toBe('Mathematics Department');
  });

  it('allows the same department code in different organizations', async () => {
    const deptA = await departmentsService.create(orgAId, {
      name: 'Science A',
      code: 'science',
    });
    const deptB = await departmentsService.create(orgBId, {
      name: 'Science B',
      code: 'science',
    });

    expect(deptA.code).toBe('science');
    expect(deptB.code).toBe('science');
    expect(deptA.organizationId).not.toBe(deptB.organizationId);
  });

  it('rejects duplicate department codes within the same organization', async () => {
    await departmentsService.create(orgAId, {
      name: 'English',
      code: 'english-dup',
    });

    await expect(
      departmentsService.create(orgAId, {
        name: 'English Duplicate',
        code: 'english-dup',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('scopes department reads and updates to the authenticated organization', async () => {
    const deptA = await departmentsService.create(orgAId, {
      name: 'History',
      code: 'history',
    });

    await expect(departmentsService.findById(orgBId, deptA.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(
      departmentsService.update(orgBId, deptA.id, { name: 'Blocked Update' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('denies department access when permission is missing', async () => {
    jest
      .spyOn(permissionsService, 'getEffectivePermissions')
      .mockResolvedValueOnce(['staff.view']);

    const request = {
      user: {
        userId: '00000000-0000-4000-8000-000000000001',
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['department.create']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
