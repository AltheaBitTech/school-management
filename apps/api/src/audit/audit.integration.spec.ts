import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from './constants/audit.constants';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { REQUIRE_PERMISSIONS_KEY } from '../common/constants/rbac.constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Audit integration', () => {
  let prisma: PrismaClient;
  let auditService: AuditService;
  let rolesService: RolesService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let actorAId: string;
  let actorBId: string;
  let targetAId: string;
  let assignableRoleAId: string;
  let orgBRoleId: string;
  let auditViewPermissionId: string;
  let roleAssignPermissionId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    auditService = new AuditService(prisma as unknown as PrismaService);
    rolesService = new RolesService(
      prisma as unknown as PrismaService,
      permissionsService,
      auditService,
    );
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);

    const [orgA, orgB] = await Promise.all([
      prisma.organization.create({ data: { name: 'Audit School A', code: `audit-a-${Date.now()}` } }),
      prisma.organization.create({ data: { name: 'Audit School B', code: `audit-b-${Date.now()}` } }),
    ]);
    orgAId = orgA.id;
    orgBId = orgB.id;

    const auditViewPermission = await prisma.permission.upsert({
      where: { code: 'audit.view' },
      update: {},
      create: { code: 'audit.view', description: 'View audit logs' },
    });
    const roleAssignPermission = await prisma.permission.upsert({
      where: { code: 'role.assign' },
      update: {},
      create: { code: 'role.assign', description: 'Assign organization-scoped roles to users' },
    });
    auditViewPermissionId = auditViewPermission.id;
    roleAssignPermissionId = roleAssignPermission.id;

    const roleA = await prisma.role.create({
      data: {
        organizationId: orgAId,
        code: `AUDIT_ASSIGN_${Date.now()}`,
        name: 'Audit Assign Role',
        rolePermissions: {
          create: [{ permissionId: roleAssignPermissionId }],
        },
      },
    });
    assignableRoleAId = roleA.id;

    const roleB = await prisma.role.create({
      data: {
        organizationId: orgBId,
        code: `AUDIT_ASSIGN_B_${Date.now()}`,
        name: 'Audit Assign Role B',
      },
    });
    orgBRoleId = roleB.id;

    const [actorA, actorB, targetA] = await Promise.all([
      prisma.user.create({ data: { organizationId: orgAId, email: `audit-actor-a-${Date.now()}@example.com` } }),
      prisma.user.create({ data: { organizationId: orgBId, email: `audit-actor-b-${Date.now()}@example.com` } }),
      prisma.user.create({ data: { organizationId: orgAId, email: `audit-target-a-${Date.now()}@example.com` } }),
    ]);
    actorAId = actorA.id;
    actorBId = actorB.id;
    targetAId = targetA.id;

    await prisma.userRole.create({
      data: {
        userId: actorA.id,
        roleId: (
          await prisma.role.create({
            data: {
              organizationId: orgAId,
              code: `AUDIT_ADMIN_${Date.now()}`,
              name: 'Audit Admin',
              rolePermissions: {
                create: [
                  { permissionId: auditViewPermissionId },
                  { permissionId: roleAssignPermissionId },
                ],
              },
            },
          })
        ).id,
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.userRole.deleteMany({ where: { user: { organizationId: { in: [orgAId, orgBId] } } } });
    await prisma.rolePermission.deleteMany({ where: { role: { organizationId: { in: [orgAId, orgBId] } } } });
    await prisma.role.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('requires audit.view on the audit logs endpoint', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, AuditController.prototype.list)).toEqual([
      'audit.view',
    ]);
  });

  it('allows and denies audit log access based on audit.view', async () => {
    const request: {
      user: {
        userId: string;
        organizationId: string;
        sessionId: string;
        email: string;
      };
      effectivePermissions?: string[];
    } = {
      user: {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'actor-a@example.com',
      },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => AuditController.prototype.list,
      getClass: () => AuditController,
    } as unknown as ExecutionContext;

    request.effectivePermissions = ['audit.view'];
    expect(await permissionsGuard.canActivate(context)).toBe(true);

    request.effectivePermissions = [];
    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects client organizationId in audit query DTO', async () => {
    const errors = await validate(
      plainToInstance(ListAuditLogsQueryDto, {
        organizationId: 'org-bypass',
        sort: 'createdAt desc',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['organizationId', 'sort']),
    );
  });

  it('scopes audit log reads to the authenticated organization', async () => {
    await auditService.record({
      organizationId: orgAId,
      actorUserId: actorAId,
      action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: targetAId,
      metadata: { tenant: 'A' },
    });
    await auditService.record({
      organizationId: orgBId,
      actorUserId: actorBId,
      action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: actorBId,
      metadata: { tenant: 'B' },
    });

    const orgALogs = await auditService.list(orgAId, { page: 1, pageSize: 25 });
    expect(orgALogs.data.every((entry) => entry.metadata?.tenant === 'A')).toBe(true);
    expect(orgALogs.data.some((entry) => entry.metadata?.tenant === 'B')).toBe(false);

    const orgBLogs = await auditService.list(orgBId, { page: 1, pageSize: 25 });
    expect(orgBLogs.data.every((entry) => entry.metadata?.tenant === 'B')).toBe(true);
    expect(orgBLogs.data.some((entry) => entry.metadata?.tenant === 'A')).toBe(false);
  });

  it('filters, paginates, and orders audit logs deterministically', async () => {
    const baseTime = Date.now();
    await prisma.auditLog.createMany({
      data: [
        {
          organizationId: orgAId,
          actorUserId: actorAId,
          action: 'TEST_FILTER_A',
          entityType: AUDIT_ENTITY_TYPES.USER,
          entityId: targetAId,
          createdAt: new Date(baseTime),
        },
        {
          organizationId: orgAId,
          actorUserId: actorAId,
          action: 'TEST_FILTER_B',
          entityType: AUDIT_ENTITY_TYPES.ROLE,
          entityId: assignableRoleAId,
          createdAt: new Date(baseTime + 1_000),
        },
      ],
    });

    const filtered = await auditService.list(orgAId, {
      action: 'TEST_FILTER_B',
      entityType: AUDIT_ENTITY_TYPES.ROLE,
      entityId: assignableRoleAId,
      page: 1,
      pageSize: 10,
    });
    expect(filtered.meta.total).toBe(1);
    expect(filtered.data[0]?.action).toBe('TEST_FILTER_B');

    const paged = await auditService.list(orgAId, {
      action: 'TEST_FILTER_A',
      page: 1,
      pageSize: 1,
    });
    expect(paged.meta.total).toBeGreaterThanOrEqual(1);
    expect(paged.data).toHaveLength(1);

    const ordered = await auditService.list(orgAId, { page: 1, pageSize: 5 });
    for (let index = 1; index < ordered.data.length; index += 1) {
      const previous = ordered.data[index - 1]!;
      const current = ordered.data[index]!;
      expect(previous.createdAt >= current.createdAt).toBe(true);
    }
  });

  it('creates USER_ROLE_ASSIGNED audit records during successful role assignment', async () => {
    const requestId = `req-${Date.now()}`;
    const assignmentTarget = await prisma.user.create({
      data: { organizationId: orgAId, email: `audit-target-${Date.now()}@example.com` },
    });
    const assignmentRole = await prisma.role.create({
      data: {
        organizationId: orgAId,
        code: `AUDIT_ROLE_${Date.now()}`,
        name: 'Audit Assignment Role',
        rolePermissions: {
          create: [{ permissionId: roleAssignPermissionId }],
        },
      },
    });

    await rolesService.assignRoleToUser(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'actor-a@example.com',
      },
      assignmentTarget.id,
      assignmentRole.id,
      { requestId },
    );

    const logs = await auditService.list(orgAId, {
      action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: assignmentTarget.id,
      page: 1,
      pageSize: 10,
    });

    expect(logs.data.some((entry) => entry.requestId === requestId)).toBe(true);
    expect(
      logs.data.some(
        (entry) =>
          entry.actorUserId === actorAId &&
          entry.metadata?.roleId === assignmentRole.id &&
          entry.metadata?.targetUserId === assignmentTarget.id,
      ),
    ).toBe(true);
  });

  it('does not create audit records when role assignment fails', async () => {
    const beforeCount = await prisma.auditLog.count({ where: { organizationId: orgAId } });

    await expect(
      rolesService.assignRoleToUser(
        {
          userId: actorAId,
          organizationId: orgAId,
          sessionId: 'session-1',
          email: 'actor-a@example.com',
        },
        targetAId,
        orgBRoleId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const afterCount = await prisma.auditLog.count({ where: { organizationId: orgAId } });
    expect(afterCount).toBe(beforeCount);
  });
});
