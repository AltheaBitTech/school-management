import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordPage from '@/app/(auth)/reset-password/page';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockSearchParams = new URLSearchParams('token=test-reset-token');

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/lib/auth/auth-client', () => ({
  resetPassword: vi.fn(),
}));

import { resetPassword } from '@/lib/auth/auth-client';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(resetPassword).mockReset();
    mockReplace.mockReset();
    mockSearchParams.set('token', 'test-reset-token');
    mockSearchParams.delete('isInvite');
    mockSearchParams.delete('orgCode');
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

  it('shows invite welcome copy when isInvite is true', () => {
    mockSearchParams.set('isInvite', 'true');

    render(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: 'Welcome to CampusOps!' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Set password & sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Invite link expired or not working/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot password' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );

    mockSearchParams.delete('isInvite');
  });

  it('redirects to login after invite password set', async () => {
    mockSearchParams.set('isInvite', 'true');
    vi.mocked(resetPassword).mockResolvedValue({ message: 'Password set.' });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set password & sign in' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login?passwordSet=1');
    });
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
    expect(screen.getByRole('link', { name: 'Forgot password' })).toBeInTheDocument();
  });

  it('links forgot password without asking for an organization code', () => {
    mockSearchParams.delete('token');

    render(<ResetPasswordPage />);

    expect(screen.getByRole('link', { name: 'Forgot password' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.getByText(/account email/i)).toBeInTheDocument();
    expect(screen.queryByText(/organization code/i)).not.toBeInTheDocument();
  });
});
