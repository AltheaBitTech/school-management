import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermissions(userId: string, organizationId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissionCodes = new Set<string>();

    for (const userRole of userRoles) {
      const role = userRole.role;

      if (!this.isRoleApplicableToOrganization(role.organizationId, organizationId)) {
        continue;
      }

      for (const rolePermission of role.rolePermissions) {
        permissionCodes.add(rolePermission.permission.code);
      }
    }

    return [...permissionCodes].sort();
  }

  async userHasAllPermissions(
    userId: string,
    organizationId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    if (requiredPermissions.length === 0) {
      return true;
    }

    const effectivePermissions = await this.getEffectivePermissions(userId, organizationId);
    return requiredPermissions.every((permission) => effectivePermissions.includes(permission));
  }

  async userHasPlatformRole(userId: string): Promise<boolean> {
    const platformRoleCount = await this.prisma.userRole.count({
      where: {
        userId,
        role: {
          organizationId: null,
        },
      },
    });

    return platformRoleCount > 0;
  }

  isRoleApplicableToOrganization(
    roleOrganizationId: string | null,
    userOrganizationId: string,
  ): boolean {
    if (roleOrganizationId === null) {
      return true;
    }

    return roleOrganizationId === userOrganizationId;
  }
}
