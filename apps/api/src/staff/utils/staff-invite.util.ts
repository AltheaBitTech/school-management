import { buildPasswordResetUrl } from '../../auth/utils/password-reset-email.util';

export function buildStaffInviteUrl(
  frontendBaseUrl: string,
  rawToken: string,
  organizationCode: string,
): string {
  const resetUrl = buildPasswordResetUrl(frontendBaseUrl, rawToken);
  const separator = resetUrl.includes('?') ? '&' : '?';
  return `${resetUrl}${separator}orgCode=${encodeURIComponent(organizationCode)}&isInvite=true`;
}

