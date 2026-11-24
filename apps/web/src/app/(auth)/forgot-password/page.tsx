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
import { validateEmail } from '@/lib/forms/validators';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const nextEmailError = validateEmail(email) ?? null;
    setEmailError(nextEmailError);
    if (nextEmailError) {
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await requestPasswordReset({
        email: email.trim(),
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
            If you already have a password, the link expires in 60 minutes. If you have not set a
            password yet, the link is valid for 7 days. Check spam if it does not arrive.
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
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) {
                  setEmailError(validateEmail(event.target.value) ?? null);
                }
              }}
              onBlur={() => setEmailError(validateEmail(email) ?? null)}
              helperText={emailError ?? 'The email address on your CampusOps account (same as your invite email)'}
              error={Boolean(emailError)}
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
