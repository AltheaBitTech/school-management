import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, UserStatus } from '@prisma/client';
import { PasswordService } from '../auth/services/password.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CONFIGURATION_KEY } from '../config/configuration';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import {
  ORGANIZATION_ROLE_CODES,
  ORGANIZATION_ROLE_DEFINITIONS,
  PLATFORM_ROLE_DEFINITIONS,
} from '../permissions/constants/system-roles';
import { PrismaService } from '../prisma/prisma.service';
import { StaffLoginProvisioningService } from '../staff/staff-login-provisioning.service';
import { DepartmentsService } from '../departments/departments.service';
import { StaffService } from '../staff/staff.service';
import { RolesService } from '../roles/roles.service';
import { AuditService } from '../audit/audit.service';
import { OnboardingService } from './onboarding.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Onboarding integration', () => {
  let prisma: PrismaClient;
  let onboardingService: OnboardingService;
  let staffService: StaffService;
  let staffLoginProvisioningService: StaffLoginProvisioningService;
  let permissionsGuard: PermissionsGuard;
  let schoolOrgId: string;
  let schoolAdminUserId: string;
  let schoolAdminEmail: string;
  let otherOrgId: string;

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

    onboardingService = new OnboardingService(prisma as unknown as PrismaService);
    const permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    const auditService = new AuditService(prisma as unknown as PrismaService);
    const rolesService = new RolesService(prisma as unknown as PrismaService, permissionsService, auditService);
    const departmentsService = new DepartmentsService(prisma as unknown as PrismaService);
    staffService = new StaffService(prisma as unknown as PrismaService, departmentsService);
    const configService = {
      get: (key: string) => {
        if (key === CONFIGURATION_KEY) {
          return { corsOrigin: 'http://localhost:3000' };
        }
        return undefined;
      },
    };
    staffLoginProvisioningService = new StaffLoginProvisioningService(
      prisma as unknown as PrismaService,
      rolesService,
      auditService,
      configService as unknown as ConfigService,
    );
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);

    const suffix = Date.now();
    const schoolOrg = await prisma.organization.create({
      data: {
        name: 'Onboarding School',
        code: `onboarding-school-${suffix}`,
      },
    });
    schoolOrgId = schoolOrg.id;
    await prisma.organizationSettings.create({
      data: {
        organizationId: schoolOrgId,
        onboardingCompleted: false,
        timezone: 'UTC',
      },
    });

    const schoolAdminRoleDef = ORGANIZATION_ROLE_DEFINITIONS.find(
      (role) => role.code === ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN,
    )!;
    const schoolAdminRole = await prisma.role.create({
      data: {
        organizationId: schoolOrgId,
        code: schoolAdminRoleDef.code,
        name: schoolAdminRoleDef.name,
      },
    });
    for (const permissionCode of schoolAdminRoleDef.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.create({
        data: { roleId: schoolAdminRole.id, permissionId: permission.id },
      });
    }

    schoolAdminEmail = `onboarding-admin-${suffix}@example.com`;
    const schoolAdmin = await prisma.user.create({
      data: {
        organizationId: schoolOrgId,
        email: schoolAdminEmail,
        passwordHash: await new PasswordService().hash('SchoolAdmin123!'),
        status: UserStatus.ACTIVE,
      },
    });
    schoolAdminUserId = schoolAdmin.id;
    await prisma.userRole.create({
      data: { userId: schoolAdminUserId, roleId: schoolAdminRole.id },
    });

    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Other School',
        code: `other-school-${suffix}`,
      },
    });
    otherOrgId = otherOrg.id;
    await prisma.organizationSettings.create({
      data: { organizationId: otherOrgId, onboardingCompleted: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns incomplete onboarding state for a new school organization', async () => {
    const state = await onboardingService.getState(schoolOrgId);
    expect(state.onboardingCompleted).toBe(false);
    expect(state.timezone).toBe('UTC');
  });

  it('updates organization setup within tenant scope', async () => {
    const state = await onboardingService.updateSetup(schoolOrgId, {
      organizationName: 'Updated Onboarding School',
      timezone: 'Asia/Kolkata',
    });

    expect(state.organizationName).toBe('Updated Onboarding School');
    expect(state.timezone).toBe('Asia/Kolkata');
  });

  it('finishes onboarding and remains idempotent', async () => {
    const first = await onboardingService.finish(schoolOrgId);
    expect(first.onboardingCompleted).toBe(true);

    const second = await onboardingService.finish(schoolOrgId);
    expect(second.onboardingCompleted).toBe(true);
  });

  it('treats existing organizations as onboarding complete by default', async () => {
    const state = await onboardingService.getState(otherOrgId);
    expect(state.onboardingCompleted).toBe(true);
  });

  it('denies cross-tenant onboarding state access at service boundary', async () => {
    await expect(onboardingService.getState('00000000-0000-4000-8000-000000000000')).rejects.toThrow();
  });

  it('allows school admin permission guard for onboarding endpoints', async () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['organization.settings.update']);

    await expect(
      permissionsGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: schoolAdminUserId,
              organizationId: schoolOrgId,
              sessionId: 'session-1',
              email: schoolAdminEmail,
            },
          }),
        }),
        getHandler: () => () => undefined,
        getClass: () => class TestController {},
      } as unknown as ExecutionContext),
    ).resolves.toBe(true);
  });

  it('rejects platform role assignment during initial staff provisioning', async () => {
    const platformRoleDef = PLATFORM_ROLE_DEFINITIONS[0];
    const platformRole =
      (await prisma.role.findFirst({ where: { code: platformRoleDef.code, organizationId: null } })) ??
      (await prisma.role.create({
        data: {
          organizationId: null,
          code: platformRoleDef.code,
          name: platformRoleDef.name,
        },
      }));

    const staff = await staffService.create(schoolOrgId, {
      employeeCode: `onboard-staff-${Date.now()}`,
      firstName: 'Initial',
      lastName: 'Staff',
      email: `initial-staff-${Date.now()}@example.com`,
    });

    await expect(
      staffLoginProvisioningService.provisionLogin(
        {
          userId: schoolAdminUserId,
          organizationId: schoolOrgId,
          sessionId: 'session-1',
          email: schoolAdminEmail,
        },
        staff.id,
        {
          email: staff.email!,
          roleId: platformRole.id,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
