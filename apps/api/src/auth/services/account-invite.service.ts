import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { EMAIL_CONFIG_KEY, EmailConfig, EmailProviderType } from '../../config/email.configuration';
import { AppConfig, CONFIGURATION_KEY } from '../../config/configuration';
import { resolveFrontendBaseUrl } from '../../config/frontend-url.util';
import { EmailDeliveryError } from '../../notifications/email-delivery.error';
import {
  EMAIL_PROVIDER,
  EmailProvider,
} from '../../notifications/providers/email-provider.interface';
import { INVITE_TOKEN_TTL_MS } from '../constants/auth.constants';
import { renderAccountInviteEmail } from '../utils/password-reset-email.util';
import { generateRefreshToken, hashRefreshToken } from '../utils/token-hash.util';
import { buildStaffInviteUrl } from '../../staff/utils/staff-invite.util';

export interface EmailProblem {
  code: string;
  message: string;
}

export interface IssuedInviteToken {
  rawToken: string;
  expiresAt: Date;
  inviteUrl: string;
}

export interface InviteEmailResult {
  emailSent: boolean;
  /** Present when the admin still needs the link: send failed, or the provider only logs it. */
  inviteUrl?: string;
  emailError?: EmailProblem;
}

@Injectable()
export class AccountInviteService {
  private readonly logger = new Logger(AccountInviteService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
  ) {}

  frontendBaseUrl(): string {
    const appConfig = this.configService.get<AppConfig>(CONFIGURATION_KEY);
    return resolveFrontendBaseUrl(appConfig?.corsOrigin, appConfig?.frontendUrl);
  }

  async issueInviteToken(
    tx: Prisma.TransactionClient,
    input: { userId: string; organizationId: string; organizationCode: string },
  ): Promise<IssuedInviteToken> {
    const rawToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

    await tx.passwordResetToken.updateMany({
      where: {
        userId: input.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        tokenHash: hashRefreshToken(rawToken),
        expiresAt,
      },
    });

    return {
      rawToken,
      expiresAt,
      inviteUrl: buildStaffInviteUrl(this.frontendBaseUrl(), rawToken, input.organizationCode),
    };
  }

  async sendInviteEmail(input: {
    to: string;
    recipientName: string;
    organizationName: string;
    roleName: string;
    inviteUrl: string;
    expiresAt: Date;
  }): Promise<InviteEmailResult> {
    const email = renderAccountInviteEmail({
      recipientName: input.recipientName,
      organizationName: input.organizationName,
      roleName: input.roleName,
      inviteUrl: input.inviteUrl,
      expiresInDays: Math.round(INVITE_TOKEN_TTL_MS / (24 * 60 * 60 * 1000)),
    });

    try {
      await this.emailProvider.sendEmail({
        to: input.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
        purpose: 'account_invite',
      });
    } catch (error: unknown) {
      const problem = this.toProblem(error);
      this.logger.warn(
        JSON.stringify({
          action: 'account_invite.email_failed',
          code: problem.code,
          message: problem.message,
        }),
      );
      return {
        emailSent: false,
        inviteUrl: input.inviteUrl,
        emailError: problem,
      };
    }

    const provider = this.configService.get<EmailConfig>(EMAIL_CONFIG_KEY)?.provider;
    return {
      emailSent: true,
      inviteUrl: provider === EmailProviderType.Resend ? undefined : input.inviteUrl,
    };
  }

  private toProblem(error: unknown): EmailProblem {
    if (error instanceof EmailDeliveryError) {
      return error.toProblem();
    }
    return {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'The email could not be sent.',
    };
  }
}
