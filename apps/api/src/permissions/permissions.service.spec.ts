import { PermissionsService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PermissionsService', () => {
  let permissionsService: PermissionsService;
  let prisma: {
    userRole: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      userRole: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
  });

  it('includes platform role permissions for the authenticated organization context', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      {
        role: {
          organizationId: null,
          rolePermissions: [{ permission: { code: 'platform.role.assign' } }],
        },
      },
      {
        role: {
          organizationId: 'org-a',
          rolePermissions: [{ permission: { code: 'staff.view' } }],
        },
      },
    ]);

    const permissions = await permissionsService.getEffectivePermissions('user-1', 'org-a');

    expect(permissions).toEqual(['platform.role.assign', 'staff.view']);
  });

  it('excludes organization roles from another tenant', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      {
        role: {
          organizationId: 'org-b',
          rolePermissions: [{ permission: { code: 'complaint.view' } }],
        },
      },
      {
        role: {
          organizationId: 'org-a',
          rolePermissions: [{ permission: { code: 'staff.view' } }],
        },
      },
    ]);

    const permissions = await permissionsService.getEffectivePermissions('user-1', 'org-a');

    expect(permissions).toEqual(['staff.view']);
    expect(permissions).not.toContain('complaint.view');
  });

  it('requires all requested permissions', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      {
        role: {
          organizationId: 'org-a',
          rolePermissions: [{ permission: { code: 'staff.view' } }],
        },
      },
    ]);

    await expect(
      permissionsService.userHasAllPermissions('user-1', 'org-a', ['staff.view', 'staff.update']),
    ).resolves.toBe(false);
  });
});
