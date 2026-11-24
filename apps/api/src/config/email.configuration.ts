import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { IsMailbox } from './is-mailbox.validator';

export enum EmailProviderType {
  Console = 'console',
  Resend = 'resend',
}

export class EnvironmentEmailVariables {
  @IsEnum(EmailProviderType)
  EMAIL_PROVIDER: EmailProviderType = EmailProviderType.Console;

  @ValidateIf((values: EnvironmentEmailVariables) => values.EMAIL_PROVIDER === EmailProviderType.Resend)
  @IsString()
  @IsNotEmpty()
  RESEND_API_KEY?: string;

  @ValidateIf((values: EnvironmentEmailVariables) => values.EMAIL_PROVIDER === EmailProviderType.Resend)
  @IsString()
  @IsMailbox()
  RESEND_FROM_EMAIL?: string;

  @IsOptional()
  @IsEmail()
  EMAIL_REPLY_TO?: string;
}

export const EMAIL_CONFIG_KEY = 'email';

export interface EmailConfig {
  provider: EmailProviderType;
  resendApiKey?: string;
  resendFromEmail?: string;
  replyTo?: string;
}

export default (): { [EMAIL_CONFIG_KEY]: EmailConfig } => {
  const provider =
    process.env.EMAIL_PROVIDER === EmailProviderType.Resend
      ? EmailProviderType.Resend
      : EmailProviderType.Console;

  return {
    [EMAIL_CONFIG_KEY]: {
      provider,
      resendApiKey: process.env.RESEND_API_KEY?.trim() || undefined,
      resendFromEmail: process.env.RESEND_FROM_EMAIL?.trim() || undefined,
      replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    },
  };
};
