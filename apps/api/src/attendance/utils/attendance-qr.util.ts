import { createHmac, timingSafeEqual } from 'crypto';

export interface AttendanceQrPayload {
  staffId: string;
  organizationId: string;
  exp: number;
}

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

export function createAttendanceQrToken(
  input: { staffId: string; organizationId: string },
  secret: string,
  now = Date.now(),
): { token: string; expiresAt: string } {
  const payload: AttendanceQrPayload = {
    staffId: input.staffId,
    organizationId: input.organizationId,
    exp: now + TOKEN_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return {
    token: `${body}.${signature}`,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

export function verifyAttendanceQrToken(token: string, secret: string, now = Date.now()): AttendanceQrPayload {
  const [body, signature] = token.split('.');
  if (!body || !signature) {
    throw new Error('INVALID');
  }

  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error('INVALID');
  }

  let payload: AttendanceQrPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AttendanceQrPayload;
  } catch {
    throw new Error('INVALID');
  }

  if (!payload.staffId || !payload.organizationId || typeof payload.exp !== 'number') {
    throw new Error('INVALID');
  }
  if (payload.exp <= now) {
    throw new Error('EXPIRED');
  }
  return payload;
}
