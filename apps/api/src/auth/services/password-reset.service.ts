import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationStatus, User, UserStatus } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../audit/constants/audit.constants';
import { AppConfig, CONFIGURATION_KEY } from '../../config/configuration';
import { resolveFrontendBaseUrl } from '../../config/frontend-url.util';
import { EmailDeliveryError } from '../../notifications/email-delivery.error';
import {
  EMAIL_PROVIDER,
  EmailProvider,
} from '../../notifications/providers/email-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUTH_ERROR_CODES,
  INVITE_TOKEN_TTL_MS,
  PASSWORD_RESET_GENERIC_MESSAGE,
  PASSWORD_RESET_RESEND_COOLDOWN_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
  RefreshRevokeReason,
} from '../constants/auth.constants';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { normalizeEmail } from '../utils/email.util';
import {
  buildPasswordResetUrl,
  renderActivateAccountEmail,
  renderPasswordResetEmail,
} from '../utils/password-reset-email.util';
import { buildStaffInviteUrl } from '../../staff/utils/staff-invite.util';
import { generateRefreshToken, hashRefreshToken, normalizeResetToken } from '../utils/token-hash.util';
import { PasswordService } from './password.service';
import { RefreshSessionService } from './refresh-session.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly refreshSessionService: RefreshSessionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
  ) {}

  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.findEligibleUser(dto.email);

    if (!user) {
      return { message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    const latestToken = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (
      latestToken &&
      Date.now() - latestToken.createdAt.getTime() < PASSWORD_RESET_RESEND_COOLDOWN_MS
    ) {
      this.logger.log(
        JSON.stringify({ action: 'password_reset.cooldown', userId: user.id }),
      );
      return { message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    const activating = !user.passwordHash;
    const ttlMs = activating ? INVITE_TOKEN_TTL_MS : PASSWORD_RESET_TOKEN_TTL_MS;
    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          tokenHash,
          expiresAt,
        },
      });
    });

    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, code: true },
    });

    const appConfig = this.configService.get<AppConfig>(CONFIGURATION_KEY);
    const frontendBaseUrl = resolveFrontendBaseUrl(appConfig?.corsOrigin, appConfig?.frontendUrl);
    const organizationName = organization?.name ?? 'your institution';
    const emailContent = activating
      ? renderActivateAccountEmail({
          recipientName: 'there',
          organizationName,
          roleName: 'member',
          inviteUrl: buildStaffInviteUrl(frontendBaseUrl, rawToken, organization?.code ?? ''),
          expiresInDays: INVITE_TOKEN_TTL_MS / (24 * 60 * 60 * 1000),
        })
      : renderPasswordResetEmail({
          organizationName,
          resetUrl: buildPasswordResetUrl(frontendBaseUrl, rawToken),
          expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MS / 60_000,
        });

    try {
      await this.emailProvider.sendEmail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        purpose: activating ? 'account_activate' : 'password_reset',
      });
    } catch (error: unknown) {
      const code = error instanceof EmailDeliveryError ? error.code : 'UNKNOWN';
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.warn(
        JSON.stringify({
          action: 'password_reset.email_failed',
          userId: user.id,
          code,
          message,
        }),
      );
    }

    await this.auditService.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
    });

    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const token = normalizeResetToken(dto.token);
    const tokenHash = hashRefreshToken(token);
    const passwordHash = await this.passwordService.hash(dto.newPassword);

    const resetResult = await this.prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
        throw new BadRequestException({
          code: AUTH_ERROR_CODES.INVALID_RESET_TOKEN,
          message: 'Invalid or expired reset token',
        });
      }

      if (
        resetToken.user.status !== UserStatus.ACTIVE ||
        resetToken.user.organizationId !== resetToken.organizationId
      ) {
        throw new BadRequestException({
          code: AUTH_ERROR_CODES.INVALID_RESET_TOKEN,
          message: 'Invalid or expired reset token',
        });
      }

      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      if (consumed.count !== 1) {
        throw new BadRequestException({
          code: AUTH_ERROR_CODES.INVALID_RESET_TOKEN,
          message: 'Invalid or expired reset token',
        });
      }

      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });

      return {
        userId: resetToken.userId,
        organizationId: resetToken.organizationId,
      };
    });

    await this.refreshSessionService.revokeAllActiveSessions(
      resetResult.userId,
      RefreshRevokeReason.PasswordReset,
    );

    await this.auditService.record({
      organizationId: resetResult.organizationId,
      actorUserId: resetResult.userId,
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: resetResult.userId,
    });

    return { message: 'Password has been reset successfully. You can now sign in.' };
  }

  private async findEligibleUser(email: string): Promise<User | null> {
    const normalizedEmail = normalizeEmail(email);

    return this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        status: UserStatus.ACTIVE,
        organization: {
          status: OrganizationStatus.ACTIVE,
        },
      },
    });
  }
}
