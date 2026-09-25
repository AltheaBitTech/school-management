'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { resetPassword } from '@/lib/auth/auth-client';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return <Alert severity="error">Invalid or missing reset link.</Alert>;
  }

  if (successMessage) {
    return (
      <Stack spacing={2}>
        <Alert severity="success">{successMessage}</Alert>
        <Button component={Link} href="/login" variant="contained" fullWidth>
          Go to sign in
        </Button>
      </Stack>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="New password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          fullWidth
        />

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
          {isSubmitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </Stack>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 6,
        bgcolor: 'background.default',
      }}
    >
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 440, mx: 'auto', p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3}>
          <Stack spacing={0.75}>
            <Typography variant="h5" component="p" color="primary" sx={{ fontWeight: 700 }}>
              CampusOps
            </Typography>
            <Typography variant="h4" component="h1">
              Reset password
            </Typography>
            <Typography color="text.secondary">
              Choose a new password for your account.
            </Typography>
          </Stack>

          <Suspense
            fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress aria-label="Loading reset form" />
              </Box>
            }
          >
            <ResetPasswordForm />
          </Suspense>

          <Button component={Link} href="/login" variant="text">
            Back to sign in
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
