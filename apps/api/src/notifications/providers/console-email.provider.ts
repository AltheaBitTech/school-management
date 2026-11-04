import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, SendEmailInput } from './email-provider.interface';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async sendEmail(input: SendEmailInput): Promise<void> {
    this.logger.log(
      JSON.stringify({
        action: 'email.send',
        to: input.to,
        subject: input.subject,
      }),
    );

    const link = input.text.match(/https?:\/\/\S+/)?.[0];
    if (link) {
      this.logger.log(link);
    }
  }
}
