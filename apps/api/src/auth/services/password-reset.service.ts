import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationStatus, User, UserStatus } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../audit/constants/audit.constants';
import { AppConfig, CONFIGURATION_KEY } from '../../config/configuration';
import { primaryFrontendOrigin } from '../../config/cors.util';
import {
  EMAIL_PROVIDER,
  EmailProvider,
} from '../../notifications/providers/email-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUTH_ERROR_CODES,
  PASSWORD_RESET_GENERIC_MESSAGE,
  PASSWORD_RESET_TOKEN_TTL_MS,
  RefreshRevokeReason,
} from '../constants/auth.constants';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { normalizeEmail } from '../utils/email.util';
import {
  buildPasswordResetUrl,
  renderPasswordResetEmail,
} from '../utils/password-reset-email.util';
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

    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

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
    });

    const appConfig = this.configService.get<AppConfig>(CONFIGURATION_KEY);
    const resetUrl = buildPasswordResetUrl(
      primaryFrontendOrigin(appConfig?.corsOrigin ?? 'http://localhost:3000'),
      rawToken,
    );
    const emailContent = renderPasswordResetEmail({
      organizationName: organization?.name ?? 'your institution',
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MS / 60_000,
    });

    try {
      await this.emailProvider.sendEmail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.warn(`Failed to send password reset email for user ${user.id}: ${message}`);
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
