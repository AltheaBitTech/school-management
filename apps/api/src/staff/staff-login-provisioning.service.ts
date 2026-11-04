import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmploymentStatus, Prisma, Role, Staff, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { PASSWORD_RESET_TOKEN_TTL_MS } from '../auth/constants/auth.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { normalizeEmail } from '../auth/utils/email.util';
import { generateRefreshToken, hashRefreshToken } from '../auth/utils/token-hash.util';
import { RBAC_ERROR_CODES } from '../common/constants/rbac.constants';
import { AppConfig, CONFIGURATION_KEY } from '../config/configuration';
import { primaryFrontendOrigin } from '../config/cors.util';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { STAFF_ERROR_CODES } from './constants/staff.constants';
import { isStaffLoginAssignableRoleCode } from './utils/staff-assignable-role.util';
import { ProvisionStaffLoginDto } from './dto/provision-staff-login.dto';
import { buildStaffInviteUrl, logStaffInviteToConsole } from './utils/staff-invite.util';

type StaffWithDepartment = Staff & {
  department: { id: string; name: string; code: string } | null;
  organization: { code: string };
};

export interface ProvisionStaffLoginResult {
  staff: StaffWithDepartment;
  loginEmail: string;
  inviteUrl: string;
  inviteExpiresAt: string;
}

@Injectable()
export class StaffLoginProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
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
          select: { code: true },
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
              organization: { select: { code: true } },
            },
          });

      if (existingUser.passwordHash) {
        return {
          staff: updatedStaff,
          loginEmail: normalizedEmail,
          inviteUrl: '',
          inviteExpiresAt: new Date().toISOString(),
        };
      }

      const appConfig = this.configService.get<AppConfig>(CONFIGURATION_KEY);
      const frontendBaseUrl = primaryFrontendOrigin(appConfig?.corsOrigin ?? 'http://localhost:3000');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
      const rawToken = generateRefreshToken();
      const tokenHash = hashRefreshToken(rawToken);
      const inviteUrl = buildStaffInviteUrl(frontendBaseUrl, rawToken, staff.organization.code);

      await this.prisma.passwordResetToken.create({
        data: {
          userId: existingUser.id,
          organizationId,
          tokenHash,
          expiresAt,
        },
      });

      logStaffInviteToConsole({
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: normalizedEmail,
        roleName: role.name,
        inviteUrl,
        expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MS / 60_000,
      });

      return {
        staff: updatedStaff,
        loginEmail: normalizedEmail,
        inviteUrl,
        inviteExpiresAt: expiresAt.toISOString(),
      };
    }

    const appConfig = this.configService.get<AppConfig>(CONFIGURATION_KEY);
    const frontendBaseUrl = primaryFrontendOrigin(appConfig?.corsOrigin ?? 'http://localhost:3000');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);
    const inviteUrl = buildStaffInviteUrl(frontendBaseUrl, rawToken, staff.organization.code);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            organizationId,
            email: normalizedEmail,
            passwordHash: null,
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

        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            organizationId,
            tokenHash,
            expiresAt,
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
              select: { code: true },
            },
          },
        });

        return {
          staff: updatedStaff,
          loginEmail: normalizedEmail,
          inviteUrl,
          inviteExpiresAt: expiresAt.toISOString(),
          roleName: role.name,
        };
      });

      logStaffInviteToConsole({
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: normalizedEmail,
        roleName: result.roleName,
        inviteUrl: result.inviteUrl,
        expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MS / 60_000,
      });

      return {
        staff: result.staff,
        loginEmail: result.loginEmail,
        inviteUrl: result.inviteUrl,
        inviteExpiresAt: result.inviteExpiresAt,
      };
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
