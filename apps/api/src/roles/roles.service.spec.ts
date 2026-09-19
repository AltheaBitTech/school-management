import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { RBAC_ERROR_CODES } from '../common/constants/rbac.constants';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';

describe('RolesService', () => {
  let rolesService: RolesService;
  let prisma: {
    user: { findUnique: jest.Mock };
    role: { findUnique: jest.Mock };
    userRole: { findUnique: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let permissionsService: jest.Mocked<Pick<PermissionsService, 'getEffectivePermissions'>>;
  let auditService: jest.Mocked<Pick<AuditService, 'record'>>;

  const actor = {
    userId: 'actor-1',
    organizationId: 'org-a',
    sessionId: 'session-1',
    email: 'actor@example.com',
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      role: { findUnique: jest.fn() },
      userRole: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };
    permissionsService = {
      getEffectivePermissions: jest.fn(),
    };
    auditService = {
      record: jest.fn(),
    };

    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<void>) =>
      callback(prisma),
    );

    rolesService = new RolesService(
      prisma as unknown as PrismaService,
      permissionsService as unknown as PermissionsService,
      auditService as unknown as AuditService,
    );
  });

  it('denies cross-tenant organization role assignment', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      organizationId: 'org-a',
    });
    prisma.role.findUnique.mockResolvedValue({
      id: 'role-b',
      organizationId: 'org-b',
    });
    permissionsService.getEffectivePermissions.mockResolvedValue(['role.assign']);

    await expect(
      rolesService.assignRoleToUser(actor, 'user-a', 'role-b'),
    ).rejects.toMatchObject({
      response: { code: RBAC_ERROR_CODES.CROSS_TENANT_ROLE_ASSIGNMENT },
    });
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('denies organization role assignment without role.assign permission', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      organizationId: 'org-a',
    });
    prisma.role.findUnique.mockResolvedValue({
      id: 'role-a',
      organizationId: 'org-a',
    });
    permissionsService.getEffectivePermissions.mockResolvedValue(['staff.view']);

    await expect(
      rolesService.assignRoleToUser(actor, 'user-a', 'role-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('denies platform role assignment without platform.role.assign permission', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      organizationId: 'org-a',
    });
    prisma.role.findUnique.mockResolvedValue({
      id: 'platform-role',
      organizationId: null,
    });
    permissionsService.getEffectivePermissions.mockResolvedValue(['role.assign']);

    await expect(
      rolesService.assignRoleToUser(actor, 'user-a', 'platform-role'),
    ).rejects.toMatchObject({
      response: { code: RBAC_ERROR_CODES.PLATFORM_ROLE_ASSIGNMENT_FORBIDDEN },
    });
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('assigns an organization role when actor and target belong to the same tenant', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      organizationId: 'org-a',
    });
    prisma.role.findUnique.mockResolvedValue({
      id: 'role-a',
      organizationId: 'org-a',
      code: 'SCHOOL_ADMIN',
      name: 'School Admin',
    });
    prisma.userRole.findUnique.mockResolvedValue(null);
    permissionsService.getEffectivePermissions.mockResolvedValue(['role.assign']);

    await rolesService.assignRoleToUser(actor, 'user-a', 'role-a', { requestId: 'req-1' });

    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-a',
        roleId: 'role-a',
      },
    });
    expect(auditService.record).toHaveBeenCalledWith(
      {
        organizationId: 'org-a',
        actorUserId: actor.userId,
        action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: 'user-a',
        requestId: 'req-1',
        metadata: {
          targetUserId: 'user-a',
          roleId: 'role-a',
          roleCode: 'SCHOOL_ADMIN',
          roleName: 'School Admin',
        },
      },
      prisma,
    );
  });

  it('returns not found for unknown users without leaking tenant details', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(rolesService.assignRoleToUser(actor, 'missing-user', 'role-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(auditService.record).not.toHaveBeenCalled();
  });
});
