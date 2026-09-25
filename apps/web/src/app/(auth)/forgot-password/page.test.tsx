import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/auth/auth-client', () => ({
  requestPasswordReset: vi.fn(),
}));

import { requestPasswordReset } from '@/lib/auth/auth-client';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(requestPasswordReset).mockReset();
  });

  it('renders forgot password form', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Forgot password' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /organization code/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('shows generic success state after submit', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({
      message: 'If an account exists, a password reset link has been sent.',
    });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByRole('textbox', { name: /organization code/i }), {
      target: { value: 'school-a' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'admin@school.example' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(
        screen.getByText('If an account exists, a password reset link has been sent.'),
      ).toBeInTheDocument();
    });
  });

  it('links back to login', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });
});
