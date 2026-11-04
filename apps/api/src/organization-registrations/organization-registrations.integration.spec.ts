import { ConflictException, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/constants/audit.constants';
import { AuthService } from '../auth/auth.service';
import { PasswordService } from '../auth/services/password.service';
import { RefreshSessionService } from '../auth/services/refresh-session.service';
import { TokenService } from '../auth/services/token.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AUTH_CONFIG_KEY } from '../config/auth.configuration';
import { CONFIGURATION_KEY } from '../config/configuration';
import { OrganizationsService } from '../organizations/organizations.service';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { PermissionsService } from '../permissions/permissions.service';
import { PLATFORM_ROLE_DEFINITIONS } from '../permissions/constants/system-roles';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationRegistrationsService } from './organization-registrations.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Organization registrations integration', () => {
  let prisma: PrismaClient;
  let registrationsService: OrganizationRegistrationsService;
  let authService: AuthService;
  let organizationsService: OrganizationsService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let platformAdminUserId: string;
  let platformOrganizationId: string;
  let schoolAdminUserId: string;
  let schoolOrganizationId: string;

  const registrationPermission = 'platform.organization.registration.approve';
  const testContactPhone = '+919876543210';

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

    const platformRoleDefinition = PLATFORM_ROLE_DEFINITIONS[0];
    const platformRole =
      (await prisma.role.findFirst({
        where: { code: platformRoleDefinition.code, organizationId: null },
      })) ??
      (await prisma.role.create({
        data: {
          organizationId: null,
          code: platformRoleDefinition.code,
          name: platformRoleDefinition.name,
        },
      }));

    for (const permissionCode of platformRoleDefinition.permissions) {
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

    const platformOrganization =
      (await prisma.organization.findUnique({
        where: { code: PLATFORM_ORGANIZATION_CODE },
      })) ??
      (await prisma.organization.create({
        data: {
          name: 'CampusOps Platform',
          code: PLATFORM_ORGANIZATION_CODE,
        },
      }));
    platformOrganizationId = platformOrganization.id;

    const platformSettings = await prisma.organizationSettings.findUnique({
      where: { organizationId: platformOrganizationId },
    });
    if (!platformSettings) {
      await prisma.organizationSettings.create({
        data: { organizationId: platformOrganizationId },
      });
    }

    const suffix = Date.now();
    const platformAdmin = await prisma.user.create({
      data: {
        organizationId: platformOrganizationId,
        email: `platform-admin-${suffix}@example.com`,
        passwordHash: await new PasswordService().hash('PlatformAdmin123!'),
        status: UserStatus.ACTIVE,
      },
    });
    platformAdminUserId = platformAdmin.id;
    await prisma.userRole.create({
      data: {
        userId: platformAdminUserId,
        roleId: platformRole.id,
      },
    });

    const passwordService = new PasswordService();
    organizationsService = new OrganizationsService(
      prisma as unknown as PrismaService,
      passwordService,
    );
    const auditService = new AuditService(prisma as unknown as PrismaService);
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);

    const configService = {
      get: (key: string) => {
        if (key === AUTH_CONFIG_KEY) {
          return {
            accessSecret: process.env.JWT_ACCESS_SECRET,
            accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
            refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
          };
        }
        if (key === CONFIGURATION_KEY) {
          return { corsOrigin: 'http://localhost:3000' };
        }
        return undefined;
      },
    };

    const tokenService = new TokenService(
      new JwtService({ secret: process.env.JWT_ACCESS_SECRET }),
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
      auditService,
    );

    registrationsService = new OrganizationRegistrationsService(
      prisma as unknown as PrismaService,
      auditService,
      configService as unknown as ConfigService,
      {
        sendEmail: jest.fn().mockResolvedValue(undefined),
      },
    );

    const schoolBootstrap = await organizationsService.bootstrapOrganization({
      name: 'Existing School',
      code: `existing-school-${suffix}`,
      admin: {
        email: `existing-school-admin-${suffix}@example.com`,
        password: 'SchoolAdmin123!',
      },
    });
    schoolAdminUserId = schoolBootstrap.admin.id;
    schoolOrganizationId = schoolBootstrap.organization.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function cleanupRegistrationArtifacts(registrationId: string): Promise<void> {
    const registration = await prisma.organizationRegistrationRequest.findUnique({
      where: { id: registrationId },
    });

    if (!registration?.organizationId) {
      await prisma.organizationRegistrationRequest.deleteMany({ where: { id: registrationId } });
      return;
    }

    const organizationId = registration.organizationId;
    const users = await prisma.user.findMany({ where: { organizationId } });
    const userIds = users.map((user) => user.id);

    await prisma.auditLog.deleteMany({ where: { organizationId } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.approvalAction.deleteMany({
      where: { approvalRequest: { organizationId } },
    });
    await prisma.approvalRequest.deleteMany({ where: { organizationId } });
    await prisma.approvalLevel.deleteMany({
      where: { workflow: { organizationId } },
    });
    await prisma.approvalWorkflow.deleteMany({ where: { organizationId } });
    const roles = await prisma.role.findMany({ where: { organizationId } });
    for (const role of roles) {
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    }
    await prisma.role.deleteMany({ where: { organizationId } });
    await prisma.organizationSettings.deleteMany({ where: { organizationId } });
    await prisma.assetCategory.deleteMany({ where: { organizationId } });
    await prisma.documentTemplate.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.organizationRegistrationRequest.deleteMany({ where: { id: registrationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }

  function buildGuardContext(user: {
    userId: string;
    organizationId: string;
    email: string;
    sessionId?: string;
  }) {
    const request = {
      user: {
        userId: user.userId,
        organizationId: user.organizationId,
        sessionId: user.sessionId ?? 'test-session',
        email: user.email,
      },
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;
  }

  it('runs the full onboarding success flow', async () => {
    const suffix = Date.now();
    const contactEmail = `onboarding-principal-${suffix}@example.com`;

    const registration = await registrationsService.submitRegistrationRequest({
      organizationName: 'Onboarding Test School',
      contactEmail,
      contactPhone: testContactPhone,
      contactFirstName: 'Priya',
      contactLastName: 'Sharma',
    });

    expect(registration.status).toBe('PENDING');

    const pending = await registrationsService.findPending();
    expect(pending.some((request) => request.id === registration.id)).toBe(true);

    const approval = await registrationsService.approveRegistration(
      registration.id,
      platformAdminUserId,
    );

    expect(approval.organizationCode).toBe('onboarding-test-school');
    expect(approval.completeSignupUrl).toContain(registration.id);
    expect(approval.completeSignupUrl).toContain(approval.organizationCode);

    const signupContext = await registrationsService.getSignupContext(registration.id);
    expect(signupContext.signupCompleted).toBe(false);
    expect(signupContext.organizationCode).toBe(approval.organizationCode);

    const completeSignupResult = await authService.completeSignup(
      registration.id,
      'NewSchoolAdmin123!',
    );
    expect(completeSignupResult.organizationCode).toBe(approval.organizationCode);

    const loginResult = await authService.login(
      {
        email: contactEmail,
        password: 'NewSchoolAdmin123!',
      },
      {},
    );
    if (!('user' in loginResult)) {
      throw new Error('Expected a single-role login session');
    }
    expect(loginResult.user.organizationId).toBe(approval.organizationId);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        organizationId: approval.organizationId,
        action: {
          in: [
            AUDIT_ACTIONS.ORGANIZATION_REGISTRATION_APPROVED,
            AUDIT_ACTIONS.ORGANIZATION_SIGNUP_COMPLETED,
          ],
        },
      },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(2);

    await cleanupRegistrationArtifacts(registration.id);
  });

  it('rejects duplicate pending registration for the same email', async () => {
    const suffix = Date.now();
    const contactEmail = `duplicate-${suffix}@example.com`;
    const registration = await registrationsService.submitRegistrationRequest({
      organizationName: 'Duplicate School',
      contactEmail,
      contactPhone: testContactPhone,
      contactFirstName: 'A',
      contactLastName: 'B',
    });

    await expect(
      registrationsService.submitRegistrationRequest({
        organizationName: 'Duplicate School 2',
        contactEmail,
        contactPhone: testContactPhone,
        contactFirstName: 'C',
        contactLastName: 'D',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await prisma.organizationRegistrationRequest.delete({ where: { id: registration.id } });
  });

  it('rejects registration when email already belongs to a user', async () => {
    const schoolAdmin = await prisma.user.findUniqueOrThrow({ where: { id: schoolAdminUserId } });

    await expect(
      registrationsService.submitRegistrationRequest({
        organizationName: 'Blocked School',
        contactEmail: schoolAdmin.email,
        contactPhone: testContactPhone,
        contactFirstName: 'A',
        contactLastName: 'B',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('denies school admin from approving registrations', async () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([registrationPermission]);
    const schoolAdmin = await prisma.user.findUniqueOrThrow({ where: { id: schoolAdminUserId } });

    await expect(
      permissionsGuard.canActivate(
        buildGuardContext({
          userId: schoolAdmin.id,
          organizationId: schoolOrganizationId,
          email: schoolAdmin.email,
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows platform admin to pass registration approval permission guard', async () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([registrationPermission]);
    const platformAdmin = await prisma.user.findUniqueOrThrow({ where: { id: platformAdminUserId } });

    await expect(
      permissionsGuard.canActivate(
        buildGuardContext({
          userId: platformAdmin.id,
          organizationId: platformOrganizationId,
          email: platformAdmin.email,
        }),
      ),
    ).resolves.toBe(true);
  });

  it('prevents complete signup for rejected registration', async () => {
    const suffix = Date.now();
    const registration = await registrationsService.submitRegistrationRequest({
      organizationName: 'Rejected School',
      contactEmail: `rejected-${suffix}@example.com`,
      contactPhone: testContactPhone,
      contactFirstName: 'R',
      contactLastName: 'J',
    });

    await registrationsService.rejectRegistration(
      registration.id,
      'Incomplete details',
      platformAdminUserId,
    );

    await expect(authService.completeSignup(registration.id, 'Password123!')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(registrationsService.getSignupContext(registration.id)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    await prisma.organizationRegistrationRequest.delete({ where: { id: registration.id } });
  });

  it('prevents replaying complete signup after password is set', async () => {
    const suffix = Date.now();
    const contactEmail = `replay-${suffix}@example.com`;
    const registration = await registrationsService.submitRegistrationRequest({
      organizationName: 'Replay School',
      contactEmail,
      contactPhone: testContactPhone,
      contactFirstName: 'Replay',
      contactLastName: 'Test',
    });

    await registrationsService.approveRegistration(registration.id, platformAdminUserId);
    await authService.completeSignup(registration.id, 'ReplayPassword123!');

    await expect(authService.completeSignup(registration.id, 'AnotherPassword123!')).rejects.toBeInstanceOf(
      ConflictException,
    );

    const signupContext = await registrationsService.getSignupContext(registration.id);
    expect(signupContext.signupCompleted).toBe(true);

    await cleanupRegistrationArtifacts(registration.id);
  });

  it('scopes complete signup to the approved organization', async () => {
    const suffix = Date.now();
    const contactEmail = `scope-${suffix}@example.com`;
    const registration = await registrationsService.submitRegistrationRequest({
      organizationName: 'Scope School',
      contactEmail,
      contactPhone: testContactPhone,
      contactFirstName: 'Scope',
      contactLastName: 'Test',
    });

    const approval = await registrationsService.approveRegistration(
      registration.id,
      platformAdminUserId,
    );

    const adminUser = await prisma.user.findFirstOrThrow({
      where: {
        organizationId: approval.organizationId,
        email: contactEmail,
      },
    });
    expect(adminUser.organizationId).toBe(approval.organizationId);
    expect(adminUser.organizationId).not.toBe(schoolOrganizationId);

    await cleanupRegistrationArtifacts(registration.id);
  });

  it('returns unauthorized for unknown signup context', async () => {
    await expect(
      registrationsService.getSignupContext('00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
