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

export function logStaffInviteToConsole(input: {
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  inviteUrl: string;
  expiresInMinutes: number;
  heading?: string;
}): void {
  const borderLine = '═'.repeat(60);
  console.log(`\n${borderLine}`);
  console.log(`  CampusOps — ${input.heading ?? 'Staff Login Invite'}`);
  console.log(`  Name:    ${input.firstName} ${input.lastName}`.trim());
  console.log(`  Email:   ${input.email}`);
  console.log(`  Role:    ${input.roleName}`);
  console.log(`  Link:    ${input.inviteUrl}`);
  console.log(`  Expires: ${input.expiresInMinutes} minutes from now`);
  console.log(`${borderLine}\n`);
}
