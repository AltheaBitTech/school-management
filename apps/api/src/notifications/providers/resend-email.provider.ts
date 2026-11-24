import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_CONFIG_KEY, EmailConfig } from '../../config/email.configuration';
import {
  EMAIL_DELIVERY_ERROR_CODES,
  EmailDeliveryError,
  classifyResendFailure,
  maskEmail,
} from '../email-delivery.error';
import { EmailProvider, SendEmailInput } from './email-provider.interface';

const RESEND_TIMEOUT_MS = 15_000;

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmail(input: SendEmailInput): Promise<void> {
    const emailConfig = this.configService.get<EmailConfig>(EMAIL_CONFIG_KEY);
    const purpose = input.purpose ?? 'email';

    if (!emailConfig?.resendApiKey || !emailConfig.resendFromEmail) {
      this.logOutcome(purpose, input.to, 'failed', {
        errorCode: EMAIL_DELIVERY_ERROR_CODES.NOT_CONFIGURED,
      });
      throw new EmailDeliveryError(EMAIL_DELIVERY_ERROR_CODES.NOT_CONFIGURED);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${emailConfig.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailConfig.resendFromEmail,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          ...(input.html ? { html: input.html } : {}),
          ...(emailConfig.replyTo ? { reply_to: emailConfig.replyTo } : {}),
        }),
        signal: controller.signal,
      });

      const rawBody = await response.text();

      if (!response.ok) {
        const problem = classifyResendFailure(response.status, rawBody);
        this.logOutcome(purpose, input.to, 'failed', {
          statusCode: response.status,
          errorCode: problem.code,
          providerMessage: problem.message,
        });
        throw new EmailDeliveryError(problem.code, problem.message);
      }

      let resendId: string | undefined;
      try {
        const parsed = JSON.parse(rawBody) as { id?: string };
        resendId = parsed.id;
      } catch {
        resendId = undefined;
      }

      this.logOutcome(purpose, input.to, 'accepted', {
        statusCode: response.status,
        resendId,
      });
    } catch (error: unknown) {
      if (error instanceof EmailDeliveryError) {
        throw error;
      }

      const aborted = error instanceof Error && error.name === 'AbortError';
      const code = aborted
        ? EMAIL_DELIVERY_ERROR_CODES.TIMEOUT
        : EMAIL_DELIVERY_ERROR_CODES.UNKNOWN;
      this.logOutcome(purpose, input.to, 'failed', {
        errorCode: code,
        providerMessage: error instanceof Error ? error.message : 'unknown',
      });
      throw new EmailDeliveryError(code);
    } finally {
      clearTimeout(timeout);
    }
  }

  private logOutcome(
    purpose: string,
    to: string,
    outcome: 'accepted' | 'failed',
    extra: {
      statusCode?: number;
      resendId?: string;
      errorCode?: string;
      providerMessage?: string;
    },
  ): void {
    this.logger.log(
      JSON.stringify({
        action: 'email.send',
        provider: 'resend',
        purpose,
        outcome,
        to: maskEmail(to),
        ...extra,
      }),
    );
  }
}
