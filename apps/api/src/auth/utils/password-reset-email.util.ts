function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface PasswordResetEmailInput {
  organizationName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function renderPasswordResetEmail(input: PasswordResetEmailInput) {
  const subject = 'Reset your CampusOps password';
  const text = [
    `A password reset was requested for your ${input.organizationName} account on CampusOps.`,
    '',
    `Reset your password: ${input.resetUrl}`,
    '',
    `This link expires in ${input.expiresInMinutes} minutes.`,
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>A password reset was requested for your <strong>${escapeHtml(input.organizationName)}</strong> account on CampusOps.</p>
    <p><a href="${escapeHtml(input.resetUrl)}">Reset your password</a></p>
    <p>This link expires in ${input.expiresInMinutes} minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  return { subject, text, html };
}

export function buildPasswordResetUrl(frontendBaseUrl: string, token: string): string {
  const baseUrl = frontendBaseUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ token });
  return `${baseUrl}/reset-password?${params.toString()}`;
}
