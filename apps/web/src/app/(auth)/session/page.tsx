'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import {
  getCurrentUser,
  isForbiddenError,
  isUnauthorizedError,
  login,
} from '@/lib/auth/auth-client';
import { callRbacTest, getCurrentOrganization } from '@/lib/organizations/organizations-client';

export default function SessionPage() {
  const [organizationCode, setOrganizationCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setSessionMessage(null);
    setIsSubmitting(true);

    try {
      await login({ organizationCode, email, password });

      const [me, organization, rbacTest] = await Promise.all([
        getCurrentUser(),
        getCurrentOrganization(),
        callRbacTest(),
      ]);

      setSessionMessage(
        `Authenticated as ${me.email} in ${organization.name}. RBAC test allowed for organization ${rbacTest.organizationId}.`,
      );
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setErrorMessage('Authentication failed. Check organization code, email, and password.');
      } else if (isForbiddenError(error)) {
        setErrorMessage('Authenticated, but this account does not have the required permission.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Session verification failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box component="main" sx={{ py: 8 }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" component="h1">
              Verify authenticated session
            </Typography>
            <Typography color="text.secondary">
              Sign in, then call `/auth/me`, `/organizations/current`, and `/auth/rbac-test`.
            </Typography>
          </Stack>

          <Box component="form" onSubmit={handleLogin}>
            <Stack spacing={2}>
              <TextField
                label="Organization code"
                value={organizationCode}
                onChange={(event) => setOrganizationCode(event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                fullWidth
              />

              {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
              {sessionMessage ? <Alert severity="success">{sessionMessage}</Alert> : null}

              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying session…' : 'Login and verify session'}
              </Button>
              <Button component={Link} href="/login" variant="text">
                Back to sign in
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
