import { paragraph, renderEmailLayout } from '../../notifications/email-templates/email-layout';

export interface PasswordResetEmailInput {
  organizationName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface AccountInviteEmailInput {
  recipientName: string;
  organizationName: string;
  roleName: string;
  inviteUrl: string;
  expiresInDays: number;
}

export function renderPasswordResetEmail(input: PasswordResetEmailInput) {
  const subject = 'Reset your CampusOps password';
  const intro = `A password reset was requested for your ${input.organizationName} account on CampusOps.`;
  const expiry = `This link expires in ${input.expiresInMinutes} minutes.`;
  const ignore = 'If you did not request this, you can ignore this email. Your password will not change.';
  const text = [intro, '', `Reset your password: ${input.resetUrl}`, '', expiry, ignore].join('\n');
  const html = renderEmailLayout({
    preheader: `Reset your password for ${input.organizationName}`,
    heading: 'Reset your password',
    bodyHtml: [paragraph(intro), paragraph(expiry), paragraph(ignore)].join(''),
    cta: { label: 'Reset password', url: input.resetUrl },
  });

  return { subject, text, html };
}

export function renderAccountInviteEmail(input: AccountInviteEmailInput) {
  const recipientName = input.recipientName.trim() || 'there';
  const subject = `You're invited to ${input.organizationName} on CampusOps`;
  const intro = `Hello ${recipientName}, you have been invited to join ${input.organizationName} on CampusOps as ${input.roleName}.`;
  const expiry = `This link is valid for ${input.expiresInDays} days. Open it to choose your password.`;
  const ignore = 'If you were not expecting this invite, you can ignore this email.';
  const text = [intro, '', `Set your password: ${input.inviteUrl}`, '', expiry, ignore].join('\n');
  const html = renderEmailLayout({
    preheader: `Set your password for ${input.organizationName}`,
    heading: `Join ${input.organizationName}`,
    bodyHtml: [paragraph(intro), paragraph(expiry), paragraph(ignore)].join(''),
    cta: { label: 'Set your password', url: input.inviteUrl },
  });

  return { subject, text, html };
}

export function renderActivateAccountEmail(input: AccountInviteEmailInput) {
  const recipientName = input.recipientName.trim() || 'there';
  const subject = 'Set your CampusOps password';
  const intro = `Hello ${recipientName}, use the link below to set the password for your ${input.organizationName} account on CampusOps.`;
  const expiry = `This link is valid for ${input.expiresInDays} days.`;
  const ignore = 'If you did not ask for this, you can ignore this email.';
  const text = [intro, '', `Set your password: ${input.inviteUrl}`, '', expiry, ignore].join('\n');
  const html = renderEmailLayout({
    preheader: `Set your password for ${input.organizationName}`,
    heading: 'Set your password',
    bodyHtml: [paragraph(intro), paragraph(expiry), paragraph(ignore)].join(''),
    cta: { label: 'Set your password', url: input.inviteUrl },
  });

  return { subject, text, html };
}

export function buildPasswordResetUrl(frontendBaseUrl: string, token: string): string {
  const baseUrl = frontendBaseUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ token });
  return `${baseUrl}/reset-password?${params.toString()}`;
}
