/**
 * Sends sample CampusOps emails to one address.
 * Usage: pnpm --filter @campusops/api email:test you@example.com
 * Uses EMAIL_PROVIDER from apps/api/.env. Console mode prints the messages. Resend mode delivers them.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { INVITE_TOKEN_TTL_MS, PASSWORD_RESET_TOKEN_TTL_MS } from '../src/auth/constants/auth.constants';
import {
  renderAccountInviteEmail,
  renderActivateAccountEmail,
  renderPasswordResetEmail,
} from '../src/auth/utils/password-reset-email.util';
import {
  renderRegistrationApprovedEmail,
  renderRegistrationReceivedEmail,
} from '../src/organization-registrations/utils/registration-email.util';

function loadEnvFile(filePath: string): void {
  let text = '';
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator < 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(__dirname, '../.env'));

const recipient = process.argv[2]?.trim();
if (!recipient || !recipient.includes('@')) {
  console.error('Usage: pnpm --filter @campusops/api email:test <email>');
  process.exit(1);
}

const samples = [
  renderAccountInviteEmail({
    recipientName: 'Test User',
    organizationName: 'CampusOps Demo',
    roleName: 'Teacher',
    inviteUrl: 'https://example.com/reset-password?token=sample-invite&isInvite=true',
    expiresInDays: INVITE_TOKEN_TTL_MS / (24 * 60 * 60 * 1000),
  }),
  renderActivateAccountEmail({
    recipientName: 'Test User',
    organizationName: 'CampusOps Demo',
    roleName: 'member',
    inviteUrl: 'https://example.com/reset-password?token=sample-activate&isInvite=true',
    expiresInDays: INVITE_TOKEN_TTL_MS / (24 * 60 * 60 * 1000),
  }),
  renderPasswordResetEmail({
    organizationName: 'CampusOps Demo',
    resetUrl: 'https://example.com/reset-password?token=sample-reset',
    expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MS / 60_000,
  }),
  renderRegistrationReceivedEmail({
    recipientName: 'Test User',
    organizationName: 'CampusOps Demo',
  }),
  renderRegistrationApprovedEmail({
    organizationName: 'CampusOps Demo',
    organizationCode: 'campusops-demo',
    completeSignupUrl: 'https://example.com/complete-signup?requestId=sample',
    signupPreCompleted: true,
    loginUrl: 'https://example.com/login?orgCode=campusops-demo',
    recipientName: 'Test User',
  }),
];

async function main(): Promise<void> {
  const provider = (process.env.EMAIL_PROVIDER ?? 'console').trim();
  if (provider !== 'resend') {
    console.log(`EMAIL_PROVIDER=${provider}. Printing samples. Nothing will be delivered.`);
    for (const sample of samples) {
      console.log(`\n--- ${sample.subject} ---\n${sample.text}`);
    }
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL are required when EMAIL_PROVIDER=resend');
  }

  for (const sample of samples) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `[CampusOps test] ${sample.subject}`,
        text: sample.text,
        html: sample.html,
      }),
    });
    const body = await response.text();
    if (!response.ok) {
      console.error(`FAILED ${sample.subject} status=${response.status} body=${body}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`ACCEPTED ${sample.subject} ${body}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
