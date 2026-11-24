export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Logged with the send. Never put tokens or links here. */
  purpose?: string;
}

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
