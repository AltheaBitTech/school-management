'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { AuthPageCard } from '@/components/auth/AuthPageCard';
import { resetPassword } from '@/lib/auth/auth-client';

function InviteRecoveryHelp() {
  return (
    <Alert severity="info">
      <Typography variant="body2" component="span">
        Invite link expired or not working? Use{' '}
        <Typography
          component={Link}
          href="/forgot-password"
          variant="body2"
          sx={{ fontWeight: 600 }}
        >
          Forgot password
        </Typography>{' '}
        with your account email to get a new set-password link (valid for 60 minutes).
      </Typography>
    </Alert>
  );
}

function ResetPasswordForm({ isInvite }: { isInvite: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get('token') ?? '').trim().match(/^[A-Za-z0-9_-]+/)?.[0] ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showInviteRecovery =
    isInvite || errorMessage?.toLowerCase().includes('invalid or expired');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Invalid or missing reset link');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({
        token,
        newPassword: password,
      });

      if (isInvite) {
        router.replace('/login?passwordSet=1');
        return;
      }

      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">Invalid or missing reset link.</Alert>
        <InviteRecoveryHelp />
      </Stack>
    );
  }

  if (successMessage) {
    return (
      <Stack spacing={2}>
        <Alert severity="success">{successMessage}</Alert>
        <Button component={Link} href="/login" variant="contained" size="large" fullWidth>
          Go to sign in
        </Button>
      </Stack>
    );
  }

  const submitLabel = isInvite
    ? isSubmitting
      ? 'Setting password…'
      : 'Set password & sign in'
    : isSubmitting
      ? 'Resetting…'
      : 'Reset password';

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {isInvite ? <InviteRecoveryHelp /> : null}

        <TextField
          label="New password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          helperText="Minimum 8 characters"
          required
          fullWidth
                  />
        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          helperText="Re-enter your new password"
          required
          fullWidth
                  />

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {showInviteRecovery && !isInvite && errorMessage ? (
          <InviteRecoveryHelp />
        ) : null}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          fullWidth
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {submitLabel}
        </Button>
        <Box sx={{ textAlign: 'center' }}>
          <Button component={Link} href="/login" variant="text">
            Back to sign in
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const isInvite = searchParams.get('isInvite') === 'true';

  return (
    <AuthPageCard
      title={isInvite ? 'Welcome to CampusOps!' : 'Reset password'}
      description={
        isInvite
          ? 'Set your password to activate your account and get started.'
          : 'Choose a new password for your account.'
      }
      footerLink={{ href: '/', label: 'Back to home' }}
    >
      <ResetPasswordForm isInvite={isInvite} />
    </AuthPageCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthPageCard title="Reset password" description="Loading…" footerLink={{ href: '/', label: 'Back to home' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress aria-label="Loading reset form" />
          </Box>
        </AuthPageCard>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}
