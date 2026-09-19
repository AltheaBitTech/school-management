import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PermissionsModule } from '../permissions/permissions.module';
import { EMAIL_CONFIG_KEY, EmailConfig, EmailProviderType } from '../config/email.configuration';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { EMAIL_PROVIDER } from './providers/email-provider.interface';
import { ResendEmailProvider } from './providers/resend-email.provider';

@Module({
  imports: [ConfigModule, PermissionsModule],
  controllers: [NotificationsController],
  providers: [
    ConsoleEmailProvider,
    ResendEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (
        configService: ConfigService,
        consoleProvider: ConsoleEmailProvider,
        resendProvider: ResendEmailProvider,
      ) => {
        const emailConfig = configService.get<EmailConfig>(EMAIL_CONFIG_KEY);
        return emailConfig?.provider === EmailProviderType.Resend
          ? resendProvider
          : consoleProvider;
      },
      inject: [ConfigService, ConsoleEmailProvider, ResendEmailProvider],
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
