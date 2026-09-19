import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_CONFIG_KEY, EmailConfig } from '../../config/email.configuration';
import { EmailProvider, SendEmailInput } from './email-provider.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmail(input: SendEmailInput): Promise<void> {
    const emailConfig = this.configService.get<EmailConfig>(EMAIL_CONFIG_KEY);

    if (!emailConfig?.resendApiKey || !emailConfig.resendFromEmail) {
      throw new Error('Resend email provider is not configured');
    }

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
      }),
    });

    if (!response.ok) {
      this.logger.warn(
        JSON.stringify({
          action: 'email.send.failed',
          provider: 'resend',
          statusCode: response.status,
        }),
      );
      throw new Error('Email delivery failed');
    }
  }
}
