'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { requestPasswordReset } from '@/lib/auth/auth-client';

export default function ForgotPasswordPage() {
  const [organizationCode, setOrganizationCode] = useState('');
  const [email, setEmail] = useState('');
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
        organizationCode,
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
              Forgot password
            </Typography>
            <Typography color="text.secondary">
              Enter your organization code and email. If an account exists, we will send a reset link.
            </Typography>
          </Stack>

          {successMessage ? (
            <Alert severity="success">{successMessage}</Alert>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Organization code"
                  name="organizationCode"
                  value={organizationCode}
                  onChange={(event) => setOrganizationCode(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                />

                {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

                <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
                  {isSubmitting ? 'Sending…' : 'Send reset link'}
                </Button>
              </Stack>
            </Box>
          )}

          <Button component={Link} href="/login" variant="text">
            Back to sign in
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
