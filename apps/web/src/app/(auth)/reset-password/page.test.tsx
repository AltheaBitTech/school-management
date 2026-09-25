import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordPage from '@/app/(auth)/reset-password/page';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockSearchParams = new URLSearchParams('token=test-reset-token');

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/auth/auth-client', () => ({
  resetPassword: vi.fn(),
}));

import { resetPassword } from '@/lib/auth/auth-client';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(resetPassword).mockReset();
    mockSearchParams.set('token', 'test-reset-token');
  });

  it('renders reset password form', () => {
    render(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Reset password' })).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('validates password confirmation', async () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Different123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('shows success state after reset', async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      message: 'Password has been reset successfully. You can now sign in.',
    });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => {
      expect(
        screen.getByText('Password has been reset successfully. You can now sign in.'),
      ).toBeInTheDocument();
    });
    expect(resetPassword).toHaveBeenCalledWith({
      token: 'test-reset-token',
      newPassword: 'Password123!',
    });
  });

  it('shows invalid token state when token is missing', () => {
    mockSearchParams.delete('token');

    render(<ResetPasswordPage />);

    expect(screen.getByText('Invalid or missing reset link.')).toBeInTheDocument();
  });
});
