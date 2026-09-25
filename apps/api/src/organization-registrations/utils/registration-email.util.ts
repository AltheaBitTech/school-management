function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface RegistrationApprovedEmailInput {
  organizationName: string;
  organizationCode: string;
  completeSignupUrl: string;
}

export function renderRegistrationApprovedEmail(input: RegistrationApprovedEmailInput) {
  const subject = 'Your CampusOps school registration has been approved';
  const text = [
    `Your registration for ${input.organizationName} has been approved.`,
    '',
    `Organization code: ${input.organizationCode}`,
    `Complete signup: ${input.completeSignupUrl}`,
    '',
    'After setting your password, sign in with your organization code, email, and password.',
  ].join('\n');

  const html = `
    <p>Your registration for <strong>${escapeHtml(input.organizationName)}</strong> has been approved.</p>
    <p><strong>Organization code:</strong> ${escapeHtml(input.organizationCode)}</p>
    <p><a href="${escapeHtml(input.completeSignupUrl)}">Complete your signup</a> to set your administrator password.</p>
    <p>After setting your password, sign in with your organization code, email, and password.</p>
  `;

  return { subject, text, html };
}
