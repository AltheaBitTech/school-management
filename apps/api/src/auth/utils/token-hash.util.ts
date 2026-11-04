import { createHash, randomBytes } from 'crypto';

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Keep the token itself when a clicked log line glues on the following text. */
export function normalizeResetToken(token: string): string {
  const match = token.trim().match(/^[A-Za-z0-9_-]+/);
  return match?.[0] ?? '';
}
