'use client';

import { CircularProgress, Stack } from '@mui/material';
import { Suspense } from 'react';
import { AuthPageCard } from '@/components/auth/AuthPageCard';
import { CompleteSignupForm } from './complete-signup-form';

interface CompleteSignupPageContentProps {
  loading?: boolean;
}

export function CompleteSignupPageContent({ loading = false }: CompleteSignupPageContentProps) {
  return (
    <AuthPageCard
      title="Complete your sign-up"
      description="Set your password to activate your administrator account."
      footerLink={{ href: '/', label: 'Back to home' }}
    >
      {loading ? (
        <Stack alignItems="center" py={4}>
          <CircularProgress aria-label="Loading signup form" />
        </Stack>
      ) : (
        <Suspense
          fallback={
            <Stack alignItems="center" py={4}>
              <CircularProgress aria-label="Loading signup form" />
            </Stack>
          }
        >
          <CompleteSignupForm />
        </Suspense>
      )}
    </AuthPageCard>
  );
}
