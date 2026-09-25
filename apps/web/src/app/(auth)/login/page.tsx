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
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { login } from '@/lib/auth/auth-client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organizationCode, setOrganizationCode] = useState(searchParams.get('orgCode') ?? '');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        organizationCode,
        email,
        password,
      });
      router.push('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed');
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
              Sign in
            </Typography>
            <Typography color="text.secondary">
              Use your organization code, email, and password.
            </Typography>
          </Stack>

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
              <TextField
                label="Password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                fullWidth
              />

              {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

              <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
              <Button component={Link} href="/" variant="text">
                Back to home
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress aria-label="Loading login page" />
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
