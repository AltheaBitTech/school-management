import { paragraph, renderEmailLayout } from '../../notifications/email-templates/email-layout';

export interface RegistrationApprovedEmailInput {
  organizationName: string;
  organizationCode: string;
  completeSignupUrl: string;
  /** When true, the admin password was set during registration — sign in directly. */
  signupPreCompleted: boolean;
  loginUrl: string;
  recipientName?: string;
}

export interface RegistrationReceivedEmailInput {
  recipientName: string;
  organizationName: string;
}

export interface RegistrationRejectedEmailInput {
  recipientName: string;
  organizationName: string;
  rejectionReason: string;
}

export function renderRegistrationApprovedEmail(input: RegistrationApprovedEmailInput) {
  const subject = 'Your CampusOps institution registration has been approved';
  const greeting = input.recipientName?.trim()
    ? `Hello ${input.recipientName.trim()},`
    : 'Hello,';

  if (input.signupPreCompleted) {
    const intro = `Your registration for ${input.organizationName} has been approved.`;
    const codeLine = `Organization code: ${input.organizationCode}`;
    const next = 'Sign in with your organization code, email, and the password you set during registration.';
    const text = [greeting, '', intro, codeLine, `Sign in: ${input.loginUrl}`, '', next].join('\n');
    const html = renderEmailLayout({
      preheader: `${input.organizationName} is approved`,
      heading: 'Your institution is approved',
      bodyHtml: [paragraph(greeting), paragraph(intro), paragraph(codeLine), paragraph(next)].join(''),
      cta: { label: 'Sign in', url: input.loginUrl },
    });
    return { subject, text, html };
  }

  const intro = `Your registration for ${input.organizationName} has been approved.`;
  const codeLine = `Organization code: ${input.organizationCode}`;
  const next = 'Complete signup to set your administrator password. After that, sign in with your organization code, email, and password.';
  const text = [greeting, '', intro, codeLine, `Complete signup: ${input.completeSignupUrl}`, '', next].join('\n');
  const html = renderEmailLayout({
    preheader: `${input.organizationName} is approved`,
    heading: 'Your institution is approved',
    bodyHtml: [paragraph(greeting), paragraph(intro), paragraph(codeLine), paragraph(next)].join(''),
    cta: { label: 'Complete signup', url: input.completeSignupUrl },
  });

  return { subject, text, html };
}

export function renderRegistrationReceivedEmail(input: RegistrationReceivedEmailInput) {
  const subject = 'We received your CampusOps registration';
  const name = input.recipientName.trim() || 'there';
  const intro = `Hello ${name}, we received the registration request for ${input.organizationName}.`;
  const next = 'Our team will review it and email you when there is a decision. This usually takes 1-2 business days.';
  const text = [intro, '', next].join('\n');
  const html = renderEmailLayout({
    preheader: `Registration received for ${input.organizationName}`,
    heading: 'Registration received',
    bodyHtml: [paragraph(intro), paragraph(next)].join(''),
  });
  return { subject, text, html };
}

export function renderRegistrationRejectedEmail(input: RegistrationRejectedEmailInput) {
  const subject = 'Your CampusOps registration was not approved';
  const name = input.recipientName.trim() || 'there';
  const intro = `Hello ${name}, we reviewed the registration request for ${input.organizationName} and cannot approve it at this time.`;
  const reason = `Reason: ${input.rejectionReason.trim()}`;
  const text = [intro, '', reason].join('\n');
  const html = renderEmailLayout({
    preheader: `Update on ${input.organizationName}`,
    heading: 'Registration not approved',
    bodyHtml: [paragraph(intro), paragraph(reason)].join(''),
  });
  return { subject, text, html };
}
