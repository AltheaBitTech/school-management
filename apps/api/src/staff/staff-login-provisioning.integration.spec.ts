import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/constants/audit.constants';
import { AuthService } from '../auth/auth.service';
import { PasswordService } from '../auth/services/password.service';
import { RefreshSessionService } from '../auth/services/refresh-session.service';
import { TokenService } from '../auth/services/token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIG_KEY } from '../config/auth.configuration';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PLATFORM_ROLE_CODES } from '../permissions/constants/system-roles';
import { PrismaService } from '../prisma/prisma.service';
import { ensureSchoolAdminRole } from '../roles/organization-role-seed.util';
import { RolesService } from '../roles/roles.service';
import { DepartmentsService } from '../departments/departments.service';
import { StaffService } from './staff.service';
import { StaffLoginProvisioningService } from './staff-login-provisioning.service';
import { STAFF_ERROR_CODES } from './constants/staff.constants';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Staff login provisioning integration', () => {
  let prisma: PrismaClient;
  let staffLoginProvisioningService: StaffLoginProvisioningService;
  let staffService: StaffService;
  let authService: AuthService;
  let rolesService: RolesService;
  let orgAId: string;
  let orgBId: string;
  let orgACode: string;
  let adminActor: {
    userId: string;
    organizationId: string;
    sessionId: string;
    email: string;
  };
  let schoolAdminRoleAId: string;
  let schoolAdminRoleBId: string;
  let platformRoleId: string;

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
      data: { name: 'Provision School A', code: `provision-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Provision School B', code: `provision-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;
    orgACode = orgA.code;

    const passwordService = new PasswordService();
    const schoolAdminRoleA = await ensureSchoolAdminRole(prisma, orgAId);
    const schoolAdminRoleB = await ensureSchoolAdminRole(prisma, orgBId);
    schoolAdminRoleAId = schoolAdminRoleA.id;
    schoolAdminRoleBId = schoolAdminRoleB.id;

    let platformRole = await prisma.role.findFirst({
      where: { organizationId: null, code: PLATFORM_ROLE_CODES.SAAS_SUPER_ADMIN },
    });
    if (!platformRole) {
      platformRole = await prisma.role.create({
        data: {
          organizationId: null,
          code: PLATFORM_ROLE_CODES.SAAS_SUPER_ADMIN,
          name: 'SaaS Super Admin',
        },
      });
    }
    platformRoleId = platformRole.id;

    const adminA = await prisma.user.create({
      data: {
        organizationId: orgAId,
        email: `provision-admin-a-${Date.now()}@example.com`,
        passwordHash: await passwordService.hash('AdminPass123!'),
      },
    });
    adminActor = {
      userId: adminA.id,
      organizationId: orgAId,
      sessionId: 'session-admin-a',
      email: adminA.email,
    };

    await prisma.userRole.create({
      data: { userId: adminA.id, roleId: schoolAdminRoleAId },
    });

    const permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    const auditService = new AuditService(prisma as unknown as PrismaService);
    rolesService = new RolesService(
      prisma as unknown as PrismaService,
      permissionsService,
      auditService,
    );
    staffLoginProvisioningService = new StaffLoginProvisioningService(
      prisma as unknown as PrismaService,
      passwordService,
      rolesService,
      auditService,
    );
    const departmentsService = new DepartmentsService(prisma as unknown as PrismaService);
    staffService = new StaffService(prisma as unknown as PrismaService, departmentsService);

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
    const jwtService = new JwtService({});
    const tokenService = new TokenService(
      jwtService,
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
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.refreshSession.deleteMany({
      where: { user: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.userRole.deleteMany({
      where: { user: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.rolePermission.deleteMany({
      where: { role: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.role.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('provisions login, links staff, assigns role, audits, and authenticates', async () => {
    const staff = await staffService.create(orgAId, {
      employeeCode: 'provision-001',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'rajesh.kumar@example.com',
    });

    const password = 'TemporaryPass123!';
    const result = await staffLoginProvisioningService.provisionLogin(
      adminActor,
      staff.id,
      {
        email: 'rajesh.kumar@example.com',
        password,
        roleId: schoolAdminRoleAId,
      },
      { requestId: 'req-provision-1' },
    );

    expect(result.loginEmail).toBe('rajesh.kumar@example.com');
    expect(result.staff.userId).toBeDefined();

    const linkedStaff = await prisma.staff.findFirst({
      where: { id: staff.id, organizationId: orgAId },
    });
    expect(linkedStaff?.userId).toBe(result.staff.userId);

    const createdUser = await prisma.user.findUnique({
      where: { id: result.staff.userId! },
    });
    expect(createdUser?.email).toBe('rajesh.kumar@example.com');
    expect(createdUser?.passwordHash).toBeDefined();
    expect(createdUser?.passwordHash).not.toBe(password);

    const userRole = await prisma.userRole.findFirst({
      where: { userId: createdUser!.id, roleId: schoolAdminRoleAId },
    });
    expect(userRole).not.toBeNull();

    const userCreatedAudit = await prisma.auditLog.findFirst({
      where: {
        organizationId: orgAId,
        entityId: createdUser!.id,
        action: AUDIT_ACTIONS.USER_CREATED,
      },
    });
    expect(userCreatedAudit).not.toBeNull();

    const roleAssignedAudit = await prisma.auditLog.findFirst({
      where: {
        organizationId: orgAId,
        entityId: createdUser!.id,
        action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
      },
    });
    expect(roleAssignedAudit).not.toBeNull();

    const loginResult = await authService.login(
      {
        organizationCode: orgACode,
        email: 'rajesh.kumar@example.com',
        password,
      },
      {},
    );
    expect(loginResult.user.organizationId).toBe(orgAId);
  });

  it('rejects duplicate provisioning for the same staff member', async () => {
    const staff = await staffService.create(orgAId, {
      employeeCode: 'provision-dup',
      firstName: 'Dup',
      lastName: 'Staff',
    });

    await staffLoginProvisioningService.provisionLogin(adminActor, staff.id, {
      email: `dup-staff-${Date.now()}@example.com`,
      password: 'TemporaryPass123!',
      roleId: schoolAdminRoleAId,
    });

    await expect(
      staffLoginProvisioningService.provisionLogin(adminActor, staff.id, {
        email: `dup-staff-2-${Date.now()}@example.com`,
        password: 'TemporaryPass123!',
        roleId: schoolAdminRoleAId,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks cross-tenant staff provisioning', async () => {
    const staffB = await staffService.create(orgBId, {
      employeeCode: 'cross-provision',
      firstName: 'Cross',
      lastName: 'Tenant',
    });

    await expect(
      staffLoginProvisioningService.provisionLogin(adminActor, staffB.id, {
        email: `cross-${Date.now()}@example.com`,
        password: 'TemporaryPass123!',
        roleId: schoolAdminRoleBId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects platform role assignment during provisioning', async () => {
    const staff = await staffService.create(orgAId, {
      employeeCode: 'platform-role-staff',
      firstName: 'Platform',
      lastName: 'Blocked',
    });

    await expect(
      staffLoginProvisioningService.provisionLogin(adminActor, staff.id, {
        email: `platform-blocked-${Date.now()}@example.com`,
        password: 'TemporaryPass123!',
        roleId: platformRoleId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects cross-tenant role assignment during provisioning', async () => {
    const staff = await staffService.create(orgAId, {
      employeeCode: 'cross-role-staff',
      firstName: 'Cross',
      lastName: 'Role',
    });

    await expect(
      staffLoginProvisioningService.provisionLogin(adminActor, staff.id, {
        email: `cross-role-${Date.now()}@example.com`,
        password: 'TemporaryPass123!',
        roleId: schoolAdminRoleBId,
      }),
    ).rejects.toMatchObject({
      response: { code: STAFF_ERROR_CODES.INVALID_ROLE },
    });
  });
});
