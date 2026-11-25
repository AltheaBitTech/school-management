import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StudentStatus, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { AccountInviteService, EmailProblem } from '../auth/services/account-invite.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { normalizeEmail } from '../auth/utils/email.util';
import { ORGANIZATION_ROLE_CODES } from '../permissions/constants/system-roles';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { STUDENT_ERROR_CODES } from './constants/student.constants';
import { ProvisionStudentLoginDto } from './dto/provision-student-login.dto';

export interface ProvisionStudentLoginResult {
  userId: string;
  loginEmail: string;
  inviteUrl: string;
  inviteExpiresAt: string;
  emailSent: boolean;
  emailError?: EmailProblem;
}

@Injectable()
export class StudentLoginProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
    private readonly accountInvites: AccountInviteService,
  ) {}

  async provisionLogin(
    actor: AuthenticatedUser,
    studentId: string,
    dto: ProvisionStudentLoginDto,
    options?: { requestId?: string },
  ): Promise<ProvisionStudentLoginResult> {
    const organizationId = actor.organizationId;
    const normalizedEmail = normalizeEmail(dto.email);
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, organizationId },
      include: { organization: { select: { code: true, name: true } } },
    });

    if (!student) {
      throw new NotFoundException({
        code: STUDENT_ERROR_CODES.STUDENT_NOT_FOUND,
        message: 'Student not found',
      });
    }

    if (student.userId) {
      throw new ConflictException({
        code: STUDENT_ERROR_CODES.STUDENT_LOGIN_ALREADY_PROVISIONED,
        message: 'This student already has a linked login account',
      });
    }

    if (student.status === StudentStatus.INACTIVE) {
      throw new BadRequestException({
        code: STUDENT_ERROR_CODES.STUDENT_INACTIVE,
        message: 'Login cannot be provisioned for an inactive student',
      });
    }

    const role = await this.prisma.role.findFirst({
      where: { organizationId, code: ORGANIZATION_ROLE_CODES.STUDENT },
    });
    if (!role) {
      throw new NotFoundException({
        code: STUDENT_ERROR_CODES.INVALID_ROLE,
        message: 'Student role was not found for this organization',
      });
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException({
        code: STUDENT_ERROR_CODES.DUPLICATE_USER_EMAIL,
        message: 'This email is already registered',
      });
    }

    await this.rolesService.assertRoleAssignmentAllowed(actor, { organizationId }, role);

    let created: {
      user: { id: string };
      issued: Awaited<ReturnType<AccountInviteService['issueInviteToken']>>;
    };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            organizationId,
            email: normalizedEmail,
            passwordHash: null,
            status: UserStatus.ACTIVE,
          },
        });

        await tx.userRole.create({
          data: { userId: created.id, roleId: role.id },
        });
        const issued = await this.accountInvites.issueInviteToken(tx, {
          userId: created.id,
          organizationId,
          organizationCode: student.organization.code,
        });
        await tx.student.update({
          where: { id: student.id },
          data: { userId: created.id },
        });

        await this.auditService.record(
          {
            organizationId,
            actorUserId: actor.userId,
            action: AUDIT_ACTIONS.USER_CREATED,
            entityType: AUDIT_ENTITY_TYPES.USER,
            entityId: created.id,
            requestId: options?.requestId,
            metadata: { email: normalizedEmail, studentId: student.id, invite: true },
          },
          tx,
        );

        return { user: created, issued };
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: STUDENT_ERROR_CODES.DUPLICATE_USER_EMAIL,
          message: 'This email is already registered',
        });
      }
      throw error;
    }

    const delivery = await this.accountInvites.sendInviteEmail({
      to: normalizedEmail,
      recipientName: `${student.firstName} ${student.lastName}`.trim(),
      organizationName: student.organization.name,
      roleName: 'Student',
      inviteUrl: created.issued.inviteUrl,
      expiresAt: created.issued.expiresAt,
    });

    return {
      userId: created.user.id,
      loginEmail: normalizedEmail,
      inviteUrl: delivery.inviteUrl ?? '',
      inviteExpiresAt: created.issued.expiresAt.toISOString(),
      emailSent: delivery.emailSent,
      emailError: delivery.emailError,
    };
  }
}
