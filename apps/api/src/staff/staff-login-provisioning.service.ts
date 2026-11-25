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
import { AccountInviteService, EmailProblem } from '../auth/services/account-invite.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { normalizeEmail } from '../auth/utils/email.util';
import { RBAC_ERROR_CODES } from '../common/constants/rbac.constants';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { STAFF_ERROR_CODES } from './constants/staff.constants';
import { isStaffLoginAssignableRoleCode } from './utils/staff-assignable-role.util';
import { ProvisionStaffLoginDto } from './dto/provision-staff-login.dto';

type StaffWithDepartment = Staff & {
  department: { id: string; name: string; code: string } | null;
  organization: { code: string; name: string };
};

export interface ProvisionStaffLoginResult {
  staff: StaffWithDepartment;
  loginEmail: string;
  inviteUrl: string;
  inviteExpiresAt: string;
  emailSent: boolean;
  emailError?: EmailProblem;
  deliveryNote?: string;
}

@Injectable()
export class StaffLoginProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
    private readonly accountInvites: AccountInviteService,
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
        organization: {
          select: { code: true, name: true },
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
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.organizationId !== organizationId) {
      throw new ConflictException({
        code: STAFF_ERROR_CODES.DUPLICATE_USER_EMAIL,
        message: 'This email is already registered',
      });
    }

    if (existingUser) {
      const linkedElsewhere = await this.prisma.staff.findFirst({
        where: {
          organizationId,
          userId: existingUser.id,
          NOT: { id: staff.id },
        },
        select: { id: true },
      });

      if (linkedElsewhere) {
        throw new ConflictException({
          code: STAFF_ERROR_CODES.DUPLICATE_USER_EMAIL,
          message: 'This email is already registered',
        });
      }

      await this.rolesService.assignRoleToUser(actor, existingUser.id, role.id, options);

      const updatedStaff = staff.userId
        ? staff
        : await this.prisma.staff.update({
            where: { id: staff.id },
            data: { userId: existingUser.id },
            include: {
              department: { select: { id: true, name: true, code: true } },
              organization: { select: { code: true, name: true } },
            },
          });

      if (existingUser.passwordHash) {
        return {
          staff: updatedStaff,
          loginEmail: normalizedEmail,
          inviteUrl: '',
          inviteExpiresAt: new Date().toISOString(),
          emailSent: false,
          deliveryNote: 'This email already has a password. They can sign in. No invite was sent.',
        };
      }

      const issued = await this.prisma.$transaction((tx) =>
        this.accountInvites.issueInviteToken(tx, {
          userId: existingUser.id,
          organizationId,
          organizationCode: staff.organization.code,
        }),
      );
      const delivery = await this.accountInvites.sendInviteEmail({
        to: normalizedEmail,
        recipientName: `${staff.firstName} ${staff.lastName}`.trim(),
        organizationName: staff.organization.name,
        roleName: role.name,
        inviteUrl: issued.inviteUrl,
        expiresAt: issued.expiresAt,
      });

      return {
        staff: updatedStaff,
        loginEmail: normalizedEmail,
        inviteUrl: delivery.inviteUrl ?? '',
        inviteExpiresAt: issued.expiresAt.toISOString(),
        emailSent: delivery.emailSent,
        emailError: delivery.emailError,
      };
    }

    await this.rolesService.assertRoleAssignmentAllowed(actor, { organizationId }, role);

    let result: {
      staff: StaffWithDepartment;
      issued: Awaited<ReturnType<AccountInviteService['issueInviteToken']>>;
      roleName: string;
    };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            organizationId,
            email: normalizedEmail,
            passwordHash: null,
            status: UserStatus.ACTIVE,
          },
        });

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });

        const issued = await this.accountInvites.issueInviteToken(tx, {
          userId: user.id,
          organizationId,
          organizationCode: staff.organization.code,
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
              invite: true,
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
            organization: {
              select: { code: true, name: true },
            },
          },
        });

        return {
          staff: updatedStaff,
          issued,
          roleName: role.name,
        };
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }

    const delivery = await this.accountInvites.sendInviteEmail({
      to: normalizedEmail,
      recipientName: `${staff.firstName} ${staff.lastName}`.trim(),
      organizationName: staff.organization.name,
      roleName: result.roleName,
      inviteUrl: result.issued.inviteUrl,
      expiresAt: result.issued.expiresAt,
    });

    return {
      staff: result.staff,
      loginEmail: normalizedEmail,
      inviteUrl: delivery.inviteUrl ?? '',
      inviteExpiresAt: result.issued.expiresAt.toISOString(),
      emailSent: delivery.emailSent,
      emailError: delivery.emailError,
    };
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

    if (!isStaffLoginAssignableRoleCode(role.code)) {
      throw new BadRequestException({
        code: STAFF_ERROR_CODES.INVALID_ROLE,
        message: 'The Student role cannot be assigned to staff login accounts',
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
          message: 'This email is already registered',
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
