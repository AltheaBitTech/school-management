'use client';

import { Suspense } from 'react';
import { Container, Card, CardContent, Typography } from '@mui/material';
import { CompleteSignupForm } from './complete-signup-form';

export default function CompleteSignupPage() {
  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>Complete Your Sign-Up</Typography>
          <Typography sx={{ mb: 4, color: 'text.secondary' }}>Set your password to activate your account</Typography>

          <Suspense fallback={<Typography>Loading...</Typography>}>
            <CompleteSignupForm />
          </Suspense>
        </CardContent>
      </Card>
    </Container>
  );
}
