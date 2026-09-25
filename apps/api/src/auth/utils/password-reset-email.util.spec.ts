import { buildPasswordResetUrl, renderPasswordResetEmail } from './password-reset-email.util';

describe('password-reset-email.util', () => {
  it('renders password reset email content', () => {
    const email = renderPasswordResetEmail({
      organizationName: 'Test School',
      resetUrl: 'http://localhost:3000/reset-password?token=abc',
      expiresInMinutes: 60,
    });

    expect(email.subject).toContain('Reset your CampusOps password');
    expect(email.text).toContain('Test School');
    expect(email.text).toContain('token=abc');
    expect(email.html).toContain('Test School');
  });

  it('builds reset URL with token query param', () => {
    expect(buildPasswordResetUrl('http://localhost:3000/', 'raw-token')).toBe(
      'http://localhost:3000/reset-password?token=raw-token',
    );
  });
});
