'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, TextField, Alert, Box, CircularProgress, Stack } from '@mui/material';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { validateConfirmPassword, validatePassword } from '@/lib/forms/validators';

interface SignupContext {
  registrationRequestId: string;
  organizationName: string;
  contactEmail: string;
  organizationCode: string;
  signupCompleted: boolean;
}

export function CompleteSignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get('requestId');
  const emailParam = searchParams.get('email');
  const orgCodeParam = searchParams.get('orgCode');

  const [signupContext, setSignupContext] = useState<SignupContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSignupContext(): Promise<void> {
      if (!requestId) {
        setError('Invalid signup link');
        setContextLoading(false);
        return;
      }

      try {
        const context = await apiClient.get<SignupContext>(
          `/public/organizations/register/${requestId}/signup-context`,
          { auth: false },
        );

        if (!cancelled) {
          setSignupContext(context);
          if (context.signupCompleted) {
            const loginParams = new URLSearchParams({
              orgCode: context.organizationCode,
              email: context.contactEmail,
            });
            router.replace(`/login?${loginParams.toString()}`);
          }
        }
      } catch {
        if (!cancelled) {
          setError('Invalid or expired signup link');
        }
      } finally {
        if (!cancelled) {
          setContextLoading(false);
        }
      }
    }

    void loadSignupContext();

    return () => {
      cancelled = true;
    };
  }, [requestId, router]);

  const organizationCode = signupContext?.organizationCode ?? orgCodeParam ?? '';
  const email = signupContext?.contactEmail ?? emailParam ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!requestId) {
      setError('Invalid signup link');
      return;
    }

    const passwordProblem = validatePassword(password);
    if (passwordProblem) {
      setError(passwordProblem);
      return;
    }

    const confirmProblem = validateConfirmPassword(password, confirmPassword);
    if (confirmProblem) {
      setError(confirmProblem);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post<{ organizationCode?: string }>(
        '/auth/complete-signup',
        {
          registrationRequestId: requestId,
          password,
        },
        { auth: false },
      );

      setSuccess(true);
      const loginParams = new URLSearchParams({
        orgCode: response.organizationCode ?? organizationCode,
        email,
      });
      setTimeout(() => {
        router.push(`/login?${loginParams.toString()}`);
      }, 2000);
    } catch (err) {
      const apiError = err as { message?: string };
      setError(apiError.message || 'Failed to complete signup');
    } finally {
      setLoading(false);
    }
  };

  if (contextLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress aria-label="Loading signup details" />
      </Box>
    );
  }

  if (success) {
    return (
      <Stack spacing={2}>
        <Alert severity="success">
          Account created. Your organization code is <strong>{organizationCode}</strong>. Redirecting to sign in…
        </Alert>
      </Stack>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {error ? (
        <Button component={Link} href="/forgot-password" variant="outlined">
          Send me a new link
        </Button>
      ) : null}

      {signupContext ? (
        <Alert severity="info">
          Setting up administrator access for <strong>{signupContext.organizationName}</strong>.
        </Alert>
      ) : null}

        <TextField
          fullWidth
          label="Organization code"
          value={organizationCode}
          disabled
          helperText="Your assigned organization code"
        />

        <TextField
          fullWidth
          label="Email"
          value={email}
          disabled
          helperText="Administrator email for this signup"
        />

        <TextField
          fullWidth
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading || Boolean(signupContext?.signupCompleted)}
          helperText="Minimum 8 characters"
        />

        <TextField
          fullWidth
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading || Boolean(signupContext?.signupCompleted)}
          helperText="Re-enter your password"
        />

        <Button
          fullWidth
          variant="contained"
          size="large"
          type="submit"
          disabled={loading || Boolean(signupContext?.signupCompleted) || !organizationCode}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </Stack>
    </Box>
  );
}
