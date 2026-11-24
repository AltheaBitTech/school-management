'use client';

import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import { FormEvent, useEffect, useState } from 'react';
import { ForbiddenState } from '@/components/feedback/ForbiddenState';
import { useAppSnackbar } from '@/components/providers/AppSnackbarProvider';
import { FormPageFooter, FormSection } from '@/components/ui/FormSection';
import { FormPageShell } from '@/components/ui/FormPageShell';
import { ApiError, apiClient } from '@/lib/api/client';
import { validateEmail, validateOptionalPhone } from '@/lib/forms/validators';

interface SchoolProfile {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export default function SchoolProfilePage() {
  const { showSuccess } = useAppSnackbar();
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void apiClient
      .get<{ data: SchoolProfile }>('/organizations/current/profile', { auth: true })
      .then((response) => setProfile(response.data))
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403) setIsForbidden(true);
        else setErrorMessage(error instanceof Error ? error.message : 'Could not load the school profile');
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!profile) return;
    const emailProblem = profile.email.trim() ? validateEmail(profile.email) : undefined;
    const phoneProblem = validateOptionalPhone(profile.phone);
    if (emailProblem || phoneProblem) {
      setErrorMessage(emailProblem ?? phoneProblem ?? null);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.patch<{ data: SchoolProfile }>(
        '/organizations/current/profile',
        {
          address: profile.address,
          city: profile.city,
          phone: profile.phone,
          email: profile.email,
        },
        { auth: true },
      );
      setProfile(response.data);
      showSuccess('School profile saved. New documents and receipts will use it.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save the school profile');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isForbidden) return <ForbiddenState />;

  return (
    <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
      <FormPageShell
        title="School profile"
        description="Name stays as registered. Address, phone, and email appear on certificates, receipts, and notices."
        icon={AccountBalanceOutlined}
        footer={
          <FormPageFooter
            cancelHref="/"
            submitLabel="Save profile"
            submittingLabel="Saving…"
            isSubmitting={isSubmitting}
            submitDisabled={!profile}
          />
        }
      >
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {!profile ? <Skeleton variant="rounded" height={240} /> : null}
        {profile ? (
          <FormSection title="Contact details" description={`Shown for ${profile.name}.`} maxWidth="100%">
            <TextField label="Institution" value={profile.name} disabled fullWidth />
            <TextField
              label="Address"
              value={profile.address}
              onChange={(event) => setProfile({ ...profile, address: event.target.value })}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="City"
              value={profile.city}
              onChange={(event) => setProfile({ ...profile, city: event.target.value })}
              fullWidth
            />
            <TextField
              label="Phone"
              value={profile.phone}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={profile.email}
              onChange={(event) => setProfile({ ...profile, email: event.target.value })}
              fullWidth
            />
          </FormSection>
        ) : null}
      </FormPageShell>
    </Box>
  );
}
