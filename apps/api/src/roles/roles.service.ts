import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { RBAC_ERROR_CODES } from '../common/constants/rbac.constants';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
  ) {}

  async listOrganizationRoles(organizationId: string): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: { organizationId },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  toDto(role: Role) {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
    };
  }

  async assignRoleToUser(
    actor: AuthenticatedUser,
    targetUserId: string,
    roleId: string,
    options?: { requestId?: string },
  ): Promise<void> {
    const [targetUser, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: targetUserId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!targetUser) {
      throw new NotFoundException({
        code: RBAC_ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    if (!role) {
      throw new NotFoundException({
        code: RBAC_ERROR_CODES.ROLE_NOT_FOUND,
        message: 'Role not found',
      });
    }

    await this.assertRoleAssignmentAllowed(actor, targetUser, role);

    const existingAssignment = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: targetUser.id,
          roleId: role.id,
        },
      },
    });

    if (existingAssignment) {
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userRole.create({
          data: {
            userId: targetUser.id,
            roleId: role.id,
          },
        });

        await this.auditService.record(
          {
            organizationId: targetUser.organizationId,
            actorUserId: actor.userId,
            action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
            entityType: AUDIT_ENTITY_TYPES.USER,
            entityId: targetUser.id,
            requestId: options?.requestId,
            metadata: {
              targetUserId: targetUser.id,
              roleId: role.id,
              roleCode: role.code,
              roleName: role.name,
            },
          },
          tx,
        );
      });
    } catch {
      throw new ConflictException({
        code: 'ROLE_ALREADY_ASSIGNED',
        message: 'Role is already assigned to this user',
      });
    }
  }

  async assertRoleAssignmentAllowed(
    actor: AuthenticatedUser,
    targetUser: { organizationId: string },
    role: Role,
  ): Promise<void> {
    const actorPermissions =
      (await this.permissionsService.getEffectivePermissions(
        actor.userId,
        actor.organizationId,
        actor.activeRoleId ?? '',
      )) ?? [];

    if (role.organizationId === null) {
      if (!actorPermissions.includes('platform.role.assign')) {
        throw new ForbiddenException({
          code: RBAC_ERROR_CODES.PLATFORM_ROLE_ASSIGNMENT_FORBIDDEN,
          message: 'You do not have permission to perform this action',
        });
      }

      return;
    }

    if (targetUser.organizationId !== role.organizationId) {
      throw new ForbiddenException({
        code: RBAC_ERROR_CODES.CROSS_TENANT_ROLE_ASSIGNMENT,
        message: 'You do not have permission to perform this action',
      });
    }

    if (actor.organizationId !== targetUser.organizationId) {
      throw new ForbiddenException({
        code: RBAC_ERROR_CODES.CROSS_TENANT_ROLE_ASSIGNMENT,
        message: 'You do not have permission to perform this action',
      });
    }

    if (!actorPermissions.includes('role.assign')) {
      throw new ForbiddenException({
        code: RBAC_ERROR_CODES.FORBIDDEN,
        message: 'You do not have permission to perform this action',
      });
    }
  }
}
