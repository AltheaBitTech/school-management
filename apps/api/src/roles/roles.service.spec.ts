import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { RBAC_ERROR_CODES } from '../common/constants/rbac.constants';

describe('RolesService', () => {
  let rolesService: RolesService;
  let prisma: {
    user: { findUnique: jest.Mock };
    role: { findUnique: jest.Mock };
    userRole: { findUnique: jest.Mock; create: jest.Mock };
  };
  let permissionsService: jest.Mocked<Pick<PermissionsService, 'getEffectivePermissions'>>;

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
    };
    permissionsService = {
      getEffectivePermissions: jest.fn(),
    };

    rolesService = new RolesService(
      prisma as unknown as PrismaService,
      permissionsService as unknown as PermissionsService,
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
  });

  it('assigns an organization role when actor and target belong to the same tenant', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-a',
      organizationId: 'org-a',
    });
    prisma.role.findUnique.mockResolvedValue({
      id: 'role-a',
      organizationId: 'org-a',
    });
    prisma.userRole.findUnique.mockResolvedValue(null);
    permissionsService.getEffectivePermissions.mockResolvedValue(['role.assign']);

    await rolesService.assignRoleToUser(actor, 'user-a', 'role-a');

    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-a',
        roleId: 'role-a',
      },
    });
  });

  it('returns not found for unknown users without leaking tenant details', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(rolesService.assignRoleToUser(actor, 'missing-user', 'role-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
