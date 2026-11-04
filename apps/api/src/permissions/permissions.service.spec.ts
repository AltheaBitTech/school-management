import { PermissionsService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PermissionsService', () => {
  let permissionsService: PermissionsService;
  let prisma: {
    userRole: {
      findFirst: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      userRole: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };

    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
  });

  it('returns only the active role permissions', async () => {
    prisma.userRole.findFirst.mockResolvedValue({
      role: {
        organizationId: 'org-a',
        rolePermissions: [{ permission: { code: 'staff.self.view' } }],
      },
    });

    const permissions = await permissionsService.getEffectivePermissions(
      'user-1',
      'org-a',
      'role-teacher',
    );

    expect(permissions).toEqual(['staff.self.view']);
    expect(prisma.userRole.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', roleId: 'role-teacher' },
      }),
    );
  });

  it('does not include another assigned role when the active role is different', async () => {
    prisma.userRole.findFirst.mockResolvedValue({
      role: {
        organizationId: 'org-a',
        rolePermissions: [{ permission: { code: 'notice.view' } }],
      },
    });

    const permissions = await permissionsService.getEffectivePermissions(
      'user-1',
      'org-a',
      'role-teacher',
    );

    expect(permissions).toEqual(['notice.view']);
    expect(permissions).not.toContain('role.assign');
  });

  it('returns null when the active role is not assigned', async () => {
    prisma.userRole.findFirst.mockResolvedValue(null);

    await expect(
      permissionsService.getEffectivePermissions('user-1', 'org-a', 'role-admin'),
    ).resolves.toBeNull();
  });

  it('returns null when the active role belongs to another organization', async () => {
    prisma.userRole.findFirst.mockResolvedValue({
      role: {
        organizationId: 'org-b',
        rolePermissions: [{ permission: { code: 'complaint.view' } }],
      },
    });

    await expect(
      permissionsService.getEffectivePermissions('user-1', 'org-a', 'role-other'),
    ).resolves.toBeNull();
  });

  it('keeps Principal and Teacher sessions from sharing each other’s permissions', async () => {
    prisma.userRole.findFirst.mockImplementation(async (args: { where: { roleId: string } }) => {
      if (args.where.roleId === 'role-principal') {
        return {
          role: {
            organizationId: 'org-a',
            rolePermissions: [
              { permission: { code: 'leave.approve' } },
              { permission: { code: 'notice.create' } },
            ],
          },
        };
      }
      return {
        role: {
          organizationId: 'org-a',
          rolePermissions: [
            { permission: { code: 'notice.view' } },
            { permission: { code: 'staff.self.leave.create' } },
          ],
        },
      };
    });

    const principal = await permissionsService.getEffectivePermissions('user-1', 'org-a', 'role-principal');
    const teacher = await permissionsService.getEffectivePermissions('user-1', 'org-a', 'role-teacher');

    expect(principal).toEqual(['leave.approve', 'notice.create']);
    expect(teacher).toEqual(['notice.view', 'staff.self.leave.create']);
    expect(teacher).not.toContain('leave.approve');
    expect(principal).not.toContain('staff.self.leave.create');
  });

  it('requires all requested permissions on the active role', async () => {
    prisma.userRole.findFirst.mockResolvedValue({
      role: {
        organizationId: 'org-a',
        rolePermissions: [{ permission: { code: 'staff.view' } }],
      },
    });

    await expect(
      permissionsService.userHasAllPermissions('user-1', 'org-a', ['staff.view', 'staff.update'], 'role-a'),
    ).resolves.toBe(false);
  });
});
