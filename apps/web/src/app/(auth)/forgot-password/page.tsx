'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { AuthPageCard } from '@/components/auth/AuthPageCard';
import { requestPasswordReset } from '@/lib/auth/auth-client';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await requestPasswordReset({
        email,
      });
      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to request password reset');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageCard
      title="Forgot password"
      description="Enter your email. If an account exists, we will send a reset link."
      footerLink={{ href: '/', label: 'Back to home' }}
    >
      {successMessage ? (
        <Stack spacing={2}>
          <Alert severity="success">{successMessage}</Alert>
          <Alert severity="info">
            The link expires in 60 minutes. Open it promptly to set or reset your password.
          </Alert>
        </Stack>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              helperText="The email address on your CampusOps account (same as your invite email)"
              required
              fullWidth
                          />

            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              fullWidth
              startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Button component={Link} href="/login" variant="text">
                Back to sign in
              </Button>
            </Box>
          </Stack>
        </Box>
      )}
    </AuthPageCard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthPageCard title="Forgot password" description="Loading…" footerLink={{ href: '/', label: 'Back to home' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress aria-label="Loading forgot password page" />
          </Box>
        </AuthPageCard>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
