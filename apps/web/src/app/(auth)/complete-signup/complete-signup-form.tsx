'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, TextField, Alert, Typography, Box, CircularProgress } from '@mui/material';
import { apiClient } from '@/lib/api/client';

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
            setError('Signup has already been completed. Please sign in.');
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
  }, [requestId]);

  const organizationCode = signupContext?.organizationCode ?? orgCodeParam ?? '';
  const email = signupContext?.contactEmail ?? emailParam ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!requestId) {
      setError('Invalid signup link');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
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
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h5" sx={{ mb: 2, color: 'green' }}>Account Created</Typography>
        <Typography sx={{ mb: 1 }}>Your organization code is <strong>{organizationCode}</strong>.</Typography>
        <Typography sx={{ mb: 3 }}>Redirecting to login...</Typography>
      </Box>
    );
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {signupContext ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Setting up administrator access for <strong>{signupContext.organizationName}</strong>.
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Organization code"
          value={organizationCode}
          disabled
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Email"
          value={email}
          disabled
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading || Boolean(signupContext?.signupCompleted)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          disabled={loading || Boolean(signupContext?.signupCompleted)}
          sx={{ mb: 3 }}
        />

        <Button
          fullWidth
          variant="contained"
          type="submit"
          disabled={loading || Boolean(signupContext?.signupCompleted) || !organizationCode}
          sx={{ py: 1.5 }}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
    </>
  );
}
