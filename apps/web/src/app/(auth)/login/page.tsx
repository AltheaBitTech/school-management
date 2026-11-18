'use client';

import Alert from '@mui/material/Alert';
import { resetSubmitting } from '@/lib/forms/submit-state';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { AuthPageCard } from '@/components/auth/AuthPageCard';
import {
  getCurrentUser,
  isAuthSession,
  login,
  selectLoginContext,
  type LoginRoleOption,
} from '@/lib/auth/auth-client';
import { isOperationalDashboardUser, resolveHomePath } from '@/lib/auth/routing';
import { getOnboardingState, shouldRedirectToOnboarding } from '@/lib/onboarding/onboarding-client';
import { validateEmail, validatePassword } from '@/lib/forms/validators';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [roleChoices, setRoleChoices] = useState<LoginRoleOption[] | null>(null);
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  async function continueAfterAuthentication(): Promise<void> {

    const currentUser = await getCurrentUser();
    const homePath = resolveHomePath(currentUser.permissions);

    if (isOperationalDashboardUser(currentUser.permissions)) {
      try {
        const onboardingState = await getOnboardingState();
        router.push(shouldRedirectToOnboarding(onboardingState) ? '/onboarding' : homePath);
      } catch {
        router.push(homePath);
      }
    } else {
      router.push(homePath);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    const nextEmailError = validateEmail(email) ?? null;
    const nextPasswordError = validatePassword(password) ?? null;
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      return;
    }
    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
      });

      if (!isAuthSession(result)) {
        setRoleChoices(result.roles);
        setSelectionToken(result.selectionToken);
        setSelectedRoleId(result.roles[0]?.id ?? '');
        resetSubmitting(setIsSubmitting);
        return;
      }

      await continueAfterAuthentication();
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      setErrorMessage(error instanceof Error ? error.message : 'Login failed');
    }
  }

  async function handleRoleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectionToken || !selectedRoleId) {
      setErrorMessage('Choose the role you want to use for this sign-in.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await selectLoginContext({ selectionToken, roleId: selectedRoleId });
      await continueAfterAuthentication();
    } catch (error) {
      resetSubmitting(setIsSubmitting);
      setErrorMessage(error instanceof Error ? error.message : 'Could not start that role');
    }
  }

  if (roleChoices && selectionToken) {
    return (
      <AuthPageCard
        title="Choose a role"
        description="This account has more than one role. This sign-in uses only the role you choose. Sign out and sign in again to use a different role."
        footerLink={{ href: '/', label: 'Back to home' }}
      >
        <Box component="form" onSubmit={handleRoleSubmit}>
          <Stack spacing={2}>
            <TextField
              select
              label="Role for this sign-in"
              name="roleId"
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
              required
              fullWidth
            >
              {roleChoices.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))}
            </TextField>
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting || !selectedRoleId}
              fullWidth
              startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {isSubmitting ? 'Signing in…' : 'Continue'}
            </Button>
            <Button
              type="button"
              variant="text"
              onClick={() => {
                setRoleChoices(null);
                setSelectionToken(null);
                setErrorMessage(null);
              }}
            >
              Use a different account
            </Button>
          </Stack>
        </Box>
      </AuthPageCard>
    );
  }

  return (
    <AuthPageCard
      title="Sign in"
      description="Use the email and password for your CampusOps account."
      footerLink={{ href: '/', label: 'Back to home' }}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {searchParams.get('passwordSet') === '1' ? (
            <Alert severity="success">Password set! Sign in to continue.</Alert>
          ) : null}
          {searchParams.get('reason') === 'idle' ? (
            <Alert severity="info">
              You were signed out after 60 minutes of inactivity. Sign in again to continue.
            </Alert>
          ) : null}
          {searchParams.get('reason') === 'session_expired' ? (
            <Alert severity="info">Your session expired. Sign in again to continue.</Alert>
          ) : null}
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
            helperText={emailError ?? 'The work email registered with your institution account'}
            error={Boolean(emailError)}
            required
            fullWidth
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) {
                setPasswordError(validatePassword(event.target.value) ?? null);
              }
            }}
            onBlur={() => setPasswordError(validatePassword(password) ?? null)}
            helperText={passwordError ?? 'Minimum 8 characters'}
            error={Boolean(passwordError)}
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
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
          <Box sx={{ textAlign: 'center' }}>
            <Button component={Link} href="/forgot-password" variant="text">
              Forgot password?
            </Button>
          </Box>
        </Stack>
      </Box>
    </AuthPageCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
          <Stack spacing={2} sx={{ width: '100%', maxWidth: 440 }} aria-label="Loading login page">
            <Skeleton variant="text" width={160} height={32} />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={48} />
          </Stack>
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
