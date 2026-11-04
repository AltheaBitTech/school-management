import { createAttendanceQrToken, verifyAttendanceQrToken } from './attendance-qr.util';

describe('attendance-qr.util', () => {
  const secret = 'test-secret-with-enough-length';

  it('round-trips a token', () => {
    const issued = createAttendanceQrToken(
      { staffId: 'staff-1', organizationId: 'org-1' },
      secret,
      1_000,
    );
    const payload = verifyAttendanceQrToken(issued.token, secret, 1_000);
    expect(payload.staffId).toBe('staff-1');
    expect(payload.organizationId).toBe('org-1');
  });

  it('rejects a tampered token', () => {
    const issued = createAttendanceQrToken(
      { staffId: 'staff-1', organizationId: 'org-1' },
      secret,
    );
    expect(() => verifyAttendanceQrToken(`${issued.token}x`, secret)).toThrow('INVALID');
  });

  it('rejects an expired token', () => {
    const issued = createAttendanceQrToken(
      { staffId: 'staff-1', organizationId: 'org-1' },
      secret,
      1_000,
    );
    expect(() => verifyAttendanceQrToken(issued.token, secret, issued.expiresAt ? Date.parse(issued.expiresAt) + 1 : 0)).toThrow(
      'EXPIRED',
    );
  });
});
