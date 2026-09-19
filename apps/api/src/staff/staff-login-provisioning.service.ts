import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus, Prisma, Role, Staff, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { PasswordService } from '../auth/services/password.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { normalizeEmail } from '../auth/utils/email.util';
import { RBAC_ERROR_CODES } from '../common/constants/rbac.constants';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { STAFF_ERROR_CODES } from './constants/staff.constants';
import { ProvisionStaffLoginDto } from './dto/provision-staff-login.dto';

type StaffWithDepartment = Staff & {
  department: { id: string; name: string; code: string } | null;
};

export interface ProvisionStaffLoginResult {
  staff: StaffWithDepartment;
  loginEmail: string;
}

@Injectable()
export class StaffLoginProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
  ) {}

  async provisionLogin(
    actor: AuthenticatedUser,
    staffId: string,
    dto: ProvisionStaffLoginDto,
    options?: { requestId?: string },
  ): Promise<ProvisionStaffLoginResult> {
    const organizationId = actor.organizationId;
    const normalizedEmail = normalizeEmail(dto.email);

    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, organizationId },
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException({
        code: STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        message: 'Staff member not found',
      });
    }

    if (staff.userId) {
      throw new ConflictException({
        code: STAFF_ERROR_CODES.STAFF_LOGIN_ALREADY_PROVISIONED,
        message: 'This staff member already has a linked login account',
      });
    }

    if (staff.employmentStatus === EmploymentStatus.OFFBOARDED) {
      throw new BadRequestException({
        code: STAFF_ERROR_CODES.STAFF_NOT_ELIGIBLE_FOR_LOGIN,
        message: 'Login cannot be provisioned for offboarded staff',
      });
    }

    const role = await this.resolveSelectableRole(organizationId, dto.roleId);

    const existingUser = await this.prisma.user.findFirst({
      where: { organizationId, email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException({
        code: STAFF_ERROR_CODES.DUPLICATE_USER_EMAIL,
        message: 'A user with this email already exists in the organization',
      });
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            organizationId,
            email: normalizedEmail,
            passwordHash,
            status: UserStatus.ACTIVE,
          },
        });

        await this.rolesService.assertRoleAssignmentAllowed(actor, user, role);

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });

        await this.auditService.record(
          {
            organizationId,
            actorUserId: actor.userId,
            action: AUDIT_ACTIONS.USER_CREATED,
            entityType: AUDIT_ENTITY_TYPES.USER,
            entityId: user.id,
            requestId: options?.requestId,
            metadata: {
              email: normalizedEmail,
              staffId: staff.id,
            },
          },
          tx,
        );

        await this.auditService.record(
          {
            organizationId,
            actorUserId: actor.userId,
            action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
            entityType: AUDIT_ENTITY_TYPES.USER,
            entityId: user.id,
            requestId: options?.requestId,
            metadata: {
              targetUserId: user.id,
              roleId: role.id,
              roleCode: role.code,
              roleName: role.name,
            },
          },
          tx,
        );

        const updatedStaff = await tx.staff.update({
          where: { id: staff.id },
          data: { userId: user.id },
          include: {
            department: {
              select: { id: true, name: true, code: true },
            },
          },
        });

        return {
          staff: updatedStaff,
          loginEmail: normalizedEmail,
        };
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  private async resolveSelectableRole(organizationId: string, roleId: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException({
        code: STAFF_ERROR_CODES.INVALID_ROLE,
        message: 'Role not found',
      });
    }

    if (role.organizationId === null) {
      throw new ForbiddenException({
        code: RBAC_ERROR_CODES.PLATFORM_ROLE_ASSIGNMENT_FORBIDDEN,
        message: 'You do not have permission to perform this action',
      });
    }

    if (role.organizationId !== organizationId) {
      throw new NotFoundException({
        code: STAFF_ERROR_CODES.INVALID_ROLE,
        message: 'Role not found',
      });
    }

    return role;
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : String(error.meta?.target ?? '');

      if (target.includes('email')) {
        throw new ConflictException({
          code: STAFF_ERROR_CODES.DUPLICATE_USER_EMAIL,
          message: 'A user with this email already exists in the organization',
        });
      }

      if (target.includes('userId')) {
        throw new ConflictException({
          code: STAFF_ERROR_CODES.STAFF_LOGIN_ALREADY_PROVISIONED,
          message: 'This staff member already has a linked login account',
        });
      }
    }
  }
}
