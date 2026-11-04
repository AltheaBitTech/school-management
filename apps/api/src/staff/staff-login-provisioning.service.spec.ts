import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { RBAC_ERROR_CODES } from '../common/constants/rbac.constants';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { STAFF_ERROR_CODES } from './constants/staff.constants';
import { StaffLoginProvisioningService } from './staff-login-provisioning.service';

describe('StaffLoginProvisioningService', () => {
  let service: StaffLoginProvisioningService;
  let prisma: {
    staff: { findFirst: jest.Mock; update: jest.Mock };
    role: { findUnique: jest.Mock };
    user: { findFirst: jest.Mock; create: jest.Mock };
    userRole: { create: jest.Mock };
    passwordResetToken: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let rolesService: jest.Mocked<
    Pick<RolesService, 'assertRoleAssignmentAllowed' | 'assignRoleToUser'>
  >;
  let auditService: jest.Mocked<Pick<AuditService, 'record'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  const actor = {
    userId: 'actor-1',
    organizationId: 'org-a',
    sessionId: 'session-1',
    email: 'admin@example.com',
  };

  const staffRecord = {
    id: 'staff-1',
    organizationId: 'org-a',
    userId: null,
    firstName: 'Mira',
    lastName: 'Sharma',
    employmentStatus: EmploymentStatus.ACTIVE,
    department: null,
    organization: { code: 'demo-school' },
  };

  const roleRecord = {
    id: 'role-a',
    organizationId: 'org-a',
    code: 'TEACHER',
    name: 'Teacher',
  };

  beforeEach(() => {
    prisma = {
      staff: { findFirst: jest.fn(), update: jest.fn() },
      role: { findUnique: jest.fn() },
      user: { findFirst: jest.fn(), create: jest.fn() },
      userRole: { create: jest.fn() },
      passwordResetToken: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    rolesService = {
      assertRoleAssignmentAllowed: jest.fn().mockResolvedValue(undefined),
      assignRoleToUser: jest.fn().mockResolvedValue(undefined),
    };
    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn().mockReturnValue({ corsOrigin: 'http://localhost:3000' }),
    };

    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
    );

    service = new StaffLoginProvisioningService(
      prisma as unknown as PrismaService,
      rolesService as unknown as RolesService,
      auditService as unknown as AuditService,
      configService as unknown as ConfigService,
    );
  });

  it('provisions login with an invite link on the happy path', async () => {
    prisma.staff.findFirst.mockResolvedValue(staffRecord);
    prisma.role.findUnique.mockResolvedValue(roleRecord);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      organizationId: 'org-a',
      email: 'staff@example.com',
    });
    prisma.staff.update.mockResolvedValue({
      ...staffRecord,
      userId: 'user-1',
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = await service.provisionLogin(actor, 'staff-1', {
      email: 'Staff@Example.com',
      roleId: 'role-a',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-a',
        email: 'staff@example.com',
        passwordHash: null,
        status: 'ACTIVE',
      },
    });
    expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    expect(result.loginEmail).toBe('staff@example.com');
    expect(result.inviteUrl).toContain('isInvite=true');
    expect(result.inviteExpiresAt).toBeTruthy();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('rejects duplicate email in the organization', async () => {
    prisma.staff.findFirst.mockResolvedValue(staffRecord);
    prisma.role.findUnique.mockResolvedValue(roleRecord);
    prisma.user.findFirst.mockResolvedValue({ id: 'existing-user', organizationId: 'org-b' });

    await expect(
      service.provisionLogin(actor, 'staff-1', {
        email: 'staff@example.com',
        roleId: 'role-a',
      }),
    ).rejects.toMatchObject({
      response: { code: STAFF_ERROR_CODES.DUPLICATE_USER_EMAIL },
    });
  });

  it('assigns another role to an existing unlinked user instead of creating a duplicate', async () => {
    prisma.staff.findFirst.mockResolvedValueOnce(staffRecord).mockResolvedValueOnce(null);
    prisma.role.findUnique.mockResolvedValue(roleRecord);
    prisma.user.findFirst.mockResolvedValue({
      id: 'existing-user',
      organizationId: 'org-a',
      passwordHash: 'hash',
    });
    prisma.staff.update.mockResolvedValue({ ...staffRecord, userId: 'existing-user' });

    const result = await service.provisionLogin(actor, 'staff-1', {
      email: 'staff@example.com',
      roleId: 'role-a',
    });

    expect(rolesService.assignRoleToUser).toHaveBeenCalledWith(
      actor,
      'existing-user',
      'role-a',
      undefined,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(result.loginEmail).toBe('staff@example.com');
    expect(result.inviteUrl).toBe('');
  });

  it('rejects platform roles', async () => {
    prisma.staff.findFirst.mockResolvedValue(staffRecord);
    prisma.role.findUnique.mockResolvedValue({
      id: 'platform-role',
      organizationId: null,
    });

    await expect(
      service.provisionLogin(actor, 'staff-1', {
        email: 'staff@example.com',
        roleId: 'platform-role',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing staff', async () => {
    prisma.staff.findFirst.mockResolvedValue(null);

    await expect(
      service.provisionLogin(actor, 'missing', {
        email: 'staff@example.com',
        roleId: 'role-a',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

