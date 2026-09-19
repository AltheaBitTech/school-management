import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { PasswordService } from '../auth/services/password.service';
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
    $transaction: jest.Mock;
  };
  let passwordService: jest.Mocked<Pick<PasswordService, 'hash'>>;
  let rolesService: jest.Mocked<Pick<RolesService, 'assertRoleAssignmentAllowed'>>;
  let auditService: jest.Mocked<Pick<AuditService, 'record'>>;

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
    employmentStatus: EmploymentStatus.ACTIVE,
    department: null,
  };

  const roleRecord = {
    id: 'role-a',
    organizationId: 'org-a',
    code: 'SCHOOL_ADMIN',
    name: 'School Admin',
  };

  beforeEach(() => {
    prisma = {
      staff: { findFirst: jest.fn(), update: jest.fn() },
      role: { findUnique: jest.fn() },
      user: { findFirst: jest.fn(), create: jest.fn() },
      userRole: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    passwordService = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
    };
    rolesService = {
      assertRoleAssignmentAllowed: jest.fn().mockResolvedValue(undefined),
    };
    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
    );

    service = new StaffLoginProvisioningService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
      rolesService as unknown as RolesService,
      auditService as unknown as AuditService,
    );
  });

  it('provisions login on the happy path', async () => {
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

    const result = await service.provisionLogin(actor, 'staff-1', {
      email: 'Staff@Example.com',
      password: 'TemporaryPass123!',
      roleId: 'role-a',
    });

    expect(passwordService.hash).toHaveBeenCalledWith('TemporaryPass123!');
    expect(rolesService.assertRoleAssignmentAllowed).toHaveBeenCalled();
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-a',
        email: 'staff@example.com',
        passwordHash: 'hashed-password',
        status: 'ACTIVE',
      },
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.USER_CREATED,
        entityType: AUDIT_ENTITY_TYPES.USER,
      }),
      prisma,
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
      }),
      prisma,
    );
    expect(result.loginEmail).toBe('staff@example.com');
    expect(result.staff.userId).toBe('user-1');
  });

  it('rejects staff not found', async () => {
    prisma.staff.findFirst.mockResolvedValue(null);

    await expect(
      service.provisionLogin(actor, 'missing-staff', {
        email: 'staff@example.com',
        password: 'TemporaryPass123!',
        roleId: 'role-a',
      }),
    ).rejects.toMatchObject({
      response: { code: STAFF_ERROR_CODES.STAFF_NOT_FOUND },
    });
  });

  it('rejects cross-tenant staff access', async () => {
    prisma.staff.findFirst.mockResolvedValue(null);

    await expect(
      service.provisionLogin(
        { ...actor, organizationId: 'org-b' },
        'staff-1',
        {
          email: 'staff@example.com',
          password: 'TemporaryPass123!',
          roleId: 'role-a',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects already provisioned staff', async () => {
    prisma.staff.findFirst.mockResolvedValue({
      ...staffRecord,
      userId: 'existing-user',
    });

    await expect(
      service.provisionLogin(actor, 'staff-1', {
        email: 'staff@example.com',
        password: 'TemporaryPass123!',
        roleId: 'role-a',
      }),
    ).rejects.toMatchObject({
      response: { code: STAFF_ERROR_CODES.STAFF_LOGIN_ALREADY_PROVISIONED },
    });
  });

  it('rejects offboarded staff', async () => {
    prisma.staff.findFirst.mockResolvedValue({
      ...staffRecord,
      employmentStatus: EmploymentStatus.OFFBOARDED,
    });

    await expect(
      service.provisionLogin(actor, 'staff-1', {
        email: 'staff@example.com',
        password: 'TemporaryPass123!',
        roleId: 'role-a',
      }),
    ).rejects.toMatchObject({
      response: { code: STAFF_ERROR_CODES.STAFF_NOT_ELIGIBLE_FOR_LOGIN },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate email in the organization', async () => {
    prisma.staff.findFirst.mockResolvedValue(staffRecord);
    prisma.role.findUnique.mockResolvedValue(roleRecord);
    prisma.user.findFirst.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.provisionLogin(actor, 'staff-1', {
        email: 'staff@example.com',
        password: 'TemporaryPass123!',
        roleId: 'role-a',
      }),
    ).rejects.toMatchObject({
      response: { code: STAFF_ERROR_CODES.DUPLICATE_USER_EMAIL },
    });
  });

  it('rejects invalid role', async () => {
    prisma.staff.findFirst.mockResolvedValue(staffRecord);
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(
      service.provisionLogin(actor, 'staff-1', {
        email: 'staff@example.com',
        password: 'TemporaryPass123!',
        roleId: 'missing-role',
      }),
    ).rejects.toMatchObject({
      response: { code: STAFF_ERROR_CODES.INVALID_ROLE },
    });
  });

  it('rejects cross-tenant roles', async () => {
    prisma.staff.findFirst.mockResolvedValue(staffRecord);
    prisma.role.findUnique.mockResolvedValue({
      ...roleRecord,
      organizationId: 'org-b',
    });

    await expect(
      service.provisionLogin(actor, 'staff-1', {
        email: 'staff@example.com',
        password: 'TemporaryPass123!',
        roleId: 'role-a',
      }),
    ).rejects.toMatchObject({
      response: { code: STAFF_ERROR_CODES.INVALID_ROLE },
    });
  });

  it('rejects platform roles', async () => {
    prisma.staff.findFirst.mockResolvedValue(staffRecord);
    prisma.role.findUnique.mockResolvedValue({
      ...roleRecord,
      organizationId: null,
    });

    await expect(
      service.provisionLogin(actor, 'staff-1', {
        email: 'staff@example.com',
        password: 'TemporaryPass123!',
        roleId: 'role-a',
      }),
    ).rejects.toMatchObject({
      response: { code: RBAC_ERROR_CODES.PLATFORM_ROLE_ASSIGNMENT_FORBIDDEN },
    });
  });

  it('does not persist partial state when role assignment is forbidden inside the transaction', async () => {
    prisma.staff.findFirst.mockResolvedValue(staffRecord);
    prisma.role.findUnique.mockResolvedValue(roleRecord);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      organizationId: 'org-a',
      email: 'staff@example.com',
    });
    rolesService.assertRoleAssignmentAllowed.mockRejectedValue(
      new ForbiddenException({
        code: RBAC_ERROR_CODES.FORBIDDEN,
        message: 'You do not have permission to perform this action',
      }),
    );

    await expect(
      service.provisionLogin(actor, 'staff-1', {
        email: 'staff@example.com',
        password: 'TemporaryPass123!',
        roleId: 'role-a',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.staff.update).not.toHaveBeenCalled();
  });
});
