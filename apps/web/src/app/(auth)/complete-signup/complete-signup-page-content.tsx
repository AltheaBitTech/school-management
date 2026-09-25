'use client';

import { Container, Card, CardContent, Typography, CircularProgress, Box } from '@mui/material';
import { CompleteSignupForm } from './complete-signup-form';

interface CompleteSignupPageContentProps {
  loading?: boolean;
}

export function CompleteSignupPageContent({ loading = false }: CompleteSignupPageContentProps) {
  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>Complete Your Sign-Up</Typography>
          <Typography sx={{ mb: 4, color: 'text.secondary' }}>
            Set your password to activate your school administrator account.
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress aria-label="Loading signup form" />
            </Box>
          ) : (
            <CompleteSignupForm />
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
