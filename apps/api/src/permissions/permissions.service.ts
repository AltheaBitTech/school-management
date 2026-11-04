import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Permissions for the active login role only.
   * Returns null when that role is not assigned in this organization.
   */
  async getEffectivePermissions(
    userId: string,
    organizationId: string,
    activeRoleId: string,
  ): Promise<string[] | null> {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId: activeRoleId,
      },
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

    if (!assignment) {
      return null;
    }

    if (!this.isRoleApplicableToOrganization(assignment.role.organizationId, organizationId)) {
      return null;
    }

    const permissionCodes = new Set<string>();
    for (const rolePermission of assignment.role.rolePermissions) {
      permissionCodes.add(rolePermission.permission.code);
    }

    return [...permissionCodes].sort();
  }

  async userHasAllPermissions(
    userId: string,
    organizationId: string,
    requiredPermissions: string[],
    activeRoleId: string,
  ): Promise<boolean> {
    if (requiredPermissions.length === 0) {
      return true;
    }

    const effectivePermissions = await this.getEffectivePermissions(
      userId,
      organizationId,
      activeRoleId,
    );
    if (!effectivePermissions) {
      return false;
    }

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
