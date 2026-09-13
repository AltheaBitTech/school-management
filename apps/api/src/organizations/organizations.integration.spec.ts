import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient, UserStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PasswordService } from '../auth/services/password.service';
import { RefreshSessionService } from '../auth/services/refresh-session.service';
import { TokenService } from '../auth/services/token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIG_KEY } from '../config/auth.configuration';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PLATFORM_ROLE_CODES } from '../permissions/constants/system-roles';
import { OrganizationsService } from './organizations.service';
import { RolesService } from '../roles/roles.service';
import { PrismaService } from '../prisma/prisma.service';
import * as organizationRoleSeedUtil from '../roles/organization-role-seed.util';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Organizations integration', () => {
  let prisma: PrismaClient;
  let organizationsService: OrganizationsService;
  let authService: AuthService;
  let permissionsService: PermissionsService;
  let rolesService: RolesService;
  let permissionsGuard: PermissionsGuard;

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

    const platformRole =
      (await prisma.role.findFirst({
        where: { code: PLATFORM_ROLE_CODES.SAAS_SUPER_ADMIN, organizationId: null },
      })) ??
      (await prisma.role.create({
        data: {
          organizationId: null,
          code: PLATFORM_ROLE_CODES.SAAS_SUPER_ADMIN,
          name: 'SaaS Super Admin',
        },
      }));

    for (const permissionCode of [
      'platform.organization.view',
      'platform.organization.create',
      'platform.role.assign',
      'audit.view',
    ]) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { code: permissionCode },
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: platformRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: platformRole.id,
          permissionId: permission.id,
        },
      });
    }

    const passwordService = new PasswordService();
    organizationsService = new OrganizationsService(
      prisma as unknown as PrismaService,
      passwordService,
    );
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    rolesService = new RolesService(prisma as unknown as PrismaService, permissionsService);

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
    const refreshSessionService = new RefreshSessionService(
      prisma as unknown as PrismaService,
      tokenService,
    );
    authService = new AuthService(
      prisma as unknown as PrismaService,
      passwordService,
      tokenService,
      refreshSessionService,
    );
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function cleanupBootstrappedOrganization(
    organizationId: string,
    userIds: string[],
  ): Promise<void> {
    await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });

    const roles = await prisma.role.findMany({ where: { organizationId } });

    for (const role of roles) {
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    }

    await prisma.role.deleteMany({ where: { organizationId } });
    await prisma.organizationSettings.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }

  it('bootstraps a school tenant and allows the admin to authenticate and pass RBAC checks', async () => {
    const suffix = Date.now();
    const bootstrapResult = await organizationsService.bootstrapOrganization({
      name: 'Integration School',
      code: `integration-school-${suffix}`,
      admin: {
        email: `school-admin-${suffix}@example.com`,
        password: 'SchoolAdmin123!',
      },
    });

    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: bootstrapResult.organization.id },
    });
    expect(settings).not.toBeNull();

    const storedUser = await prisma.user.findUnique({
      where: { id: bootstrapResult.admin.id },
    });
    expect(storedUser?.passwordHash).toBeDefined();
    expect(storedUser?.passwordHash).not.toBe('SchoolAdmin123!');
    expect(storedUser?.status).toBe(UserStatus.ACTIVE);

    const loginResult = await authService.login(
      {
        organizationCode: bootstrapResult.organization.code,
        email: bootstrapResult.admin.email,
        password: 'SchoolAdmin123!',
      },
      {},
    );

    expect(loginResult.user.organizationId).toBe(bootstrapResult.organization.id);

    const permissions = await permissionsService.getEffectivePermissions(
      bootstrapResult.admin.id,
      bootstrapResult.organization.id,
    );
    expect(permissions).toContain('staff.view');
    expect(permissions).toContain('role.assign');

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['staff.view']);
    const request = {
      user: {
        userId: bootstrapResult.admin.id,
        organizationId: bootstrapResult.organization.id,
        sessionId: loginResult.user.sessionId,
        email: bootstrapResult.admin.email,
      },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).resolves.toBe(true);

    await cleanupBootstrappedOrganization(bootstrapResult.organization.id, [
      bootstrapResult.admin.id,
    ]);
  });

  it('rolls back bootstrap state when role permission seeding fails', async () => {
    const suffix = Date.now();
    const code = `rollback-school-${suffix}`;

    jest
      .spyOn(organizationRoleSeedUtil, 'ensureSchoolAdminRole')
      .mockRejectedValueOnce(new Error('seed failed'));

    await expect(
      organizationsService.bootstrapOrganization({
        name: 'Rollback School',
        code,
        admin: {
          email: `rollback-admin-${suffix}@example.com`,
          password: 'SchoolAdmin123!',
        },
      }),
    ).rejects.toThrow();

    const organization = await prisma.organization.findUnique({ where: { code } });
    expect(organization).toBeNull();
  });

  it('denies cross-tenant role assignment between bootstrapped schools', async () => {
    const suffix = Date.now();
    const orgA = await organizationsService.bootstrapOrganization({
      name: 'School A',
      code: `school-a-${suffix}`,
      admin: {
        email: `admin-a-${suffix}@example.com`,
        password: 'SchoolAdmin123!',
      },
    });
    const orgB = await organizationsService.bootstrapOrganization({
      name: 'School B',
      code: `school-b-${suffix}`,
      admin: {
        email: `admin-b-${suffix}@example.com`,
        password: 'SchoolAdmin123!',
      },
    });

    const roleB = await prisma.role.findFirstOrThrow({
      where: {
        organizationId: orgB.organization.id,
        code: 'SCHOOL_ADMIN',
      },
    });

    await expect(
      rolesService.assignRoleToUser(
        {
          userId: orgA.admin.id,
          organizationId: orgA.organization.id,
          sessionId: 'session-a',
          email: orgA.admin.email,
        },
        orgA.admin.id,
        roleB.id,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await cleanupBootstrappedOrganization(orgA.organization.id, [orgA.admin.id]);
    await cleanupBootstrappedOrganization(orgB.organization.id, [orgB.admin.id]);
  });

  it('scopes organization reads to authenticated tenant context', async () => {
    const suffix = Date.now();
    const orgA = await organizationsService.bootstrapOrganization({
      name: 'Tenant School A',
      code: `tenant-a-${suffix}`,
      admin: {
        email: `tenant-a-${suffix}@example.com`,
        password: 'SchoolAdmin123!',
      },
    });
    const orgB = await organizationsService.bootstrapOrganization({
      name: 'Tenant School B',
      code: `tenant-b-${suffix}`,
      admin: {
        email: `tenant-b-${suffix}@example.com`,
        password: 'SchoolAdmin123!',
      },
    });

    const orgForA = await organizationsService.getOrganizationForAuthenticatedUser(
      orgA.organization.id,
    );
    expect(orgForA.id).toBe(orgA.organization.id);

    await expect(
      organizationsService.getOrganizationForAuthenticatedUser(orgB.organization.id),
    ).resolves.toMatchObject({ id: orgB.organization.id });

    await cleanupBootstrappedOrganization(orgA.organization.id, [orgA.admin.id]);
    await cleanupBootstrappedOrganization(orgB.organization.id, [orgB.admin.id]);
  });
});
