import { IsEmail, IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

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
  @IsEmail()
  RESEND_FROM_EMAIL?: string;
}

export const EMAIL_CONFIG_KEY = 'email';

export interface EmailConfig {
  provider: EmailProviderType;
  resendApiKey?: string;
  resendFromEmail?: string;
}

export default (): { [EMAIL_CONFIG_KEY]: EmailConfig } => {
  const provider =
    process.env.EMAIL_PROVIDER === EmailProviderType.Resend
      ? EmailProviderType.Resend
      : EmailProviderType.Console;

  return {
    [EMAIL_CONFIG_KEY]: {
      provider,
      resendApiKey: process.env.RESEND_API_KEY,
      resendFromEmail: process.env.RESEND_FROM_EMAIL,
    },
  };
};
