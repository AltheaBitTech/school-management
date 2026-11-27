import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { RBAC_ERROR_CODES } from '../common/constants/rbac.constants';
import {
  ASSIGNABLE_ORGANIZATION_PERMISSION_CODES,
  PermissionGroup,
  groupPermissions,
} from '../permissions/constants/permission-groups';
import {
  ORGANIZATION_ROLE_CODES,
  ORGANIZATION_ROLE_DEFINITIONS,
} from '../permissions/constants/system-roles';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role-mutation.dto';
import { RoleDetailDto, RoleDto } from './dto/role-response.dto';

export const ROLE_MANAGEMENT_ERROR_CODES = {
  INVALID_PERMISSION: 'INVALID_PERMISSION',
  ROLE_LOCKED: 'ROLE_LOCKED',
  SYSTEM_ROLE_IMMUTABLE: 'SYSTEM_ROLE_IMMUTABLE',
  ROLE_NAME_TAKEN: 'ROLE_NAME_TAKEN',
  ROLE_IN_USE: 'ROLE_IN_USE',
  PERMISSION_ESCALATION: 'PERMISSION_ESCALATION',
} as const;

/** Roles whose permissions can never be edited, so an admin cannot lock themselves out. */
const LOCKED_ROLE_CODES = new Set<string>([ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN]);

const CUSTOM_ROLE_CODE_PREFIX = 'CUSTOM_';

type RoleWithCounts = Role & {
  _count: { rolePermissions: number; userRoles: number };
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class RoleManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
  ) {}

  getPermissionCatalog(): PermissionGroup[] {
    return groupPermissions();
  }

  async listRoles(organizationId: string): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }, { code: 'asc' }],
      include: { _count: { select: { rolePermissions: true, userRoles: true } } },
    });

    return roles.map((role) => this.toDto(role));
  }

  async getRole(organizationId: string, roleId: string): Promise<RoleDetailDto> {
    const role = await this.findOrganizationRole(this.prisma, organizationId, roleId);
    const permissions = await this.getRolePermissionCodes(this.prisma, role.id);

    return { ...this.toDto(role), permissions };
  }

  async createRole(
    actor: AuthenticatedUser,
    dto: CreateRoleDto,
    options?: { requestId?: string },
  ): Promise<RoleDetailDto> {
    const permissions = this.normalizePermissions(dto.permissions);
    await this.assertNoEscalation(actor, permissions);

    const role = await this.prisma.$transaction(async (tx) => {
      await this.assertNameAvailable(tx, actor.organizationId, dto.name);
      const code = await this.generateRoleCode(tx, actor.organizationId, dto.name);

      const created = await tx.role.create({
        data: {
          organizationId: actor.organizationId,
          code,
          name: dto.name,
          description: dto.description || null,
          isSystem: false,
        },
      });

      await this.replacePermissions(tx, created.id, permissions);

      await this.auditService.record(
        {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: AUDIT_ACTIONS.ROLE_CREATED,
          entityType: AUDIT_ENTITY_TYPES.ROLE,
          entityId: created.id,
          requestId: options?.requestId,
          metadata: { roleCode: code, roleName: dto.name, permissions },
        },
        tx,
      );

      return created;
    });

    return this.getRole(actor.organizationId, role.id);
  }

  async updateRole(
    actor: AuthenticatedUser,
    roleId: string,
    dto: UpdateRoleDto,
    options?: { requestId?: string },
  ): Promise<RoleDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      const role = await this.findOrganizationRole(tx, actor.organizationId, roleId);
      const data: Prisma.RoleUpdateInput = {};
      const metadata: Prisma.InputJsonObject & Record<string, Prisma.InputJsonValue> = {
        roleCode: role.code,
      };

      if (dto.name !== undefined && dto.name !== role.name) {
        if (role.isSystem) {
          throw new BadRequestException({
            code: ROLE_MANAGEMENT_ERROR_CODES.SYSTEM_ROLE_IMMUTABLE,
            message: 'Built-in roles cannot be renamed',
          });
        }
        await this.assertNameAvailable(tx, actor.organizationId, dto.name, role.id);
        data.name = dto.name;
        metadata.previousName = role.name;
        metadata.name = dto.name;
      }

      if (dto.description !== undefined) {
        data.description = dto.description || null;
      }

      if (dto.permissions !== undefined) {
        this.assertNotLocked(role);
        const nextPermissions = this.normalizePermissions(dto.permissions);
        const currentPermissions = await this.getRolePermissionCodes(tx, role.id);
        const current = new Set(currentPermissions);
        const next = new Set(nextPermissions);
        const added = nextPermissions.filter((code) => !current.has(code));
        const removed = currentPermissions.filter((code) => !next.has(code));

        // Only newly granted permissions need an escalation check; keeping or removing is fine.
        await this.assertNoEscalation(actor, added);

        if (added.length > 0 || removed.length > 0) {
          await this.replacePermissions(tx, role.id, nextPermissions);
          if (role.isSystem) {
            data.permissionsCustomizedAt = new Date();
          }
          metadata.addedPermissions = added;
          metadata.removedPermissions = removed;
        }
      }

      if (Object.keys(data).length > 0) {
        await tx.role.update({ where: { id: role.id }, data });
      }

      await this.auditService.record(
        {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: AUDIT_ACTIONS.ROLE_UPDATED,
          entityType: AUDIT_ENTITY_TYPES.ROLE,
          entityId: role.id,
          requestId: options?.requestId,
          metadata,
        },
        tx,
      );
    });

    return this.getRole(actor.organizationId, roleId);
  }

  /** Restore a built-in role to the permissions shipped in code. */
  async resetRole(
    actor: AuthenticatedUser,
    roleId: string,
    options?: { requestId?: string },
  ): Promise<RoleDetailDto> {
    await this.prisma.$transaction(async (tx) => {
      const role = await this.findOrganizationRole(tx, actor.organizationId, roleId);
      const definition = ORGANIZATION_ROLE_DEFINITIONS.find((entry) => entry.code === role.code);

      if (!role.isSystem || !definition) {
        throw new BadRequestException({
          code: ROLE_MANAGEMENT_ERROR_CODES.SYSTEM_ROLE_IMMUTABLE,
          message: 'Only built-in roles can be reset to default',
        });
      }
      this.assertNotLocked(role);

      await this.replacePermissions(tx, role.id, definition.permissions);
      await tx.role.update({
        where: { id: role.id },
        data: { permissionsCustomizedAt: null },
      });

      await this.auditService.record(
        {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: AUDIT_ACTIONS.ROLE_RESET,
          entityType: AUDIT_ENTITY_TYPES.ROLE,
          entityId: role.id,
          requestId: options?.requestId,
          metadata: { roleCode: role.code },
        },
        tx,
      );
    });

    return this.getRole(actor.organizationId, roleId);
  }

  async deleteRole(
    actor: AuthenticatedUser,
    roleId: string,
    options?: { requestId?: string },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const role = await this.findOrganizationRole(tx, actor.organizationId, roleId);

      if (role.isSystem) {
        throw new BadRequestException({
          code: ROLE_MANAGEMENT_ERROR_CODES.SYSTEM_ROLE_IMMUTABLE,
          message: 'Built-in roles cannot be deleted',
        });
      }

      const [userCount, approvalLevelCount] = await Promise.all([
        tx.userRole.count({ where: { roleId: role.id } }),
        tx.approvalLevel.count({ where: { roleId: role.id } }),
      ]);

      if (userCount > 0 || approvalLevelCount > 0) {
        throw new ConflictException({
          code: ROLE_MANAGEMENT_ERROR_CODES.ROLE_IN_USE,
          message:
            userCount > 0
              ? `This role is assigned to ${userCount} user(s). Remove it from them first.`
              : 'This role is used in an approval workflow. Update the workflow first.',
        });
      }

      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.role.delete({ where: { id: role.id } });

      await this.auditService.record(
        {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: AUDIT_ACTIONS.ROLE_DELETED,
          entityType: AUDIT_ENTITY_TYPES.ROLE,
          entityId: role.id,
          requestId: options?.requestId,
          metadata: { roleCode: role.code, roleName: role.name },
        },
        tx,
      );
    });
  }

  private toDto(role: RoleWithCounts): RoleDto {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isCustomized: role.permissionsCustomizedAt !== null,
      isLocked: LOCKED_ROLE_CODES.has(role.code),
      permissionCount: role._count.rolePermissions,
      userCount: role._count.userRoles,
    };
  }

  private async findOrganizationRole(
    client: Tx | PrismaService,
    organizationId: string,
    roleId: string,
  ): Promise<RoleWithCounts> {
    const role = await client.role.findFirst({
      where: { id: roleId, organizationId },
      include: { _count: { select: { rolePermissions: true, userRoles: true } } },
    });

    if (!role) {
      throw new NotFoundException({
        code: RBAC_ERROR_CODES.ROLE_NOT_FOUND,
        message: 'Role not found',
      });
    }

    return role;
  }

  private async getRolePermissionCodes(
    client: Tx | PrismaService,
    roleId: string,
  ): Promise<string[]> {
    const rows = await client.rolePermission.findMany({
      where: { roleId },
      select: { permission: { select: { code: true } } },
    });

    return rows.map((row) => row.permission.code).sort();
  }

  private normalizePermissions(codes: string[]): string[] {
    const unique = [...new Set(codes)];
    const invalid = unique.filter((code) => !ASSIGNABLE_ORGANIZATION_PERMISSION_CODES.has(code));

    if (invalid.length > 0) {
      throw new BadRequestException({
        code: ROLE_MANAGEMENT_ERROR_CODES.INVALID_PERMISSION,
        message: `Unknown or non-assignable permissions: ${invalid.join(', ')}`,
      });
    }

    return unique.sort();
  }

  private assertNotLocked(role: Role): void {
    if (LOCKED_ROLE_CODES.has(role.code)) {
      throw new ForbiddenException({
        code: ROLE_MANAGEMENT_ERROR_CODES.ROLE_LOCKED,
        message: `${role.name} permissions cannot be changed`,
      });
    }
  }

  private async assertNoEscalation(actor: AuthenticatedUser, granted: string[]): Promise<void> {
    if (granted.length === 0) {
      return;
    }

    // School Admin is the top of the organization: it may grant any organization permission
    // (e.g. leave.approve or self-service permissions it does not hold itself).
    if (actor.activeRoleId) {
      const activeRole = await this.prisma.role.findFirst({
        where: { id: actor.activeRoleId, organizationId: actor.organizationId },
        select: { code: true },
      });
      if (activeRole && LOCKED_ROLE_CODES.has(activeRole.code)) {
        return;
      }
    }

    const actorPermissions = new Set(
      (await this.permissionsService.getEffectivePermissions(
        actor.userId,
        actor.organizationId,
        actor.activeRoleId ?? '',
      )) ?? [],
    );
    const missing = granted.filter((code) => !actorPermissions.has(code));

    if (missing.length > 0) {
      throw new ForbiddenException({
        code: ROLE_MANAGEMENT_ERROR_CODES.PERMISSION_ESCALATION,
        message: `You cannot grant permissions you do not have: ${missing.join(', ')}`,
      });
    }
  }

  private async assertNameAvailable(
    tx: Tx,
    organizationId: string,
    name: string,
    excludeRoleId?: string,
  ): Promise<void> {
    const existing = await tx.role.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeRoleId ? { id: { not: excludeRoleId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException({
        code: ROLE_MANAGEMENT_ERROR_CODES.ROLE_NAME_TAKEN,
        message: 'A role with this name already exists',
      });
    }
  }

  private async generateRoleCode(tx: Tx, organizationId: string, name: string): Promise<string> {
    const slug =
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || 'ROLE';
    const base = `${CUSTOM_ROLE_CODE_PREFIX}${slug}`;

    for (let suffix = 1; suffix < 100; suffix += 1) {
      const code = suffix === 1 ? base : `${base}_${suffix}`;
      const taken = await tx.role.findUnique({
        where: { organizationId_code: { organizationId, code } },
        select: { id: true },
      });
      if (!taken) {
        return code;
      }
    }

    throw new ConflictException({
      code: ROLE_MANAGEMENT_ERROR_CODES.ROLE_NAME_TAKEN,
      message: 'Could not generate a unique role code',
    });
  }

  private async replacePermissions(tx: Tx, roleId: string, codes: string[]): Promise<void> {
    const permissions = await tx.permission.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });

    if (permissions.length !== codes.length) {
      const found = new Set(permissions.map((permission) => permission.code));
      throw new BadRequestException({
        code: ROLE_MANAGEMENT_ERROR_CODES.INVALID_PERMISSION,
        message: `Permissions not registered: ${codes.filter((code) => !found.has(code)).join(', ')}`,
      });
    }

    const ids = permissions.map((permission) => permission.id);
    await tx.rolePermission.deleteMany({
      where: { roleId, permissionId: { notIn: ids } },
    });
    await tx.rolePermission.createMany({
      data: ids.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }
}
