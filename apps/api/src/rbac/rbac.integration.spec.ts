import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesService } from '../roles/roles.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/services/token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIG_KEY } from '../config/auth.configuration';
import { ORGANIZATION_ROLE_CODES } from '../permissions/constants/system-roles';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('RBAC integration', () => {
  let prisma: PrismaClient;
  let permissionsService: PermissionsService;
  let rolesService: RolesService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let schoolAdminRoleAId: string;
  let schoolAdminRoleBId: string;
  let staffViewPermissionId: string;
  let complaintViewPermissionId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    rolesService = new RolesService(prisma as unknown as PrismaService, permissionsService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);

    const orgA = await prisma.organization.create({
      data: { name: 'School A', code: `school-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'School B', code: `school-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const staffViewPermission = await prisma.permission.create({
      data: { code: `staff.view.${Date.now()}`, description: 'View staff' },
    });
    const complaintViewPermission = await prisma.permission.create({
      data: { code: `complaint.view.${Date.now()}`, description: 'View complaints' },
    });
    staffViewPermissionId = staffViewPermission.id;
    complaintViewPermissionId = complaintViewPermission.id;

    const roleA = await prisma.role.create({
      data: {
        organizationId: orgAId,
        code: `${ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN}-${Date.now()}`,
        name: 'School Admin A',
        rolePermissions: {
          create: [{ permissionId: staffViewPermissionId }],
        },
      },
    });
    const roleB = await prisma.role.create({
      data: {
        organizationId: orgBId,
        code: `${ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN}-${Date.now()}`,
        name: 'School Admin B',
        rolePermissions: {
          create: [{ permissionId: complaintViewPermissionId }],
        },
      },
    });
    schoolAdminRoleAId = roleA.id;
    schoolAdminRoleBId = roleB.id;

    const userA = await prisma.user.create({
      data: {
        organizationId: orgAId,
        email: `user-a-${Date.now()}@example.com`,
      },
    });
    const userB = await prisma.user.create({
      data: {
        organizationId: orgBId,
        email: `user-b-${Date.now()}@example.com`,
      },
    });
    userAId = userA.id;
    userBId = userB.id;

    await prisma.userRole.create({
      data: { userId: userAId, roleId: schoolAdminRoleAId },
    });
    await prisma.userRole.create({
      data: { userId: userBId, roleId: schoolAdminRoleBId },
    });
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: { in: [schoolAdminRoleAId, schoolAdminRoleBId] },
      },
    });
    await prisma.role.deleteMany({
      where: { id: { in: [schoolAdminRoleAId, schoolAdminRoleBId] } },
    });
    await prisma.permission.deleteMany({
      where: { id: { in: [staffViewPermissionId, complaintViewPermissionId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('resolves permissions from current database state for the authenticated organization', async () => {
    const permissions = await permissionsService.getEffectivePermissions(userAId, orgAId);

    expect(permissions.some((permission) => permission.startsWith('staff.view'))).toBe(true);
    expect(permissions.some((permission) => permission.startsWith('complaint.view'))).toBe(false);
  });

  it('denies permission guard access when permission is missing', async () => {
    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'user-a@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['complaint.view']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows permission guard access when required permission exists', async () => {
    const staffPermissionCode = (
      await prisma.permission.findUnique({ where: { id: staffViewPermissionId } })
    )?.code;
    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'user-a@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([staffPermissionCode]);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).resolves.toBe(true);
  });

  it('returns 401 from permission guard when user context is missing', async () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['staff.view']);

    const context = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('denies cross-tenant role assignment', async () => {
    await expect(
      rolesService.assignRoleToUser(
        {
          userId: userAId,
          organizationId: orgAId,
          sessionId: 'session-1',
          email: 'user-a@example.com',
        },
        userAId,
        schoolAdminRoleBId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not embed permissions in JWT access tokens', () => {
    const configService = {
      get: (key: string) => {
        if (key === AUTH_CONFIG_KEY) {
          return {
            accessSecret: process.env.JWT_ACCESS_SECRET,
            accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
            refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
          };
        }

        return undefined;
      },
    };
    const tokenService = new TokenService(
      new JwtService({}),
      configService as unknown as ConfigService,
    );

    const token = tokenService.createAccessToken({
      sub: userAId,
      organizationId: orgAId,
      sessionId: 'session-1',
    });
    const payload = tokenService.verifyAccessToken(token);

    expect(payload).toEqual({
      sub: userAId,
      organizationId: orgAId,
      sessionId: 'session-1',
      iat: expect.any(Number),
      exp: expect.any(Number),
    });
    expect(Object.keys(payload)).not.toContain('permissions');
  });
});
