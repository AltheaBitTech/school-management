'use client';

import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useState } from 'react';
import { RegisterOrganizationForm } from '@/components/RegisterOrganizationForm';
import { AuthMarketingLayout } from '@/components/layout/AuthMarketingLayout';

function SuccessState() {
  return (
    <Stack spacing={3} sx={{ textAlign: 'center' }}>
      <CheckCircleOutlined sx={{ fontSize: 64, color: 'success.main', mx: 'auto' }} />
      <Stack spacing={1}>
        <Typography variant="h5" fontWeight={700}>
          Application Submitted
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Thank you for registering your school with CampusOps. We&apos;ve received your registration request.
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Our team will review your application and send you an email at the provided address with next steps.
          This usually takes 1–2 business days.
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ textAlign: 'left' }}>
        Check your inbox for a confirmation message with instructions to set up your school administrator account after
        approval.
      </Alert>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ pt: 1 }}>
        <Button component={Link} href="/" variant="outlined">
          Back to Home
        </Button>
        <Button component={Link} href="/login" variant="contained">
          Sign In
        </Button>
      </Stack>
    </Stack>
  );
}

export default function RegisterOrganizationPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSuccess = () => {
    setSubmitted(true);
  };

  return (
    <AuthMarketingLayout maxWidth={640}>
      {!submitted ? (
        <>
          <Typography variant="h4" component="h1" sx={{ mb: 0.75 }}>
            Register Your School
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
            Fill in the details below. Our team will review your application and contact you within 1–2 business days.
          </Typography>
          <RegisterOrganizationForm onSuccess={handleSuccess} />
        </>
      ) : (
        <SuccessState />
      )}
    </AuthMarketingLayout>
  );
}
